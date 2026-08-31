"""FastAPI production API."""

from pathlib import Path
import logging
import re
import tempfile

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from redis import Redis
from sqlalchemy import delete, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from .config import Settings
from .config import get_settings as get_runtime_settings
from .db import (
    Base,
    ChatEvidenceFeedback,
    ChatMessageVideo,
    ChatSearchRun,
    ChatThread,
    ChatThreadMessage,
    ChatThreadVideo,
    Clip,
    DeadLetterEntry,
    EvidenceFrame,
    Job,
    Organization,
    OrganizationSetting,
    SessionLocal,
    SavedSearch,
    Video,
    VideoChunk,
    VideoTranscriptSegment,
    VisualKeyframe,
    make_engine,
    new_id,
    utcnow,
)
from .embedder import get_embedder, reset_embedder
from .media import stream_object
from .llm import AnthropicChat, OllamaChat, OpenAICompatibleChat
from .modal_gemma import ModalGemmaChat
from .object_store import ObjectStore, profile_image_object_key, video_object_key
from .production_store import PostgresVideoStore
from .secrets import decrypt_secret, encrypt_secret
from .frame_extractor import extract_frame
from .chat_accuracy import route_chat_intent, suggested_refinements, verification_for_hit
from .chat_workflows import comparison_claims, extraction_rows
from .head_pose import is_face_orientation_query
from .visual_retrieval import rank_frame_candidates, sample_timestamps
from .schemas import (
    ChatMessage,
    ChatMessageAttachmentRequest,
    ChatMessageRequest,
    ChatMessageVideoResponse,
    ChatEvidenceFeedbackRequest,
    ChatSearchRunResponse,
    ChatExtractionRow,
    ChatComparisonClaim,
    SavedSearchRequest,
    SavedSearchResponse,
    SavedSearchUpdateRequest,
    ChatRequest,
    ChatOnboardingState,
    ChatResponse,
    ChatThreadSourceRequest,
    ChatThreadSourceResponse,
    ChatThreadUpdate,
    ChatThreadResponse,
    ClipRequest,
    ClipResponse,
    DeadLetterEntryResponse,
    EvidenceFrameRequest,
    EvidenceFrameResponse,
    JobResponse,
    LocalPathIngestRequest,
    LlmSettingsRequest,
    LlmSettingsResponse,
    SearchRequest,
    SearchResponse,
    UrlIngestRequest,
    VideoChunkResponse,
    VideoLibraryUpdateRequest,
    VideoResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceSettingsRequest,
    WorkspaceSettingsResponse,
)
from .worker import (
    extract_evidence_frame_task,
    ingest_local_path,
    ingest_uploaded_object,
    ingest_url,
    generate_chat_task,
    trim_clip_task,
)

app = FastAPI(title="Vivadeo", version="0.1.0")
logger = logging.getLogger(__name__)


def _visual_rerank_hits(
    query_embedding: list[float],
    chunk_hits: list[dict],
    embedder,
    results: int,
    question: str,
    verifier=None,
    session: Session | None = None,
    exhaustive: bool = False,
) -> list[dict]:
    """Rerank top chunk candidates and optionally verify frames with Pro vision."""
    candidates: list[dict] = []
    try:
        with tempfile.TemporaryDirectory(prefix="vivadeo_visual_search_") as tmp_dir:
            local_videos: dict[str, str] = {}
            store = ObjectStore()
            for hit in (chunk_hits if exhaustive else chunk_hits[:3]):
                video_id = hit.get("video_id")
                object_key = hit.get("object_key")
                if not video_id:
                    continue
                keyframes = []
                if session is not None:
                    keyframes = list(session.scalars(
                        select(VisualKeyframe).where(
                            VisualKeyframe.video_id == video_id,
                            VisualKeyframe.organization_id == hit.get("organization_id"),
                            VisualKeyframe.status == "ready",
                            VisualKeyframe.timestamp >= hit["start_time"],
                            VisualKeyframe.timestamp <= hit["end_time"],
                            VisualKeyframe.object_key.is_not(None),
                        ).order_by(VisualKeyframe.timestamp)
                    ).all())
                    if is_face_orientation_query(question):
                        front_keyframes = [frame for frame in keyframes if frame.pose == "front"]
                        if front_keyframes:
                            keyframes = front_keyframes
                if keyframes:
                    frame_items = [
                        (frame.timestamp, frame.object_key, frame.pose, frame.pose_confidence)
                        for frame in (keyframes if exhaustive else keyframes[:5])
                    ]
                elif object_key:
                    local_video = local_videos.get(video_id)
                    if local_video is None:
                        local_video = str(Path(tmp_dir) / f"{video_id}.mp4")
                        store.download_file(object_key, local_video)
                        local_videos[video_id] = local_video
                    frame_items = [
                        (timestamp, None, "unknown", 0.0)
                        for timestamp in sample_timestamps(hit["start_time"], hit["end_time"])
                    ]
                else:
                    continue
                for timestamp, cached_key, pose, pose_confidence in frame_items:
                    frame_path = str(Path(tmp_dir) / f"{video_id}-{timestamp:.3f}.jpg")
                    if cached_key:
                        store.download_file(cached_key, frame_path)
                    else:
                        extract_frame(local_video, timestamp, frame_path)
                    candidates.append({
                        "video_id": video_id,
                        "filename": hit.get("filename", "video"),
                        "source_uri": hit.get("source_uri", ""),
                        "timestamp": timestamp,
                        "chunk_start": hit["start_time"],
                        "pose": pose,
                        "pose_confidence": pose_confidence,
                        "path": frame_path,
                        "embedding": embedder.embed_image(frame_path),
                    })
            ranked = rank_frame_candidates(query_embedding, candidates)
            if verifier is not None and ranked:
                verification_candidates: list[dict] = []
                if exhaustive:
                    verification_candidates = ranked
                else:
                    seen_chunks: set[tuple[str, float]] = set()
                    for candidate in ranked:
                        chunk_key = (candidate["video_id"], candidate["chunk_start"])
                        if chunk_key in seen_chunks:
                            continue
                        seen_chunks.add(chunk_key)
                        verification_candidates.append(candidate)
                        if len(verification_candidates) >= 8:
                            break
                    for candidate in ranked:
                        if candidate in verification_candidates:
                            continue
                        verification_candidates.append(candidate)
                        if len(verification_candidates) >= 5:
                            break
                verified_keys: dict[tuple[str, float], dict] = {}
                for index, candidate in enumerate(verification_candidates, 1):
                    result = verifier.verify_visual_candidates(question, [candidate])
                    decision = result[0] if result else {}
                    confidence = float(decision.get("confidence", 0.0)) if isinstance(decision, dict) else 0.0
                    if isinstance(decision, dict) and decision.get("relevant") and confidence >= 0.55:
                        verified_keys[(candidate["video_id"], candidate["timestamp"])] = {
                            "verification_confidence": confidence,
                            "match_reason": str(decision.get("reason") or "Visible evidence supports the question"),
                        }
                ranked = [
                    {**candidate, "visual_verified": True, **verified_keys[(candidate["video_id"], candidate["timestamp"])]}
                    for candidate in ranked
                    if (candidate["video_id"], candidate["timestamp"]) in verified_keys
                ]
    except Exception:
        logger.exception("visual_frame_rerank_failed")
        return []

    selected: list[dict] = []
    for candidate in ranked:
        timestamp = candidate["timestamp"]
        start_time = max(0.0, timestamp - 2.0)
        end_time = timestamp + 2.0
        merged = False
        for item in selected:
            if item["video_id"] != candidate["video_id"]:
                continue
            if abs(((item["start_time"] + item["end_time"]) / 2) - timestamp) >= 4.0:
                continue
            item["start_time"] = min(item["start_time"], start_time)
            item["end_time"] = max(item["end_time"], end_time)
            item["similarity_score"] = max(item["similarity_score"], candidate["similarity_score"])
            merged = True
            break
        if merged:
            continue
        selected.append({
            "video_id": candidate["video_id"],
            "filename": candidate["filename"],
            "source_uri": candidate["source_uri"],
            "start_time": start_time,
            "end_time": end_time,
            "similarity_score": candidate["similarity_score"],
            "visual_verified": candidate.get("visual_verified", False),
            "retrieval_modality": "visual",
            "verification_confidence": candidate.get("verification_confidence"),
            "match_reason": candidate.get("match_reason"),
        })
        if not exhaustive and len(selected) >= results:
            break
    return selected or chunk_hits


@app.on_event("startup")
def _startup() -> None:
    engine = make_engine()
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO organizations (id, slug, name) "
                "VALUES (:id, :slug, :name) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": get_runtime_settings().default_org_id,
                "slug": "default",
                "name": "Default workspace",
            },
        )
    ObjectStore().ensure_bucket()


def settings_dep() -> Settings:
    return get_runtime_settings()


def require_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_internal_service_key: str | None = Header(
        default=None, alias="X-Internal-Service-Key"
    ),
    settings: Settings = Depends(settings_dep),
) -> None:
    if not settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )
    if (
        x_api_key == settings.api_key
        or x_internal_service_key == settings.internal_service_key
    ):
        return
    if x_api_key == settings.internal_service_key:
        return
    if x_internal_service_key == settings.api_key:
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
    )


def workspace_dep(
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
    settings: Settings = Depends(settings_dep),
) -> str:
    return x_workspace_id or settings.default_org_id


def _get_workspace(session: Session, organization_id: str) -> Organization:
    org = session.get(Organization, organization_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found"
        )
    return org


def db_dep():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _job_response(job: Job) -> JobResponse:
    return JobResponse(
        id=job.id,
        organization_id=job.organization_id,
        kind=job.kind,
        status=job.status,
        progress=job.progress,
        message=job.message,
        error=job.error,
        video_id=job.video_id,
        clip_id=job.clip_id,
        events=(getattr(job, "payload", None) or {}).get("progress_events", []),
        transcribe=bool((getattr(job, "payload", None) or {}).get("transcribe", True)),
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _library_metadata(session: Session, organization_id: str) -> dict[str, dict]:
    setting = session.get(OrganizationSetting, organization_id)
    settings = setting.settings if setting and isinstance(setting.settings, dict) else {}
    library = settings.get("video_library", {})
    return library if isinstance(library, dict) else {}


def _save_library_metadata(session: Session, organization_id: str, metadata: dict[str, dict]) -> None:
    setting = session.get(OrganizationSetting, organization_id)
    if setting is None:
        setting = OrganizationSetting(organization_id=organization_id, settings={})
        session.add(setting)
    settings = dict(setting.settings or {})
    settings["video_library"] = metadata
    setting.settings = settings
    session.commit()


def _video_response(
    video: Video,
    store: ObjectStore | None = None,
    library_metadata: dict | None = None,
) -> VideoResponse:
    url = store.presigned_url(video.object_key) if store and video.object_key else None
    metadata = library_metadata or {}
    return VideoResponse(
        id=video.id,
        organization_id=video.organization_id,
        source_type=video.source_type,
        source_uri=video.source_uri,
        filename=video.filename,
        status=video.status,
        duration=video.duration,
        object_key=video.object_key,
        url=url,
        error=video.error,
        collection=metadata.get("collection"),
        labels=metadata.get("labels", []),
        position=metadata.get("position", 0),
        created_at=video.created_at,
        updated_at=video.updated_at,
    )


def _video_chunk_response(chunk: VideoChunk) -> VideoChunkResponse:
    return VideoChunkResponse(
        id=chunk.id,
        organization_id=chunk.organization_id,
        video_id=chunk.video_id,
        start_time=chunk.start_time,
        end_time=chunk.end_time,
        embedding_backend=chunk.embedding_backend,
        embedding_model=chunk.embedding_model,
        metadata=chunk.chunk_metadata,
        created_at=chunk.created_at,
    )


def _clip_response(clip: Clip, store: ObjectStore | None = None) -> ClipResponse:
    url = store.presigned_url(clip.object_key) if store and clip.object_key else None
    return ClipResponse(
        id=clip.id,
        organization_id=clip.organization_id,
        video_id=clip.video_id,
        status=clip.status,
        start_time=clip.start_time,
        end_time=clip.end_time,
        object_key=clip.object_key,
        url=url,
        job_id=clip.job_id,
    )


def _evidence_frame_response(frame: EvidenceFrame, store: ObjectStore | None = None, job_id: str | None = None) -> EvidenceFrameResponse:
    return EvidenceFrameResponse(
        id=frame.id,
        video_id=frame.video_id,
        timestamp=frame.timestamp,
        status=frame.status,
        url=store.presigned_url(frame.object_key) if store and frame.object_key else None,
        job_id=job_id,
        error=frame.error,
    )


def _keyframe_response(frame: VisualKeyframe, store: ObjectStore | None = None) -> EvidenceFrameResponse:
    return EvidenceFrameResponse(
        id=frame.id,
        video_id=frame.video_id,
        timestamp=frame.timestamp,
        status=frame.status,
        url=store.presigned_url(frame.object_key) if store and frame.object_key else None,
        error=frame.error,
    )


def _dead_letter_response(entry: DeadLetterEntry) -> DeadLetterEntryResponse:
    return DeadLetterEntryResponse(
        id=entry.id,
        organization_id=entry.organization_id,
        video_id=entry.video_id,
        chunk_id=entry.chunk_id,
        source_uri=entry.source_uri,
        start_time=entry.start_time,
        end_time=entry.end_time,
        error=entry.error,
        attempts=entry.attempts,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.get(
    "/v1/workspaces",
    response_model=list[WorkspaceResponse],
    dependencies=[Depends(require_api_key)],
)
def list_workspaces(session: Session = Depends(db_dep)) -> list[WorkspaceResponse]:
    orgs = session.scalars(
        select(Organization).order_by(Organization.created_at.desc())
    ).all()
    return [
        WorkspaceResponse(id=org.id, slug=org.slug, name=org.name, plan=org.plan)
        for org in orgs
    ]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "workspace"


def _unique_workspace_slug(session: Session, base_slug: str) -> str:
    slug = base_slug
    suffix = 2
    while session.scalars(select(Organization.id).where(Organization.slug == slug)).first():
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


@app.post(
    "/v1/workspaces",
    response_model=WorkspaceResponse,
    dependencies=[Depends(require_api_key)],
)
def create_workspace(
    request: WorkspaceCreateRequest, session: Session = Depends(db_dep)
) -> WorkspaceResponse:
    owner_part = ""
    if request.owner_email and not request.slug:
        owner_part = f"-{request.owner_email.split('@', 1)[0]}"
    base_slug = _slugify(request.slug or f"{request.name}{owner_part}")
    slug = _unique_workspace_slug(session, base_slug)
    org = Organization(id=new_id(), slug=slug, name=request.name)
    session.add(org)
    session.commit()
    return WorkspaceResponse(id=org.id, slug=org.slug, name=org.name, plan=org.plan)


@app.post(
    "/v1/workspaces/{organization_id}/bootstrap-auth",
    dependencies=[Depends(require_api_key)],
)
def bootstrap_workspace_auth(
    organization_id: str,
    request: dict,
    session: Session = Depends(db_dep),
):
    email = str(request.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    org = _get_workspace(session, organization_id)
    user_id = session.execute(
        text('SELECT id FROM "user" WHERE lower(email) = :email'),
        {"email": email},
    ).scalar_one_or_none()
    if user_id is None:
        raise HTTPException(status_code=404, detail="Better Auth user not found")

    session.execute(
        text(
            "INSERT INTO organization (id, slug, name) "
            "VALUES (:id, :slug, :name) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug"
        ),
        {"id": org.id, "slug": org.slug, "name": org.name},
    )
    session.execute(
        text(
            "INSERT INTO member (id, organization_id, user_id, role) "
            "SELECT :member_id, :organization_id, :user_id, 'owner' "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM member "
            "  WHERE organization_id = :organization_id AND user_id = :user_id"
            ")"
        ),
        {"member_id": new_id(), "organization_id": org.id, "user_id": user_id},
    )
    session.commit()
    return {"organization_id": org.id, "email": email, "user_id": user_id}


@app.get(
    "/v1/settings",
    response_model=WorkspaceSettingsResponse,
    dependencies=[Depends(require_api_key)],
)
def get_workspace_settings(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
) -> WorkspaceSettingsResponse:
    _get_workspace(session, organization_id)
    settings = session.get(OrganizationSetting, organization_id)
    return WorkspaceSettingsResponse(
        organization_id=organization_id,
        settings=(settings.settings if settings else {}),
    )


@app.put(
    "/v1/settings",
    response_model=WorkspaceSettingsResponse,
    dependencies=[Depends(require_api_key)],
)
def update_settings(
    request: WorkspaceSettingsRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
) -> WorkspaceSettingsResponse:
    _get_workspace(session, organization_id)
    settings = session.get(OrganizationSetting, organization_id)
    if settings is None:
        settings = OrganizationSetting(
            organization_id=organization_id, settings=request.settings
        )
        session.add(settings)
    else:
        settings.settings = request.settings
    session.commit()
    return WorkspaceSettingsResponse(
        organization_id=organization_id, settings=settings.settings
    )


def _get_chat_thread(session: Session, thread_id: str | None, organization_id: str) -> ChatThread | None:
    if not thread_id:
        return None
    thread = session.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.organization_id == organization_id))
    if thread is None:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    return thread


def _attach_thread_sources(session: Session, thread: ChatThread, video_ids: list[str], organization_id: str) -> None:
    unique_ids = list(dict.fromkeys(video_ids))
    videos = session.scalars(select(Video).where(Video.organization_id == organization_id, Video.id.in_(unique_ids))).all()
    found = {video.id: video for video in videos}
    missing = [video_id for video_id in unique_ids if video_id not in found]
    if missing:
        raise HTTPException(status_code=404, detail="One or more videos not found")
    attached = {source.video_id for source in thread.sources}
    for video_id in unique_ids:
        if video_id not in attached:
            thread.sources.append(ChatThreadVideo(thread_id=thread.id, video_id=video_id, organization_id=organization_id))


def _attach_message_videos(session: Session, message: ChatThreadMessage, video_ids: list[str], organization_id: str) -> None:
    unique_ids = list(dict.fromkeys(video_ids))
    if not unique_ids:
        return
    videos = session.scalars(select(Video).where(Video.organization_id == organization_id, Video.id.in_(unique_ids))).all()
    found = {video.id: video for video in videos}
    if len(found) != len(unique_ids):
        raise HTTPException(status_code=404, detail="One or more videos not found")
    attached = {attachment.video_id for attachment in message.attachments}
    for video_id in unique_ids:
        if video_id not in attached:
            message.attachments.append(
                ChatMessageVideo(
                    id=new_id(),
                    message_id=message.id,
                    video_id=video_id,
                    organization_id=organization_id,
                )
            )


@app.get(
    "/v1/settings/llm",
    response_model=LlmSettingsResponse,
    dependencies=[Depends(require_api_key)],
)
def get_llm_settings(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    settings = session.get(OrganizationSetting, organization_id)
    llm = settings.settings.get("llm", {}) if settings and isinstance(settings.settings, dict) else {}
    return LlmSettingsResponse(
        organization_id=organization_id,
        provider=llm.get("provider", "vivadeo-auto"),
        base_url=llm.get("base_url", ""),
        model=llm.get("model", ""),
        api_key_configured=bool(decrypt_secret(llm.get("api_key"))),
    )


@app.put(
    "/v1/settings/llm",
    response_model=LlmSettingsResponse,
    dependencies=[Depends(require_api_key)],
)
def update_llm_settings(
    request: LlmSettingsRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    if request.provider not in {"vivadeo-auto", "custom", "ollama", "openai", "anthropic", "gemini", "nvidia"}:
        raise HTTPException(status_code=400, detail="Unsupported chat provider")
    if request.provider != "vivadeo-auto" and (not request.base_url or not request.model):
        raise HTTPException(status_code=400, detail="Endpoint and model are required")
    settings = session.get(OrganizationSetting, organization_id)
    if settings is None:
        settings = OrganizationSetting(organization_id=organization_id, settings={})
        session.add(settings)
    payload = dict(settings.settings or {})
    llm = {
        "provider": request.provider,
        "base_url": request.base_url,
        "model": request.model,
    }
    if request.api_key == "":
        llm["api_key"] = None
    elif request.api_key:
        llm["api_key"] = encrypt_secret(request.api_key)
    elif isinstance(payload.get("llm"), dict):
        llm["api_key"] = payload["llm"].get("api_key")
    payload["llm"] = llm
    settings.settings = payload
    session.commit()
    return LlmSettingsResponse(
        organization_id=organization_id,
        provider=request.provider,
        base_url=request.base_url,
        model=request.model,
        api_key_configured=bool(decrypt_secret(llm.get("api_key"))),
    )


@app.post(
    "/v1/videos/upload",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
async def upload_video(
    file: UploadFile = File(...),
    transcribe: bool = Form(True),
    thread_id: str | None = Form(None),
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    thread = _get_chat_thread(session, thread_id, organization_id)
    video_id = new_id()
    job_id = new_id()
    filename = Path(file.filename or f"{video_id}.mp4").name
    object_key = video_object_key(video_id, filename)

    # Stream the upload directly into object storage — no temp file needed.
    ObjectStore().upload_fileobj(
        file.file,
        object_key,
        content_type=file.content_type,
        filename=filename,
    )

    video = Video(
        id=video_id,
        organization_id=organization_id,
        source_type="upload",
        source_uri=filename,
        object_key=object_key,
        filename=filename,
        content_type=file.content_type,
        status="queued",
    )
    session.add(video)
    session.flush()
    if thread is not None:
        thread.sources.append(ChatThreadVideo(thread_id=thread.id, video_id=video_id, organization_id=organization_id))
    job = Job(
        id=job_id,
        organization_id=organization_id,
        kind="ingest_uploaded_object",
        status="queued",
        video_id=video_id,
        payload={"transcribe": transcribe},
    )
    session.add(job)
    session.commit()
    ingest_uploaded_object.delay(job_id, video_id, organization_id)
    return _job_response(job)


@app.post(
    "/v1/videos/url",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def ingest_video_url(
    request: UrlIngestRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    thread = _get_chat_thread(session, request.thread_id, organization_id) if request.thread_id else None
    video_id = new_id()
    job_id = new_id()
    video = Video(
        id=video_id,
        organization_id=organization_id,
        source_type="url",
        source_uri=request.url,
        filename=Path(request.url).name or "download.mp4",
        status="queued",
    )
    session.add(video)
    session.flush()
    if thread is not None:
        thread.sources.append(ChatThreadVideo(thread_id=thread.id, video_id=video_id, organization_id=organization_id))
    job = Job(
        id=job_id,
        organization_id=organization_id,
        kind="ingest_url",
        status="queued",
        video_id=video_id,
        payload={"url": request.url, "max_height": request.max_height, "transcribe": request.transcribe},
    )
    session.add(job)
    session.commit()
    ingest_url.delay(job_id, video_id, organization_id, request.url, request.max_height)
    return _job_response(job)


@app.post(
    "/v1/videos/local-path",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def ingest_local_video(
    request: LocalPathIngestRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    path = Path(request.path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Local video path not found")
    video_id = new_id()
    job_id = new_id()
    video = Video(
        id=video_id,
        organization_id=organization_id,
        source_type="local_path",
        source_uri=str(path),
        filename=path.name,
        status="queued",
    )
    session.add(video)
    session.flush()
    job = Job(
        id=job_id,
        organization_id=organization_id,
        kind="ingest_local_path",
        status="queued",
        video_id=video_id,
        payload={"transcribe": request.transcribe},
    )
    session.add(job)
    session.commit()
    ingest_local_path.delay(job_id, video_id, organization_id, str(path))
    return _job_response(job)


@app.get(
    "/v1/videos",
    response_model=list[VideoResponse],
    dependencies=[Depends(require_api_key)],
)
def list_videos(
    session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)
):
    store = ObjectStore()
    library = _library_metadata(session, organization_id)
    videos = session.scalars(
        select(Video)
        .where(Video.organization_id == organization_id)
        .order_by(Video.created_at.desc())
    ).all()
    videos.sort(key=lambda video: (library.get(video.id, {}).get("position", 0), -video.created_at.timestamp()))
    return [_video_response(video, store, library.get(video.id)) for video in videos]


@app.get(
    "/v1/videos/{video_id}",
    response_model=VideoResponse,
    dependencies=[Depends(require_api_key)],
)
def get_video(
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    return _video_response(video, ObjectStore(), _library_metadata(session, organization_id).get(video.id))


@app.post(
    "/v1/videos/{video_id}/frames",
    response_model=EvidenceFrameResponse,
    dependencies=[Depends(require_api_key)],
)
def request_evidence_frame(
    video_id: str,
    request: EvidenceFrameRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.object_key:
        raise HTTPException(status_code=400, detail="Video playback object is unavailable")
    timestamp = request.timestamp
    if video.duration is not None:
        timestamp = min(timestamp, max(0.0, video.duration))
    timestamp_key = f"{timestamp:.3f}"
    cached_keyframes = session.scalars(
        select(VisualKeyframe).where(
            VisualKeyframe.video_id == video_id,
            VisualKeyframe.organization_id == organization_id,
            VisualKeyframe.status == "ready",
            VisualKeyframe.object_key.is_not(None),
            VisualKeyframe.timestamp >= max(0.0, timestamp - 2.5),
            VisualKeyframe.timestamp <= timestamp + 2.5,
        ).order_by(VisualKeyframe.timestamp)
    ).all()
    if cached_keyframes:
        keyframe = min(cached_keyframes, key=lambda item: abs(item.timestamp - timestamp))
        return _keyframe_response(keyframe, ObjectStore())
    frame = session.scalar(select(EvidenceFrame).where(EvidenceFrame.video_id == video_id, EvidenceFrame.organization_id == organization_id, EvidenceFrame.timestamp_key == timestamp_key))
    if frame is not None and frame.status == "ready":
        return _evidence_frame_response(frame, ObjectStore())

    job_id = None
    if frame is not None and frame.status == "queued":
        jobs = session.scalars(select(Job).where(Job.organization_id == organization_id, Job.kind == "extract_evidence_frame", Job.video_id == video_id).order_by(Job.created_at.desc()).limit(10)).all()
        job_id = next((job.id for job in jobs if (job.payload or {}).get("frame_id") == frame.id and job.status not in {"failed", "canceled", "succeeded"}), None)
        if job_id:
            return _evidence_frame_response(frame, job_id=job_id)

    if frame is None:
        frame = EvidenceFrame(
            id=new_id(),
            organization_id=organization_id,
            video_id=video_id,
            timestamp=timestamp,
            timestamp_key=timestamp_key,
            status="queued",
        )
        session.add(frame)
    else:
        frame.timestamp = timestamp
        frame.status = "queued"
        frame.error = None
        frame.object_key = None
    job = Job(
        id=new_id(),
        organization_id=organization_id,
        kind="extract_evidence_frame",
        status="queued",
        video_id=video_id,
        payload={"frame_id": frame.id, "timestamp": timestamp},
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(job)
    session.commit()
    extract_evidence_frame_task.delay(job.id, frame.id, organization_id)
    return _evidence_frame_response(frame, job_id=job.id)


@app.get(
    "/v1/videos/{video_id}/frames/{frame_id}",
    response_model=EvidenceFrameResponse,
    dependencies=[Depends(require_api_key)],
)
def get_evidence_frame(
    video_id: str,
    frame_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    frame = session.scalar(select(EvidenceFrame).where(EvidenceFrame.id == frame_id, EvidenceFrame.video_id == video_id, EvidenceFrame.organization_id == organization_id))
    if frame is None:
        raise HTTPException(status_code=404, detail="Evidence frame not found")
    return _evidence_frame_response(frame, ObjectStore())


@app.patch(
    "/v1/videos/{video_id}/library",
    response_model=VideoResponse,
    dependencies=[Depends(require_api_key)],
)
def update_video_library(
    video_id: str,
    request: VideoLibraryUpdateRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    if request.filename is not None:
        filename = request.filename.strip()
        if not filename:
            raise HTTPException(status_code=400, detail="Filename cannot be empty")
        video.filename = filename
    library = _library_metadata(session, organization_id)
    current = library.get(video_id, {})
    library[video_id] = {
        "collection": request.collection.strip() if request.collection is not None else current.get("collection"),
        "labels": sorted({label.strip() for label in request.labels if label.strip()}) if request.labels is not None else current.get("labels", []),
        "position": max(0, request.position) if request.position is not None else current.get("position", 0),
    }
    _save_library_metadata(session, organization_id, library)
    return _video_response(video, ObjectStore(), library[video_id])


@app.get(
    "/v1/videos/{video_id}/chunks",
    response_model=list[VideoChunkResponse],
    dependencies=[Depends(require_api_key)],
)
def list_video_chunks(
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    chunks = session.scalars(
        select(VideoChunk)
        .where(
            VideoChunk.organization_id == organization_id,
            VideoChunk.video_id == video_id,
        )
        .order_by(VideoChunk.start_time.asc())
    ).all()
    return [_video_chunk_response(chunk) for chunk in chunks]


@app.post(
    "/v1/videos/{video_id}/archive",
    response_model=VideoResponse,
    dependencies=[Depends(require_api_key)],
)
def archive_video(
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    video.status = "archived"
    session.commit()
    return _video_response(video, ObjectStore(), _library_metadata(session, organization_id).get(video.id))


@app.post(
    "/v1/videos/{video_id}/reindex",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def reindex_video(
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")

    session.execute(delete(VideoChunk).where(VideoChunk.video_id == video_id))
    latest_job = None
    if hasattr(session, "scalars"):
        latest_job = session.scalars(
            select(Job).where(Job.video_id == video_id).order_by(Job.created_at.desc()).limit(1)
        ).first()
    transcribe = bool((latest_job.payload or {}).get("transcribe", True)) if latest_job else True
    job = Job(
        id=new_id(),
        organization_id=organization_id,
        kind=f"reindex_{video.source_type}",
        status="queued",
        video_id=video_id,
        progress=0.0,
        message="Reindex queued",
        payload={"transcribe": transcribe},
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    video.status = "queued"
    video.error = None
    session.add(job)
    session.commit()

    if video.source_type == "upload":
        if not video.object_key:
          raise HTTPException(status_code=400, detail="Uploaded source object missing")
        ingest_uploaded_object.delay(job.id, video.id, organization_id)
    elif video.source_type == "url":
        ingest_url.delay(job.id, video.id, organization_id, video.source_uri, 480)
    elif video.source_type == "local_path":
        ingest_local_path.delay(job.id, video.id, organization_id, video.source_uri)
    else:
        raise HTTPException(status_code=400, detail=f"Reindex not supported for {video.source_type}")
    return _job_response(job)


@app.delete(
    "/v1/videos/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_api_key)],
)
def delete_video(
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")

    store = ObjectStore()
    clip_keys = session.scalars(
        select(Clip.object_key).where(
            Clip.organization_id == organization_id,
            Clip.video_id == video_id,
            Clip.object_key.is_not(None),
        )
    ).all()
    for key in clip_keys:
        try:
            store.delete_object(key)
        except Exception:
            continue
    if video.object_key:
        try:
            store.delete_object(video.object_key)
        except Exception:
            pass

    frame_keys = session.scalars(
        select(EvidenceFrame.object_key).where(
            EvidenceFrame.organization_id == organization_id,
            EvidenceFrame.video_id == video_id,
            EvidenceFrame.object_key.is_not(None),
        )
    ).all()
    for key in frame_keys:
        try:
            store.delete_object(key)
        except Exception:
            continue
    session.execute(delete(EvidenceFrame).where(EvidenceFrame.video_id == video_id, EvidenceFrame.organization_id == organization_id))
    keyframe_keys = session.scalars(
        select(VisualKeyframe.object_key).where(
            VisualKeyframe.organization_id == organization_id,
            VisualKeyframe.video_id == video_id,
            VisualKeyframe.object_key.is_not(None),
        )
    ).all()
    for key in keyframe_keys:
        try:
            store.delete_object(key)
        except Exception:
            continue
    session.execute(delete(VisualKeyframe).where(VisualKeyframe.video_id == video_id, VisualKeyframe.organization_id == organization_id))

    clip_ids = session.scalars(
        select(Clip.id).where(
            Clip.organization_id == organization_id,
            Clip.video_id == video_id,
        )
    ).all()
    if clip_ids:
        session.execute(delete(Job).where(Job.clip_id.in_(clip_ids)))
    session.execute(delete(Clip).where(Clip.video_id == video_id, Clip.organization_id == organization_id))
    session.execute(delete(VideoTranscriptSegment).where(VideoTranscriptSegment.video_id == video_id, VideoTranscriptSegment.organization_id == organization_id))
    session.execute(delete(VideoChunk).where(VideoChunk.video_id == video_id, VideoChunk.organization_id == organization_id))
    session.execute(delete(Job).where(Job.video_id == video_id, Job.organization_id == organization_id))
    session.delete(video)
    session.commit()


@app.post("/v1/profile/avatar", dependencies=[Depends(require_api_key)])
def upload_profile_avatar(
    file: UploadFile = File(...),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    session: Session = Depends(db_dep),
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User identity is required")
    content_type = (file.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise HTTPException(status_code=415, detail="Use a JPG, PNG, WEBP, or GIF image")
    file.file.seek(0, 2)
    if file.file.tell() > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Profile images must be 5 MB or smaller")
    file.file.seek(0)

    old_image = session.execute(text('SELECT image FROM "user" WHERE id = :user_id'), {"user_id": x_user_id}).scalar_one_or_none()
    if old_image is None and session.execute(text('SELECT 1 FROM "user" WHERE id = :user_id'), {"user_id": x_user_id}).first() is None:
        raise HTTPException(status_code=404, detail="User not found")
    object_key = profile_image_object_key(x_user_id, file.filename or "profile.jpg")
    store = ObjectStore()
    store.upload_fileobj(file.file, object_key, content_type=content_type, filename=file.filename)
    image_url = store.presigned_url(object_key)
    updated = session.execute(
        text('UPDATE "user" SET image = :image, updated_at = NOW() WHERE id = :user_id'),
        {"image": image_url, "user_id": x_user_id},
    )
    if updated.rowcount != 1:
        store.delete_object(object_key)
        raise HTTPException(status_code=404, detail="User not found")
    session.commit()
    if old_image and "profile-images/" in old_image:
        try:
            store.delete_object("profile-images/" + old_image.split("profile-images/", 1)[1])
        except Exception:
            pass
    return {"image": image_url, "object_key": object_key}


@app.get("/v1/profile/avatar", dependencies=[Depends(require_api_key)])
def get_profile_avatar(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    session: Session = Depends(db_dep),
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User identity is required")
    image = session.execute(text('SELECT image FROM "user" WHERE id = :user_id'), {"user_id": x_user_id}).scalar_one_or_none()
    if not image or "profile-images/" not in image:
        raise HTTPException(status_code=404, detail="Profile image not found")
    object_key = "profile-images/" + image.split("profile-images/", 1)[1]
    session.close()
    return stream_object(object_key)


@app.delete("/v1/profile/avatar", status_code=204, dependencies=[Depends(require_api_key)])
def delete_profile_avatar(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    session: Session = Depends(db_dep),
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User identity is required")
    old_image = session.execute(text('SELECT image FROM "user" WHERE id = :user_id'), {"user_id": x_user_id}).scalar_one_or_none()
    if old_image is None and session.execute(text('SELECT 1 FROM "user" WHERE id = :user_id'), {"user_id": x_user_id}).first() is None:
        raise HTTPException(status_code=404, detail="User not found")
    session.execute(text('UPDATE "user" SET image = NULL, updated_at = NOW() WHERE id = :user_id'), {"user_id": x_user_id})
    session.commit()
    if old_image and "profile-images/" in old_image:
        try:
            ObjectStore().delete_object("profile-images/" + old_image.split("profile-images/", 1)[1])
        except Exception:
            pass


@app.get("/v1/media/{object_key:path}", dependencies=[Depends(require_api_key)])
def get_media(
    object_key: str,
    range_header: str | None = Header(default=None, alias="Range"),
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
) -> StreamingResponse:
    video = session.scalars(
        select(Video).where(
            Video.organization_id == organization_id, Video.object_key == object_key
        )
    ).first()
    clip = session.scalars(
        select(Clip).where(
            Clip.organization_id == organization_id, Clip.object_key == object_key
        )
    ).first()
    frame = session.scalars(
        select(EvidenceFrame).where(
            EvidenceFrame.organization_id == organization_id,
            EvidenceFrame.object_key == object_key,
        )
    ).first()
    keyframe = session.scalars(
        select(VisualKeyframe).where(
            VisualKeyframe.organization_id == organization_id,
            VisualKeyframe.object_key == object_key,
        )
    ).first()
    if video is None and clip is None and frame is None and keyframe is None:
        raise HTTPException(status_code=404, detail="Media not found")
    content_type = video.content_type if video else "image/jpeg" if frame or keyframe else "video/mp4"
    session.close()
    return stream_object(object_key, content_type=content_type, range_header=range_header)


@app.get(
    "/v1/jobs",
    response_model=list[JobResponse],
    dependencies=[Depends(require_api_key)],
)
def list_jobs(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    jobs = session.scalars(
        select(Job)
        .where(Job.organization_id == organization_id)
        .order_by(Job.created_at.desc())
        .limit(50)
    ).all()
    return [_job_response(job) for job in jobs]


@app.get(
    "/v1/jobs/dead-letter",
    response_model=list[DeadLetterEntryResponse],
    dependencies=[Depends(require_api_key)],
)
def list_dead_letter_entries(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    entries = session.scalars(
        select(DeadLetterEntry)
        .where(DeadLetterEntry.organization_id == organization_id)
        .order_by(DeadLetterEntry.updated_at.desc())
        .limit(50)
    ).all()
    return [_dead_letter_response(entry) for entry in entries]


@app.get(
    "/v1/jobs/{job_id}",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def get_job(
    job_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    job = session.get(Job, job_id)
    if not job or job.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_response(job)


@app.get(
    "/v1/jobs/{job_id}/events",
    dependencies=[Depends(require_api_key)],
)
def stream_job_events(
    job_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    job = session.get(Job, job_id)
    if not job or job.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    initial_event = _job_response(job).model_dump_json()
    initial_status = job.status
    session.close()

    def event_stream():
        client = Redis.from_url(get_runtime_settings().redis_url, decode_responses=True)
        pubsub = client.pubsub()
        pubsub.subscribe(f"vivadeo:job:{job_id}")
        try:
            yield f"event: job\ndata: {initial_event}\n\n"
            if initial_status in {"succeeded", "failed", "canceled"}:
                return
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=15)
                if message and message.get("data"):
                    payload = message["data"]
                    yield f"event: job\ndata: {payload}\n\n"
                    if '"status":"succeeded"' in payload or '"status":"failed"' in payload or '"status":"canceled"' in payload:
                        return
                else:
                    yield ": keepalive\n\n"
        finally:
            pubsub.close()
            client.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "Connection": "keep-alive"})


@app.post(
    "/v1/jobs/{job_id}/cancel",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def cancel_job(
    job_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    job = session.get(Job, job_id)
    if not job or job.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in {"queued", "running"}:
        raise HTTPException(status_code=400, detail="Only queued or running jobs can be canceled")

    job.status = "canceled"
    job.message = "Canceled by user"
    job.error = None
    if job.video_id:
        video = session.get(Video, job.video_id)
        if video and video.organization_id == organization_id and video.status in {"queued", "indexing", "running"}:
            video.status = "canceled"
            video.error = "Canceled by user"
    if job.clip_id:
        clip = session.get(Clip, job.clip_id)
        if clip and clip.organization_id == organization_id and clip.status in {"queued", "running"}:
            clip.status = "canceled"
            clip.error = "Canceled by user"
    if job.kind == "extract_evidence_frame":
        frame = session.get(EvidenceFrame, (job.payload or {}).get("frame_id"))
        if frame and frame.organization_id == organization_id and frame.status == "queued":
            frame.status = "canceled"
            frame.error = "Canceled by user"
    if job.kind == "chat_generation":
        message = session.get(ChatThreadMessage, (job.payload or {}).get("message_id"))
        if message:
            message.status = "canceled"
            message.error = "Canceled by user"
            message.updated_at = utcnow()
    session.commit()
    return _job_response(job)


@app.post(
    "/v1/jobs/{job_id}/retry",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def retry_job(
    job_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    job = session.get(Job, job_id)
    if not job or job.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in {"failed", "canceled"}:
        raise HTTPException(status_code=400, detail="Only failed or canceled jobs can be retried")

    video = session.get(Video, job.video_id) if job.video_id else None
    clip = session.get(Clip, job.clip_id) if job.clip_id else None
    if job.kind == "ingest_uploaded_object":
        if video is None:
            raise HTTPException(status_code=404, detail="Video not found for job")
        job.status = "queued"
        job.progress = 0.0
        job.message = "Retry queued"
        job.error = None
        session.commit()
        ingest_uploaded_object.delay(job.id, video.id, organization_id)
        return _job_response(job)
    if job.kind == "ingest_url":
        if video is None:
            raise HTTPException(status_code=404, detail="Video not found for job")
        url = str(job.payload.get("url") or video.source_uri)
        max_height = int(job.payload.get("max_height") or 480)
        job.status = "queued"
        job.progress = 0.0
        job.message = "Retry queued"
        job.error = None
        session.commit()
        ingest_url.delay(job.id, video.id, organization_id, url, max_height)
        return _job_response(job)
    if job.kind == "ingest_local_path":
        if video is None:
            raise HTTPException(status_code=404, detail="Video not found for job")
        job.status = "queued"
        job.progress = 0.0
        job.message = "Retry queued"
        job.error = None
        session.commit()
        ingest_local_path.delay(job.id, video.id, organization_id, video.source_uri)
        return _job_response(job)
    if job.kind == "extract_evidence_frame":
        frame_id = (job.payload or {}).get("frame_id")
        frame = session.get(EvidenceFrame, frame_id) if frame_id else None
        if frame is None:
            raise HTTPException(status_code=404, detail="Evidence frame not found for job")
        frame.status = "queued"
        frame.error = None
        frame.object_key = None
        job.status = "queued"
        job.progress = 0.0
        job.message = "Retry queued"
        job.error = None
        session.commit()
        extract_evidence_frame_task.delay(job.id, frame.id, organization_id)
        return _job_response(job)
    if job.kind == "trim_clip":
        if clip is None:
            raise HTTPException(status_code=404, detail="Clip not found for job")
        job.status = "queued"
        job.progress = 0.0
        job.message = "Retry queued"
        job.error = None
        session.commit()
        trim_clip_task.delay(job.id, clip.id, organization_id)
        return _job_response(job)

    raise HTTPException(status_code=400, detail=f"Retry not supported for {job.kind}")


@app.post(
    "/v1/search", response_model=SearchResponse, dependencies=[Depends(require_api_key)]
)
def search(
    request: SearchRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    try:
        embedding = get_embedder().embed_query(request.query)
        results = PostgresVideoStore(session).search(
            embedding,
            n_results=request.results,
            organization_id=organization_id,
            video_id=request.video_id,
            **({"video_ids": request.video_ids} if request.video_ids else {}),
        )
    finally:
        reset_embedder()
    if request.threshold is not None:
        results = [r for r in results if r["similarity_score"] >= request.threshold]
    return SearchResponse(results=results)


def _create_search_run(session: Session, *, organization_id: str, thread_id: str | None, message_id: str | None, question: str, intent: dict, scope_video_ids: list[str], request: ChatRequest) -> ChatSearchRun | None:
    if not hasattr(session, "add"):
        return None
    run = ChatSearchRun(
        id=new_id(),
        organization_id=organization_id,
        thread_id=thread_id,
        message_id=message_id,
        parent_run_id=request.parent_search_run_id,
        query=question,
        modality=intent["modality"],
        search_mode=intent["search_mode"],
        scope_video_ids=scope_video_ids,
        focus_video_id=request.focus_video_id,
        focus_start_time=request.focus_start_time,
        focus_end_time=request.focus_end_time,
        status="running",
        stage="routing",
        progress=0.0,
        output_format=request.output_format,
        search_complete=False,
    )
    session.add(run)
    session.flush()
    return run


def _finish_search_run(run: ChatSearchRun | None, *, status: str, summary: dict) -> None:
    if run is None:
        return
    run.status = status
    run.stage = "complete" if status == "completed" else status
    run.progress = 1.0 if status == "completed" else run.progress
    run.search_complete = status == "completed"
    run.verification_summary = summary


def _set_search_stage(run: ChatSearchRun | None, stage: str, progress: float) -> None:
    if run is None:
        return
    run.stage = stage
    run.progress = min(1.0, max(run.progress, progress))
    run.updated_at = utcnow()


def _report_search_stage(session: Session, run: ChatSearchRun | None, callback, stage: str, progress: float, message: str) -> None:
    _set_search_stage(run, stage, progress)
    if run is not None:
        session.commit()
    if callback:
        callback(progress, message)


def _current_chat_message(thread: ChatThread) -> ChatThreadMessage | None:
    if thread.current_message_id:
        return next((message for message in thread.messages if message.id == thread.current_message_id), None)
    return thread.messages[-1] if thread.messages else None


def _chat_message_path(thread: ChatThread, message_id: str | None) -> list[ChatThreadMessage]:
    messages = {message.id: message for message in thread.messages}
    path: list[ChatThreadMessage] = []
    seen: set[str] = set()
    current_id = message_id
    while current_id and current_id not in seen:
        seen.add(current_id)
        message = messages.get(current_id)
        if message is None:
            break
        path.append(message)
        current_id = message.parent_id
    path.reverse()
    return path


def _append_chat_message(
    thread: ChatThread,
    *,
    session: Session | None = None,
    role: str,
    content: str,
    parent_id: str | None = None,
    status: str = "completed",
    error: str | None = None,
    citations: list | None = None,
) -> ChatThreadMessage:
    message = ChatThreadMessage(
        id=new_id(),
        thread_id=thread.id,
        parent_id=parent_id,
        role=role,
        content=content,
        citations=citations or [],
        status=status,
        error=error,
    )
    thread.messages.append(message)
    if session is not None:
        # Flush the new row before updating the thread's foreign-key pointer.
        session.flush()
    thread.current_message_id = message.id
    thread.updated_at = utcnow()
    return message


def _complete_chat_message(
    *,
    session: Session,
    organization_id: str,
    thread_id: str,
    message_id: str,
    request: ChatMessageRequest,
    progress_callback=None,
) -> ChatThread:
    thread = _get_chat_thread(session, thread_id, organization_id)
    assistant = session.scalar(
        select(ChatThreadMessage).where(
            ChatThreadMessage.id == message_id,
            ChatThreadMessage.thread_id == thread.id,
        )
    )
    if assistant is None or assistant.role != "assistant":
        raise HTTPException(status_code=404, detail="Pending chat message not found")
    if not assistant.parent_id:
        raise HTTPException(status_code=409, detail="Pending chat message has no user prompt")
    parent = next((item for item in thread.messages if item.id == assistant.parent_id), None)
    if parent is None or parent.role != "user":
        raise HTTPException(status_code=409, detail="Chat message history is incomplete")

    history = _chat_message_path(thread, parent.id)
    source_ids = [
        source.video_id
        for source in thread.sources
        if source.video is not None and source.video.status not in {"archived", "failed", "canceled"}
    ]
    stored_llm = session.get(OrganizationSetting, organization_id)
    stored_config = stored_llm.settings.get("llm", {}) if stored_llm and isinstance(stored_llm.settings, dict) else {}
    if request.provider != "vivadeo-auto" and isinstance(stored_config, dict):
        request = request.model_copy(update={
            "custom_base_url": request.custom_base_url or stored_config.get("base_url"),
            "custom_model": request.custom_model or stored_config.get("model"),
            "custom_api_key": request.custom_api_key or decrypt_secret(stored_config.get("api_key")),
        })
    try:
        answer = search_chat(
            ChatRequest(
                messages=[ChatMessage(role=item.role, content=item.content) for item in history],
                results=request.results,
                parent_search_run_id=request.parent_search_run_id,
                video_id=request.video_id if request.video_id in source_ids else None,
                video_ids=[video_id for video_id in [*request.video_ids, *request.comparison_video_ids] if video_id in source_ids] or source_ids,
                provider=request.provider,
                custom_base_url=request.custom_base_url,
                custom_api_key=request.custom_api_key,
                custom_model=request.custom_model,
                modality=request.modality,
                search_mode=request.search_mode,
                output_format=request.output_format,
                extraction_type=request.extraction_type,
                comparison_video_ids=request.comparison_video_ids,
                focus_video_id=request.focus_video_id,
                focus_start_time=request.focus_start_time,
                focus_end_time=request.focus_end_time,
                focus_window_seconds=request.focus_window_seconds,
            ),
            session=session,
            organization_id=organization_id,
            progress_callback=progress_callback,
        )
    except Exception:
        assistant.status = "failed"
        assistant.error = "Vivadeo could not prepare an answer."
        assistant.updated_at = utcnow()
        thread.current_message_id = assistant.id
        thread.updated_at = utcnow()
        session.commit()
        raise

    assistant.content = answer.answer
    assistant.citations = [citation.model_dump() for citation in answer.citations]
    assistant.generation_metadata = {
        "search_run_id": answer.search_run_id,
        "intent": answer.intent,
        "verification_summary": answer.verification_summary,
        "suggested_refinements": answer.suggested_refinements,
        "output_format": answer.output_format,
        "rows": [row.model_dump() for row in answer.rows],
        "comparison": [claim.model_dump() for claim in answer.comparison],
    }
    if answer.search_run_id:
        search_run = session.get(ChatSearchRun, answer.search_run_id)
        if search_run is not None and search_run.organization_id == organization_id:
            search_run.thread_id = thread_id
            search_run.message_id = assistant.id
    assistant.status = "completed"
    assistant.error = None
    assistant.updated_at = utcnow()
    if thread.title == "New thread":
        thread.title = " ".join(parent.content.split())[:255] or "New thread"
    thread.current_message_id = assistant.id
    thread.updated_at = utcnow()
    session.commit()
    session.refresh(thread)
    return thread


def _chat_thread_response(thread: ChatThread) -> ChatThreadResponse:
    return ChatThreadResponse(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        current_message_id=thread.current_message_id,
        pinned=thread.pinned,
        archived=thread.archived,
        read=thread.read_at is not None,
        sources=[
            {
                "video_id": source.video.id,
                "filename": source.video.filename,
                "status": source.video.status,
                "duration": source.video.duration,
                "url": None,
                "created_at": source.created_at,
            }
            for source in thread.sources
            if source.video is not None and source.video.status != "archived"
        ],
        messages=[
            {
                "id": message.id,
                "parent_id": message.parent_id,
                "role": message.role,
                "content": message.content,
                "citations": message.citations or [],
                "attachments": [
                    {
                        "video_id": attachment.video.id,
                        "filename": attachment.video.filename,
                        "status": attachment.video.status,
                        "duration": attachment.video.duration,
                        "created_at": attachment.created_at,
                    }
                    for attachment in message.attachments
                    if attachment.video is not None
                ],
                "status": message.status,
                "error": message.error,
                "search_run_id": (getattr(message, "generation_metadata", None) or {}).get("search_run_id"),
                "intent": (getattr(message, "generation_metadata", None) or {}).get("intent", {}),
                "verification_summary": (getattr(message, "generation_metadata", None) or {}).get("verification_summary", {}),
                "suggested_refinements": (getattr(message, "generation_metadata", None) or {}).get("suggested_refinements", []),
                "output_format": (getattr(message, "generation_metadata", None) or {}).get("output_format", "answer"),
                "rows": (getattr(message, "generation_metadata", None) or {}).get("rows", []),
                "comparison": (getattr(message, "generation_metadata", None) or {}).get("comparison", []),
                "created_at": message.created_at,
                "updated_at": message.updated_at,
            }
            for message in thread.messages
        ],
    )


@app.get(
    "/v1/chat/onboarding",
    response_model=ChatOnboardingState,
    dependencies=[Depends(require_api_key)],
)
def get_chat_onboarding(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    setting = session.get(OrganizationSetting, organization_id)
    settings = setting.settings if setting and isinstance(setting.settings, dict) else {}
    has_activity = session.scalar(
        select(ChatThreadMessage.id)
        .join(ChatThread, ChatThreadMessage.thread_id == ChatThread.id)
        .where(ChatThread.organization_id == organization_id)
        .limit(1)
    ) is not None
    has_videos = session.scalar(select(Video.id).where(Video.organization_id == organization_id).limit(1)) is not None
    return ChatOnboardingState(completed=bool(settings.get("chat_onboarding_completed") or has_activity or has_videos))


@app.post(
    "/v1/chat/onboarding/complete",
    response_model=ChatOnboardingState,
    dependencies=[Depends(require_api_key)],
)
def complete_chat_onboarding(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    setting = session.get(OrganizationSetting, organization_id)
    if setting is None:
        setting = OrganizationSetting(organization_id=organization_id, settings={})
        session.add(setting)
    settings = dict(setting.settings or {})
    settings["chat_onboarding_completed"] = True
    setting.settings = settings
    session.commit()
    return ChatOnboardingState(completed=True)


@app.get(
    "/v1/chat/threads",
    response_model=list[ChatThreadResponse],
    dependencies=[Depends(require_api_key)],
)
def list_chat_threads(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    threads = session.scalars(
        select(ChatThread)
        .where(ChatThread.organization_id == organization_id)
        .order_by(ChatThread.pinned.desc(), ChatThread.updated_at.desc())
    ).all()
    return [_chat_thread_response(thread) for thread in threads]


@app.post(
    "/v1/chat/threads",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def create_chat_thread(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = ChatThread(id=new_id(), organization_id=organization_id, title="New thread")
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.get(
    "/v1/chat/threads/search",
    response_model=list[ChatThreadResponse],
    dependencies=[Depends(require_api_key)],
)
def search_chat_threads(
    q: str = "",
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    query = q.strip()
    statement = select(ChatThread).where(ChatThread.organization_id == organization_id)
    if query:
        statement = statement.outerjoin(ChatThreadMessage).where(
            or_(ChatThread.title.ilike(f"%{query}%"), ChatThreadMessage.content.ilike(f"%{query}%"))
        ).distinct()
    threads = session.scalars(statement.order_by(ChatThread.pinned.desc(), ChatThread.updated_at.desc()).limit(100)).all()
    return [_chat_thread_response(thread) for thread in threads]


@app.get(
    "/v1/chat/threads/{thread_id}",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def get_chat_thread(
    thread_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    return _chat_thread_response(_get_chat_thread(session, thread_id, organization_id))


@app.post(
    "/v1/chat/threads/{thread_id}/messages",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
def create_chat_message(
    thread_id: str,
    request: ChatMessageRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    question = request.content.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    configured_llm = session.get(OrganizationSetting, organization_id)
    configured_llm_data = configured_llm.settings.get("llm", {}) if configured_llm and isinstance(configured_llm.settings, dict) else {}
    configured_key = decrypt_secret(configured_llm_data.get("api_key")) if isinstance(configured_llm_data, dict) else None
    if request.provider in {"custom", "openai", "anthropic", "gemini", "nvidia"} and (not request.custom_base_url or not request.custom_model or (not request.custom_api_key and not configured_key)):
        raise HTTPException(status_code=400, detail="AI endpoint, API key, and model are required")
    if request.provider == "ollama" and (not request.custom_base_url or not request.custom_model):
        raise HTTPException(status_code=400, detail="Ollama endpoint and model are required")
    if request.provider not in {"vivadeo-auto", "vivadeo-pro", "custom", "ollama", "openai", "anthropic", "gemini", "nvidia"}:
        raise HTTPException(status_code=400, detail="Unsupported chat provider")

    requested_video_ids = list(dict.fromkeys([*request.video_ids, *([request.video_id] if request.video_id else []), *request.comparison_video_ids]))
    if requested_video_ids:
        _attach_thread_sources(session, thread, requested_video_ids, organization_id)
    if request.focus_video_id:
        if not any(source.video_id == request.focus_video_id for source in thread.sources):
            raise HTTPException(status_code=400, detail="Focused video is not attached to this thread")

    current = _current_chat_message(thread)
    user_message = _append_chat_message(
        thread,
        session=session,
        role="user",
        content=question,
        parent_id=current.id if current is not None else None,
    )
    message_video_ids = requested_video_ids or [source.video_id for source in thread.sources if source.video is not None]
    _attach_message_videos(session, user_message, message_video_ids, organization_id)
    assistant_message = _append_chat_message(
        thread,
        session=session,
        role="assistant",
        content="",
        parent_id=user_message.id,
        status="pending",
    )
    safe_request_payload = request.model_dump(exclude={"custom_api_key"})
    job = Job(
        id=new_id(),
        organization_id=organization_id,
        kind="chat_generation",
        status="queued",
        payload={
            "thread_id": thread.id,
            "message_id": assistant_message.id,
            "request": safe_request_payload,
        },
        message="Queued chat generation",
    )
    session.add(job)
    session.commit()
    if request.provider in {"custom", "openai", "anthropic", "gemini", "nvidia"} and request.custom_api_key:
        Redis.from_url(get_runtime_settings().redis_url, decode_responses=True).setex(
            f"vivadeo:chat-key:{job.id}",
            900,
            request.custom_api_key,
        )
    generate_chat_task.delay(
        job.id,
        thread.id,
        assistant_message.id,
        organization_id,
        safe_request_payload,
    )
    return _job_response(job)


@app.get(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/attachments",
    response_model=list[ChatMessageVideoResponse],
    dependencies=[Depends(require_api_key)],
)
def list_chat_message_attachments(
    thread_id: str,
    message_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    message = session.scalar(select(ChatThreadMessage).where(ChatThreadMessage.id == message_id, ChatThreadMessage.thread_id == thread.id))
    if message is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    return [
        {
            "video_id": attachment.video.id,
            "filename": attachment.video.filename,
            "status": attachment.video.status,
            "duration": attachment.video.duration,
            "created_at": attachment.created_at,
        }
        for attachment in message.attachments
        if attachment.video is not None
    ]


@app.post(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/attachments",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def add_chat_message_attachments(
    thread_id: str,
    message_id: str,
    request: ChatMessageAttachmentRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    message = session.scalar(select(ChatThreadMessage).where(ChatThreadMessage.id == message_id, ChatThreadMessage.thread_id == thread.id))
    if message is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    _attach_thread_sources(session, thread, request.video_ids, organization_id)
    _attach_message_videos(session, message, request.video_ids, organization_id)
    thread.updated_at = utcnow()
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.delete(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/attachments/{video_id}",
    status_code=204,
    dependencies=[Depends(require_api_key)],
)
def remove_chat_message_attachment(
    thread_id: str,
    message_id: str,
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    message = session.scalar(select(ChatThreadMessage).where(ChatThreadMessage.id == message_id, ChatThreadMessage.thread_id == thread.id))
    if message is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    attachment = next((item for item in message.attachments if item.video_id == video_id), None)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Chat message attachment not found")
    session.delete(attachment)
    session.commit()


@app.get(
    "/v1/chat/threads/{thread_id}/sources",
    response_model=list[ChatThreadSourceResponse],
    dependencies=[Depends(require_api_key)],
)
def list_chat_thread_sources(
    thread_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    return _chat_thread_response(thread).sources


@app.post(
    "/v1/chat/threads/{thread_id}/sources",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def add_chat_thread_sources(
    thread_id: str,
    request: ChatThreadSourceRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    _attach_thread_sources(session, thread, request.video_ids, organization_id)
    thread.updated_at = utcnow()
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.delete(
    "/v1/chat/threads/{thread_id}/sources/{video_id}",
    status_code=204,
    dependencies=[Depends(require_api_key)],
)
def remove_chat_thread_source(
    thread_id: str,
    video_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    source = next((item for item in thread.sources if item.video_id == video_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail="Thread source not found")
    session.delete(source)
    thread.updated_at = utcnow()
    session.commit()


@app.patch(
    "/v1/chat/threads/{thread_id}",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def rename_chat_thread(
    thread_id: str,
    request: ChatThreadUpdate,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = session.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.organization_id == organization_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    if request.title is not None:
        thread.title = request.title.strip()
    if request.pinned is not None:
        thread.pinned = request.pinned
    if request.archived is not None:
        thread.archived = request.archived
    if request.read is not None:
        thread.read_at = utcnow() if request.read else None
    if request.title is None and request.pinned is None and request.archived is None and request.read is None:
        raise HTTPException(status_code=400, detail="No thread changes supplied")
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.delete(
    "/v1/chat/threads/{thread_id}",
    status_code=204,
    dependencies=[Depends(require_api_key)],
)
def delete_chat_thread(
    thread_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = session.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.organization_id == organization_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    session.delete(thread)
    session.commit()


@app.post(
    "/v1/search/chat",
    response_model=ChatResponse,
    dependencies=[Depends(require_api_key)],
)
def search_chat(
    request: ChatRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
    progress_callback=None,
):
    question = next(
        (message.content.strip() for message in reversed(request.messages) if message.role == "user" and message.content.strip()),
        "",
    )
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    thread = None
    if request.thread_id:
        thread = session.scalar(select(ChatThread).where(ChatThread.id == request.thread_id, ChatThread.organization_id == organization_id))
        if not thread:
            raise HTTPException(status_code=404, detail="Chat thread not found")
    user_message: ChatThreadMessage | None = None
    if thread is not None:
        current = _current_chat_message(thread)
        if current is not None and current.role == "user" and current.content == question:
            user_message = current
        else:
            user_message = _append_chat_message(
                thread,
                session=session,
                role="user",
                content=question,
                parent_id=current.id if current is not None else None,
            )

    comparison_video_ids = list(dict.fromkeys(request.comparison_video_ids))
    if request.output_format == "rows" and not request.extraction_type:
        raise HTTPException(status_code=422, detail="An extraction type is required for row searches")
    if request.output_format == "comparison" and len(comparison_video_ids) < 2:
        raise HTTPException(status_code=422, detail="Comparison requires at least two videos")
    scope_video_ids = comparison_video_ids or list(dict.fromkeys([*request.video_ids, *([request.video_id] if request.video_id else [])]))
    if not request.video_id and not scope_video_ids and thread is not None:
        scope_video_ids = [source.video_id for source in thread.sources if source.video and source.video.status not in {"archived", "failed", "canceled"}]
    if scope_video_ids and hasattr(session, "scalars"):
        authorized_ids = set(session.scalars(select(Video.id).where(Video.organization_id == organization_id, Video.id.in_(scope_video_ids))).all())
        if authorized_ids != set(scope_video_ids):
            raise HTTPException(status_code=404, detail="One or more videos are not available in this workspace")
    if request.focus_video_id:
        focused_video = session.scalar(select(Video).where(Video.id == request.focus_video_id, Video.organization_id == organization_id))
        if focused_video is None:
            raise HTTPException(status_code=404, detail="Focused video not found")
        if thread is not None and not any(source.video_id == request.focus_video_id for source in thread.sources):
            raise HTTPException(status_code=400, detail="Focused video is not attached to this thread")

    if request.parent_search_run_id:
        parent_run = session.get(ChatSearchRun, request.parent_search_run_id) if hasattr(session, "get") else None
        if parent_run is None or parent_run.organization_id != organization_id:
            raise HTTPException(status_code=404, detail="Parent search run not found")

    intent = route_chat_intent(
        question,
        modality_override=request.modality,
        search_mode_override="focused" if request.focus_video_id else ("top" if request.search_mode == "focused" else request.search_mode),
        focused=bool(request.focus_video_id),
    )
    search_run = _create_search_run(
        session,
        organization_id=organization_id,
        thread_id=thread.id if thread else None,
        message_id=None,
        question=question,
        intent=intent,
        scope_video_ids=scope_video_ids,
        request=request,
    )
    runtime_settings = get_runtime_settings()
    _report_search_stage(session, search_run, progress_callback, "retrieving", 0.2, "Retrieving relevant video moments")
    try:
        plan = session.scalar(select(Organization.plan).where(Organization.id == organization_id))
    except Exception:
        plan = "starter"
    use_nvidia = plan in {"pro", "enterprise"} and bool(getattr(runtime_settings, "pro_embedding_api_key", None))
    visual_verifier = None
    visual_question = intent["modality"] in {"visual", "hybrid"}
    result_limit = 100 if intent["search_mode"] == "all" else request.results
    if (
        visual_question
        and request.provider == "vivadeo-pro"
        and getattr(runtime_settings, "pro_llm_api_key", None)
        and getattr(runtime_settings, "pro_llm_base_url", None)
    ):
        visual_verifier = OpenAICompatibleChat(
            base_url=runtime_settings.pro_llm_base_url,
            api_key=runtime_settings.pro_llm_api_key,
            model=runtime_settings.pro_llm_model,
            timeout=runtime_settings.pro_llm_timeout,
        )
    try:
        # Video embeddings choose the relevant moments first. Transcript embeddings only
        # supplement sparse visual retrieval, while overlapping transcript rows provide
        # the text context sent to the answer model.
        embedding_backend = get_embedder()
        embedding = embedding_backend.embed_query(question)
        store = PostgresVideoStore(session)
        source_scopes = comparison_video_ids if request.output_format == "comparison" else [None]
        scope_limit = max(1, (result_limit + len(source_scopes) - 1) // len(source_scopes))
        chunk_hits = []
        transcript_embedding = None
        if visual_question:
            _report_search_stage(session, search_run, progress_callback, "checking", 0.45, "Checking visual evidence")
        for source_id in source_scopes:
            search_kwargs = {
                "n_results": max(scope_limit, 30) if request.focus_video_id and request.focus_start_time is not None else scope_limit,
                "organization_id": organization_id,
                "video_id": source_id or request.focus_video_id or request.video_id,
                **({"video_ids": scope_video_ids} if source_id is None and scope_video_ids and not request.focus_video_id and not request.video_id else {}),
            }
            source_hits = store.search(embedding, **search_kwargs)
            if visual_question:
                source_hits = _visual_rerank_hits(
                    embedding,
                    source_hits,
                    embedding_backend,
                    scope_limit,
                    question,
                    visual_verifier,
                    session,
                    exhaustive=intent["search_mode"] == "all",
                )
            if use_nvidia and len(source_hits) < scope_limit and intent["modality"] in {"transcript", "hybrid"}:
                if transcript_embedding is None:
                    reset_embedder()
                    transcript_embedder = get_embedder(
                        backend="nvidia",
                        api_key=runtime_settings.pro_embedding_api_key,
                        base_url=runtime_settings.pro_embedding_base_url,
                        model=runtime_settings.pro_embedding_model,
                        timeout=runtime_settings.pro_embedding_timeout,
                    )
                    transcript_embedding = transcript_embedder.embed_query(question)
                transcript_hits = store.search_transcript_embeddings(transcript_embedding, **search_kwargs)
                seen_hits = {(hit["video_id"], hit["start_time"], hit["end_time"]) for hit in source_hits}
                source_hits.extend(hit for hit in transcript_hits if (hit["video_id"], hit["start_time"], hit["end_time"]) not in seen_hits)
            chunk_hits.extend(source_hits[:scope_limit])
    finally:
        reset_embedder()

    if request.focus_video_id and request.focus_start_time is not None:
        focus_end = request.focus_end_time if request.focus_end_time is not None else request.focus_start_time + (request.focus_window_seconds or 15)
        if focus_end < request.focus_start_time:
            raise HTTPException(status_code=422, detail="Focused end time must be after the start time")
        chunk_hits = [
            hit for hit in chunk_hits
            if hit["video_id"] == request.focus_video_id and hit["end_time"] >= request.focus_start_time and hit["start_time"] <= focus_end
        ]

    _report_search_stage(session, search_run, progress_callback, "grouping", 0.65, "Grouping evidence moments")
    citations = []
    seen_segment_ids: set[str] = set()
    seen_visual_keys: set[tuple[str, float]] = set()
    for hit in chunk_hits:
        hit_modality = hit.get("retrieval_modality") or ("visual" if intent["modality"] == "visual" else "transcript")
        evidence_modality = "visual" if hit_modality == "visual" else "transcript"
        status_value, confidence, match_reason = verification_for_hit(hit, evidence_modality)
        if visual_question and hit_modality == "visual" and status_value == "rejected":
            continue
        stmt = (
            select(VideoTranscriptSegment, Video)
            .join(Video, Video.id == VideoTranscriptSegment.video_id)
            .where(
                VideoTranscriptSegment.organization_id == organization_id,
                VideoTranscriptSegment.video_id == hit["video_id"],
                VideoTranscriptSegment.end_time >= hit["start_time"],
                VideoTranscriptSegment.start_time <= hit["end_time"],
            )
            .order_by(VideoTranscriptSegment.start_time.asc())
            .limit(1 if hit.get("visual_verified") else 6)
        )
        rows = session.execute(stmt).all()
        if hit_modality == "visual":
            rows = rows[:1]
        if rows:
            for segment, video in rows:
                if segment.id in seen_segment_ids:
                    continue
                seen_segment_ids.add(segment.id)
                citations.append(
                    {
                        "segment_id": segment.id,
                        "video_id": video.id,
                        "filename": video.filename,
                        "source_uri": video.source_uri,
                        "start_time": hit["start_time"] if hit_modality == "visual" else segment.start_time,
                        "end_time": hit["end_time"] if hit_modality == "visual" else segment.end_time,
                        "text": segment.text,
                        "similarity_score": hit.get("similarity_score"),
                        "visual_verified": hit.get("visual_verified", False),
                        "verification_status": status_value,
                        "modality": hit_modality,
                        "confidence": confidence,
                        "match_reason": match_reason,
                    }
                )
                if len(citations) >= result_limit:
                    break
        elif hit_modality == "visual" and hasattr(session, "get"):
            video = session.get(Video, hit["video_id"])
            visual_key = (hit["video_id"], float(hit["start_time"]))
            if video is not None and visual_key not in seen_visual_keys:
                seen_visual_keys.add(visual_key)
                citations.append(
                    {
                        "segment_id": None,
                        "video_id": video.id,
                        "filename": video.filename,
                        "source_uri": video.source_uri,
                        "start_time": hit["start_time"],
                        "end_time": hit["end_time"],
                        "text": "",
                        "similarity_score": hit.get("similarity_score"),
                        "visual_verified": hit.get("visual_verified", False),
                        "verification_status": status_value,
                        "modality": hit_modality,
                        "confidence": confidence,
                        "match_reason": match_reason,
                    }
                )
        if len(citations) >= result_limit:
            break

    verified_citations = [item for item in citations if item["verification_status"] == "verified"]
    verification_summary = {
        "verified": len(verified_citations),
        "possible": sum(item["verification_status"] == "possible" for item in citations),
        "rejected": 0,
        "modality": intent["modality"],
    }
    rows = []
    comparison = []

    if not verified_citations and visual_question:
        answer = "I found possible visual matches, but I could not verify them confidently enough to answer. Try narrowing the question or asking about one of the moments."
        _finish_search_run(search_run, status="completed", summary=verification_summary)
        if thread is not None:
            assistant = _append_chat_message(thread, session=session, role="assistant", content=answer, parent_id=user_message.id if user_message else None)
            assistant.generation_metadata = {
                "search_run_id": search_run.id if search_run else None,
                "intent": intent,
                "verification_summary": verification_summary,
                "suggested_refinements": suggested_refinements(intent, has_results=bool(citations)),
                "rows": [],
                "comparison": [],
            }
            if search_run is not None:
                search_run.thread_id = thread.id
                search_run.message_id = assistant.id
        if search_run is not None or thread is not None:
            session.commit()
        if search_run is not None:
            search_run.result_rows = rows
            search_run.comparison_claims = comparison
        return ChatResponse(answer=answer, citations=citations, thread_id=thread.id if thread else None, title=thread.title if thread else None, search_run_id=search_run.id if search_run else None, intent=intent, verification_summary=verification_summary, suggested_refinements=suggested_refinements(intent, has_results=bool(citations)), output_format=request.output_format, rows=rows, comparison=comparison)

    if not citations:
        answer = "No defensible evidence is available yet. Try a more specific question, attach a video, or ask about a shorter time range."
        _finish_search_run(search_run, status="completed", summary=verification_summary)
        if thread is not None:
            if thread.title == "New thread":
                try:
                    settings = get_runtime_settings()
                    thread.title = ModalGemmaChat(
                        app_name=settings.modal_gemma_app,
                        function_name=settings.modal_gemma_function,
                        timeout=settings.modal_timeout,
                    ).title(question)
                except Exception:
                    thread.title = " ".join(question.split())[:255] or "New thread"
            assistant = _append_chat_message(
                thread,
                session=session,
                role="assistant",
                content=answer,
                parent_id=user_message.id if user_message is not None else None,
            )
            assistant.generation_metadata = {
                "search_run_id": search_run.id if search_run else None,
                "intent": intent,
                "verification_summary": verification_summary,
                "suggested_refinements": suggested_refinements(intent, has_results=False),
            }
            if search_run is not None:
                search_run.message_id = assistant.id
            session.commit()
        elif search_run is not None:
            session.commit()
        if search_run is not None:
            search_run.result_rows = rows
            search_run.comparison_claims = comparison
        return ChatResponse(answer=answer, citations=[], thread_id=thread.id if thread else None, title=thread.title if thread else None, search_run_id=search_run.id if search_run else None, intent=intent, verification_summary=verification_summary, suggested_refinements=suggested_refinements(intent, has_results=False), output_format=request.output_format, rows=rows, comparison=comparison)

    _report_search_stage(session, search_run, progress_callback, "answering", 0.78, "Preparing answer")
    settings = get_runtime_settings()
    messages = [message.model_dump() for message in request.messages[-10:]]
    try:
        plan = session.scalar(select(Organization.plan).where(Organization.id == organization_id))
    except Exception:
        plan = "starter"
    custom_provider = request.provider in {"custom", "openai", "gemini", "nvidia"}
    if request.provider == "ollama":
        if not request.custom_base_url or not request.custom_model:
            raise HTTPException(status_code=400, detail="Ollama endpoint and model are required")
        generator = OllamaChat(
            base_url=request.custom_base_url,
            model=request.custom_model,
            timeout=getattr(settings, "pro_llm_timeout", 120),
        )
    elif request.provider == "anthropic":
        if not request.custom_base_url or not request.custom_api_key or not request.custom_model:
            raise HTTPException(status_code=400, detail="Anthropic endpoint, API key, and model are required")
        generator = AnthropicChat(
            base_url=request.custom_base_url,
            api_key=request.custom_api_key,
            model=request.custom_model,
            timeout=getattr(settings, "pro_llm_timeout", 120),
        )
    elif custom_provider:
        if not request.custom_base_url or not request.custom_api_key or not request.custom_model:
            raise HTTPException(status_code=400, detail="AI endpoint, API key, and model are required")
        generator = OpenAICompatibleChat(
            base_url=request.custom_base_url,
            api_key=request.custom_api_key,
            model=request.custom_model,
            timeout=getattr(settings, "pro_llm_timeout", 120),
        )
    elif plan in {"pro", "enterprise"} and getattr(settings, "pro_llm_api_key", None) and getattr(settings, "pro_llm_base_url", None):
        generator = OpenAICompatibleChat(
            base_url=settings.pro_llm_base_url,
            api_key=settings.pro_llm_api_key,
            model=settings.pro_llm_model,
            timeout=settings.pro_llm_timeout,
        )
    else:
        generator = ModalGemmaChat(
            app_name=settings.modal_gemma_app,
            function_name=settings.modal_gemma_function,
            timeout=settings.modal_timeout,
        )
    assistant_message: ChatThreadMessage | None = None
    try:
        if thread is not None and thread.title == "New thread":
            if isinstance(generator, ModalGemmaChat):
                try:
                    thread.title = generator.title(question)
                except Exception:
                    thread.title = " ".join(question.split())[:255] or "New thread"
            else:
                thread.title = " ".join(question.split())[:255] or "New thread"
        if thread is not None:
            assistant_message = _append_chat_message(
                thread,
                session=session,
                role="assistant",
                content="",
                parent_id=user_message.id if user_message is not None else None,
                status="pending",
            )
            session.flush()
            # Do not hold a database connection while waiting on an external model.
            session.commit()
        answer_citations = (verified_citations if visual_question else citations)[:12]
        answer = generator.answer(messages, answer_citations)
        if request.output_format == "comparison":
            comparison = comparison_claims(verified_citations, answer)
        elif request.output_format == "rows":
            _report_search_stage(session, search_run, progress_callback, "extracting", 0.9, "Structuring evidence")
            evidence_catalog = "\n".join(
                f"[{index}] {citation['filename']} {citation['start_time']:.3f}-{citation['end_time']:.3f}: {citation.get('text') or citation.get('match_reason') or ''}"
                for index, citation in enumerate(answer_citations)
            )
            extraction_output = generator.answer([{
                "role": "user",
                "content": (
                    f"Extract only {request.extraction_type.replace('_', ' ')} supported by the evidence below. "
                    "Return only JSON as {\"rows\":[{\"item\":\"concise extracted fact\",\"evidence_index\":0}]}. "
                    "Use the matching bracketed evidence index. Omit unsupported or uncertain items.\n\n"
                    f"Question: {question}\nEvidence:\n{evidence_catalog}"
                ),
            }], answer_citations)
            rows = extraction_rows(answer_citations, extraction_output)
    except Exception as exc:
        _finish_search_run(search_run, status="failed", summary=verification_summary)
        if thread is not None:
            if assistant_message is None:
                assistant_message = _append_chat_message(
                    thread,
                    session=session,
                    role="assistant",
                    content="",
                    parent_id=user_message.id if user_message is not None else None,
                    status="failed",
                    error="Vivadeo could not prepare an answer.",
                )
            else:
                assistant_message.status = "failed"
                assistant_message.error = "Vivadeo could not prepare an answer."
            session.commit()
        raise HTTPException(status_code=502, detail="Answer generation failed. Please try again.") from exc
    _finish_search_run(search_run, status="completed", summary=verification_summary)
    if search_run is not None:
        search_run.result_rows = rows
        search_run.comparison_claims = comparison
    if thread is not None and assistant_message is not None:
        assistant_message.content = answer
        assistant_message.citations = citations
        assistant_message.generation_metadata = {
            "search_run_id": search_run.id if search_run else None,
            "intent": intent,
            "verification_summary": verification_summary,
            "suggested_refinements": suggested_refinements(intent, has_results=bool(citations)),
            "output_format": request.output_format,
            "rows": rows,
            "comparison": comparison,
        }
        if search_run is not None:
            search_run.message_id = assistant_message.id
        assistant_message.status = "completed"
        assistant_message.error = None
        assistant_message.updated_at = utcnow()
        session.commit()
    if search_run is not None:
        session.commit()
    return ChatResponse(answer=answer, citations=citations, thread_id=thread.id if thread else None, title=thread.title if thread else None, search_run_id=search_run.id if search_run else None, intent=intent, verification_summary=verification_summary, suggested_refinements=suggested_refinements(intent, has_results=bool(citations)), output_format=request.output_format, rows=[ChatExtractionRow.model_validate(row) for row in rows], comparison=[ChatComparisonClaim.model_validate(claim) for claim in comparison])


def _search_run_response(run: ChatSearchRun, feedback: list[ChatEvidenceFeedback] | None = None) -> ChatSearchRunResponse:
    return ChatSearchRunResponse(
        id=run.id,
        query=run.query,
        modality=run.modality,
        search_mode=run.search_mode,
        output_format=run.output_format,
        status=run.status,
        stage=run.stage,
        progress=run.progress,
        search_complete=run.search_complete,
        verification_summary=run.verification_summary or {},
        rows=run.result_rows or [],
        comparison=run.comparison_claims or [],
        created_at=run.created_at,
        updated_at=run.updated_at,
        feedback=[
            {
                "id": item.id,
                "video_id": item.video_id,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "feedback": item.feedback,
                "correction": item.correction,
                "created_at": item.created_at,
            }
            for item in (feedback or [])
        ],
    )


@app.get(
    "/v1/search/runs/{run_id}",
    response_model=ChatSearchRunResponse,
    dependencies=[Depends(require_api_key)],
)
def get_search_run(
    run_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    run = session.scalar(select(ChatSearchRun).where(ChatSearchRun.id == run_id, ChatSearchRun.organization_id == organization_id))
    if run is None:
        raise HTTPException(status_code=404, detail="Search run not found")
    feedback = session.scalars(select(ChatEvidenceFeedback).where(ChatEvidenceFeedback.search_run_id == run.id).order_by(ChatEvidenceFeedback.created_at.asc())).all()
    return _search_run_response(run, feedback)


@app.post(
    "/v1/search/runs/{run_id}/feedback",
    response_model=ChatSearchRunResponse,
    dependencies=[Depends(require_api_key)],
)
def add_search_feedback(
    run_id: str,
    request: ChatEvidenceFeedbackRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    if request.end_time < request.start_time:
        raise HTTPException(status_code=422, detail="Evidence end time must be after the start time")
    run = session.scalar(select(ChatSearchRun).where(ChatSearchRun.id == run_id, ChatSearchRun.organization_id == organization_id))
    if run is None:
        raise HTTPException(status_code=404, detail="Search run not found")
    video = session.scalar(select(Video).where(Video.id == request.video_id, Video.organization_id == organization_id))
    if video is None or (run.scope_video_ids and request.video_id not in run.scope_video_ids):
        raise HTTPException(status_code=404, detail="Evidence video not found")
    feedback = ChatEvidenceFeedback(
        id=new_id(),
        organization_id=organization_id,
        search_run_id=run.id,
        video_id=request.video_id,
        start_time=request.start_time,
        end_time=request.end_time,
        feedback=request.feedback,
        correction=request.correction.strip() if request.correction else None,
    )
    session.add(feedback)
    session.commit()
    session.refresh(run)
    entries = session.scalars(select(ChatEvidenceFeedback).where(ChatEvidenceFeedback.search_run_id == run.id).order_by(ChatEvidenceFeedback.created_at.asc())).all()
    return _search_run_response(run, entries)


def _saved_search_response(saved: SavedSearch) -> SavedSearchResponse:
    return SavedSearchResponse(
        id=saved.id,
        name=saved.name,
        query=saved.query,
        modality=saved.modality,
        search_mode=saved.search_mode,
        output_format=saved.output_format,
        extraction_type=saved.extraction_type,
        video_ids=saved.video_ids or [],
        archived=saved.archived,
        last_run_id=saved.last_run_id,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )


def _validate_saved_video_ids(session: Session, organization_id: str, video_ids: list[str]) -> list[str]:
    ids = list(dict.fromkeys(video_ids))
    if ids and hasattr(session, "scalars"):
        available = set(session.scalars(select(Video.id).where(Video.organization_id == organization_id, Video.id.in_(ids))).all())
        if available != set(ids):
            raise HTTPException(status_code=404, detail="One or more saved-search videos are unavailable")
    return ids


@app.get(
    "/v1/search/saved",
    response_model=list[SavedSearchResponse],
    dependencies=[Depends(require_api_key)],
)
def list_saved_searches(
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    saved = session.scalars(select(SavedSearch).where(SavedSearch.organization_id == organization_id).order_by(SavedSearch.archived.asc(), SavedSearch.updated_at.desc())).all()
    return [_saved_search_response(item) for item in saved]


@app.post(
    "/v1/search/saved",
    response_model=SavedSearchResponse,
    dependencies=[Depends(require_api_key)],
)
def create_saved_search(
    request: SavedSearchRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    if request.search_mode == "focused":
        raise HTTPException(status_code=422, detail="Focused searches must be saved from a selected moment")
    if request.output_format == "rows" and not request.extraction_type:
        raise HTTPException(status_code=422, detail="An extraction type is required for row searches")
    video_ids = _validate_saved_video_ids(session, organization_id, request.video_ids)
    saved = SavedSearch(
        id=new_id(), organization_id=organization_id, name=request.name.strip(), query=request.query.strip(),
        modality=request.modality, search_mode=request.search_mode, output_format=request.output_format,
        extraction_type=request.extraction_type, video_ids=video_ids,
    )
    session.add(saved)
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="A saved search with that name already exists") from exc
    session.refresh(saved)
    return _saved_search_response(saved)


@app.patch(
    "/v1/search/saved/{saved_id}",
    response_model=SavedSearchResponse,
    dependencies=[Depends(require_api_key)],
)
def update_saved_search(
    saved_id: str,
    request: SavedSearchUpdateRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    saved = session.scalar(select(SavedSearch).where(SavedSearch.id == saved_id, SavedSearch.organization_id == organization_id))
    if saved is None:
        raise HTTPException(status_code=404, detail="Saved search not found")
    if request.name is None and request.archived is None:
        raise HTTPException(status_code=400, detail="No saved-search changes supplied")
    if request.name is not None:
        saved.name = request.name.strip()
    if request.archived is not None:
        saved.archived = request.archived
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="A saved search with that name already exists") from exc
    session.refresh(saved)
    return _saved_search_response(saved)


@app.delete(
    "/v1/search/saved/{saved_id}",
    status_code=204,
    dependencies=[Depends(require_api_key)],
)
def delete_saved_search(
    saved_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    saved = session.scalar(select(SavedSearch).where(SavedSearch.id == saved_id, SavedSearch.organization_id == organization_id))
    if saved is None:
        raise HTTPException(status_code=404, detail="Saved search not found")
    session.delete(saved)
    session.commit()


@app.post(
    "/v1/search/saved/{saved_id}/run",
    response_model=ChatResponse,
    dependencies=[Depends(require_api_key)],
)
def run_saved_search(
    saved_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    saved = session.scalar(select(SavedSearch).where(SavedSearch.id == saved_id, SavedSearch.organization_id == organization_id, SavedSearch.archived.is_(False)))
    if saved is None:
        raise HTTPException(status_code=404, detail="Saved search not found")
    video_ids = _validate_saved_video_ids(session, organization_id, saved.video_ids or [])
    response = search_chat(
        ChatRequest(
            messages=[ChatMessage(role="user", content=saved.query)],
            results=100 if saved.search_mode == "all" else 8,
            video_ids=video_ids,
            modality=saved.modality,
            search_mode=saved.search_mode,
            output_format=saved.output_format,
            extraction_type=saved.extraction_type,
            comparison_video_ids=video_ids if saved.output_format == "comparison" else [],
        ),
        session=session,
        organization_id=organization_id,
    )
    saved.last_run_id = response.search_run_id
    session.commit()
    return response


@app.post(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/select",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def select_chat_message_branch(
    thread_id: str,
    message_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    message = session.scalar(
        select(ChatThreadMessage).where(
            ChatThreadMessage.id == message_id,
            ChatThreadMessage.thread_id == thread.id,
        )
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    if message.status in {"pending", "streaming"}:
        raise HTTPException(status_code=409, detail="Chat message is still generating")
    thread.current_message_id = message.id
    thread.updated_at = utcnow()
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.post(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/retry",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
@app.post(
    "/v1/chat/threads/{thread_id}/messages/{message_id}/regenerate",
    response_model=ChatThreadResponse,
    dependencies=[Depends(require_api_key)],
)
def regenerate_chat_message(
    thread_id: str,
    message_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    thread = _get_chat_thread(session, thread_id, organization_id)
    message = session.scalar(
        select(ChatThreadMessage).where(
            ChatThreadMessage.id == message_id,
            ChatThreadMessage.thread_id == thread.id,
        )
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Chat message not found")
    if message.role != "assistant":
        raise HTTPException(status_code=400, detail="Only assistant messages can be regenerated")
    if not message.parent_id:
        raise HTTPException(status_code=400, detail="Assistant message has no user prompt")

    parent = next((item for item in thread.messages if item.id == message.parent_id), None)
    if parent is None or parent.role != "user":
        raise HTTPException(status_code=409, detail="Assistant message history is incomplete")
    history = _chat_message_path(thread, parent.id)
    source_ids = [
        source.video_id
        for source in thread.sources
        if source.video is not None and source.video.status not in {"archived", "failed", "canceled"}
    ]
    replacement = _append_chat_message(
        thread,
        session=session,
        role="assistant",
        content="",
        parent_id=parent.id,
        status="pending",
    )
    session.flush()
    session.commit()

    try:
        result = search_chat(
            ChatRequest(
                messages=[ChatMessage(role=item.role, content=item.content) for item in history],
                results=8,
                video_ids=source_ids,
            ),
            session=session,
            organization_id=organization_id,
        )
    except HTTPException as exc:
        replacement.status = "failed"
        replacement.error = "Vivadeo could not prepare an answer."
        thread.current_message_id = replacement.id
        thread.updated_at = utcnow()
        session.commit()
        raise exc
    except Exception as exc:
        replacement.status = "failed"
        replacement.error = "Vivadeo could not prepare an answer."
        thread.current_message_id = replacement.id
        thread.updated_at = utcnow()
        session.commit()
        raise HTTPException(status_code=502, detail="Answer generation failed. Please try again.") from exc

    replacement.content = result.answer
    replacement.citations = [citation.model_dump() for citation in result.citations]
    replacement.status = "completed"
    replacement.error = None
    if thread.title == "New thread":
        thread.title = " ".join(parent.content.split())[:255] or "New thread"
    thread.current_message_id = replacement.id
    thread.updated_at = utcnow()
    session.commit()
    session.refresh(thread)
    return _chat_thread_response(thread)


@app.post(
    "/v1/search/image",
    response_model=SearchResponse,
    dependencies=[Depends(require_api_key)],
)
async def search_by_image(
    image: UploadFile = File(...),
    results: int = 12,
    video_id: str | None = None,
    threshold: float | None = None,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    suffix = Path(image.filename or "query.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await image.read())
        tmp.flush()
        temp_path = tmp.name
    try:
        embedding = get_embedder().embed_image(temp_path)
        payload = PostgresVideoStore(session).search(
            embedding,
            n_results=results,
            organization_id=organization_id,
            video_id=video_id,
        )
    finally:
        reset_embedder()
        Path(temp_path).unlink(missing_ok=True)
    if threshold is not None:
        payload = [r for r in payload if r["similarity_score"] >= threshold]
    return SearchResponse(results=payload)


@app.post(
    "/v1/clips", response_model=ClipResponse, dependencies=[Depends(require_api_key)]
)
def create_clip(
    request: ClipRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    if request.end_time <= request.start_time:
        raise HTTPException(
            status_code=400, detail="end_time must be greater than start_time"
        )
    video = session.get(Video, request.video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    clip = Clip(
        id=new_id(),
        organization_id=organization_id,
        video_id=request.video_id,
        start_time=request.start_time,
        end_time=request.end_time,
        status="queued",
    )
    job = Job(
        id=new_id(),
        organization_id=organization_id,
        kind="trim_clip",
        status="queued",
        video_id=request.video_id,
        clip_id=clip.id,
    )
    clip.job_id = job.id
    session.add_all([clip, job])
    session.commit()
    trim_clip_task.delay(job.id, clip.id, organization_id)
    return _clip_response(clip)


@app.get(
    "/v1/clips/{clip_id}",
    response_model=ClipResponse,
    dependencies=[Depends(require_api_key)],
)
def get_clip(
    clip_id: str,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    clip = session.get(Clip, clip_id)
    if not clip or clip.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Clip not found")
    return _clip_response(clip, ObjectStore())


@app.get("/v1/stats", dependencies=[Depends(require_api_key)])
def stats(
    session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)
) -> dict:
    try:
        return PostgresVideoStore(session).stats(
            organization_id=organization_id,
            object_store=ObjectStore(),
        )
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="The requested operation failed. Please try again.") from exc
