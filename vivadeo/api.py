"""FastAPI production API."""

from pathlib import Path
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
    ChatMessageVideo,
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
    Video,
    VideoChunk,
    VideoTranscriptSegment,
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
from .schemas import (
    ChatMessage,
    ChatMessageAttachmentRequest,
    ChatMessageRequest,
    ChatMessageVideoResponse,
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
    return stream_object("profile-images/" + image.split("profile-images/", 1)[1])


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
    if video is None and clip is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return stream_object(
        object_key,
        content_type=(video.content_type if video else "video/mp4"),
        range_header=range_header,
    )


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

    def event_stream():
        client = Redis.from_url(get_runtime_settings().redis_url, decode_responses=True)
        pubsub = client.pubsub()
        pubsub.subscribe(f"vivadeo:job:{job_id}")
        try:
            yield f"event: job\\ndata: {_job_response(job).model_dump_json()}\\n\\n"
            if job.status in {"succeeded", "failed", "canceled"}:
                return
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=15)
                if message and message.get("data"):
                    payload = message["data"]
                    yield f"event: job\\ndata: {payload}\\n\\n"
                    if '"status":"succeeded"' in payload or '"status":"failed"' in payload or '"status":"canceled"' in payload:
                        return
                else:
                    yield ": keepalive\\n\\n"
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
                video_id=request.video_id if request.video_id in source_ids else None,
                video_ids=[video_id for video_id in request.video_ids if video_id in source_ids] or source_ids,
                provider=request.provider,
                custom_base_url=request.custom_base_url,
                custom_api_key=request.custom_api_key,
                custom_model=request.custom_model,
                focus_video_id=request.focus_video_id,
                focus_start_time=request.focus_start_time,
                focus_end_time=request.focus_end_time,
            ),
            session=session,
            organization_id=organization_id,
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
    has_activity = session.scalar(select(ChatThreadMessage.id).join(ChatThread).where(ChatThread.organization_id == organization_id).limit(1)) is not None
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
    if request.provider not in {"vivadeo-auto", "custom", "ollama", "openai", "anthropic", "gemini", "nvidia"}:
        raise HTTPException(status_code=400, detail="Unsupported chat provider")

    requested_video_ids = list(dict.fromkeys([*request.video_ids, *([request.video_id] if request.video_id else [])]))
    if requested_video_ids:
        _attach_thread_sources(session, thread, requested_video_ids, organization_id)
    if request.focus_video_id:
        if not any(source.video_id == request.focus_video_id for source in thread.sources):
            raise HTTPException(status_code=400, detail="Focused video is not attached to this thread")

    current = _current_chat_message(thread)
    user_message = _append_chat_message(
        thread,
        role="user",
        content=question,
        parent_id=current.id if current is not None else None,
    )
    message_video_ids = requested_video_ids or [source.video_id for source in thread.sources if source.video is not None]
    _attach_message_videos(session, user_message, message_video_ids, organization_id)
    assistant_message = _append_chat_message(
        thread,
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
                role="user",
                content=question,
                parent_id=current.id if current is not None else None,
            )

    scope_video_ids = list(dict.fromkeys(request.video_ids))
    if not request.video_id and not scope_video_ids and thread is not None:
        scope_video_ids = [source.video_id for source in thread.sources if source.video and source.video.status not in {"archived", "failed", "canceled"}]
    if request.focus_video_id:
        focused_video = session.scalar(select(Video).where(Video.id == request.focus_video_id, Video.organization_id == organization_id))
        if focused_video is None:
            raise HTTPException(status_code=404, detail="Focused video not found")
        if thread is not None and not any(source.video_id == request.focus_video_id for source in thread.sources):
            raise HTTPException(status_code=400, detail="Focused video is not attached to this thread")

    runtime_settings = get_runtime_settings()
    try:
        plan = session.scalar(select(Organization.plan).where(Organization.id == organization_id))
    except Exception:
        plan = "starter"
    use_nvidia = plan in {"pro", "enterprise"} and bool(getattr(runtime_settings, "pro_embedding_api_key", None))
    try:
        if use_nvidia:
            embedding_backend = get_embedder(
                backend="nvidia",
                api_key=runtime_settings.pro_embedding_api_key,
                base_url=runtime_settings.pro_embedding_base_url,
                model=runtime_settings.pro_embedding_model,
                timeout=runtime_settings.pro_embedding_timeout,
            )
        else:
            embedding_backend = get_embedder()
        embedding = embedding_backend.embed_query(question)
        store = PostgresVideoStore(session)
        search_method = store.search_transcript_embeddings if use_nvidia else store.search
        search_kwargs = {
            "n_results": max(request.results, 30) if request.focus_video_id and request.focus_start_time is not None else request.results,
            "organization_id": organization_id,
            "video_id": request.focus_video_id or request.video_id,
            **({"video_ids": scope_video_ids} if scope_video_ids and not request.focus_video_id and not request.video_id else {}),
        }
        chunk_hits = search_method(embedding, **search_kwargs)
        if use_nvidia and not chunk_hits:
            reset_embedder()
            qwen = get_embedder()
            chunk_hits = store.search(qwen.embed_query(question), **search_kwargs)
    finally:
        reset_embedder()

    if request.focus_video_id and request.focus_start_time is not None:
        focus_end = request.focus_end_time if request.focus_end_time is not None else request.focus_start_time + 15
        chunk_hits = [
            hit for hit in chunk_hits
            if hit["video_id"] == request.focus_video_id and hit["end_time"] >= request.focus_start_time and hit["start_time"] <= focus_end
        ]

    citations = []
    seen_segment_ids: set[str] = set()
    for hit in chunk_hits:
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
            .limit(6)
        )
        for segment, video in session.execute(stmt).all():
            if segment.id in seen_segment_ids:
                continue
            seen_segment_ids.add(segment.id)
            citations.append(
                {
                    "segment_id": segment.id,
                    "video_id": video.id,
                    "filename": video.filename,
                    "source_uri": video.source_uri,
                    "start_time": segment.start_time,
                    "end_time": segment.end_time,
                    "text": segment.text,
                    "similarity_score": hit.get("similarity_score"),
                }
            )
            if len(citations) >= request.results:
                break
        if len(citations) >= request.results:
            break

    if not citations:
        answer = "No transcript evidence is available yet. Reindex or ingest videos with transcription enabled, then ask again."
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
            _append_chat_message(
                thread,
                role="assistant",
                content=answer,
                parent_id=user_message.id if user_message is not None else None,
            )
            session.commit()
        return ChatResponse(answer=answer, citations=[], thread_id=thread.id if thread else None, title=thread.title if thread else None)

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
                role="assistant",
                content="",
                parent_id=user_message.id if user_message is not None else None,
                status="pending",
            )
            session.flush()
        answer = generator.answer(messages, citations)
    except Exception as exc:
        if thread is not None:
            if assistant_message is None:
                assistant_message = _append_chat_message(
                    thread,
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
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if thread is not None and assistant_message is not None:
        assistant_message.content = answer
        assistant_message.citations = citations
        assistant_message.status = "completed"
        assistant_message.error = None
        assistant_message.updated_at = utcnow()
        session.commit()
    return ChatResponse(answer=answer, citations=citations, thread_id=thread.id if thread else None, title=thread.title if thread else None)


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
        raise HTTPException(status_code=502, detail=str(exc)) from exc

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
        raise HTTPException(status_code=500, detail=str(exc)) from exc
