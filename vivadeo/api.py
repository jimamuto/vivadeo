"""FastAPI production API."""

from pathlib import Path
import tempfile

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from .config import Settings
from .config import get_settings as get_runtime_settings
from .db import (
    Base,
    Clip,
    DeadLetterEntry,
    AuthMembership,
    AuthUser,
    Job,
    Organization,
    OrganizationSetting,
    SessionLocal,
    Video,
    VideoChunk,
    make_engine,
    new_id,
    utcnow,
)
from .embedder import get_embedder, reset_embedder
from .media import stream_object
from .object_store import ObjectStore, video_object_key
from .production_store import PostgresVideoStore
from .schemas import (
    ClipRequest,
    ClipResponse,
    DeadLetterEntryResponse,
    JobResponse,
    LocalPathIngestRequest,
    SearchRequest,
    SearchResponse,
    UrlIngestRequest,
    VideoChunkResponse,
    VideoResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceSettingsRequest,
    WorkspaceSettingsResponse,
)
from .worker import (
    ingest_local_path,
    ingest_uploaded_object,
    ingest_url,
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
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _video_response(video: Video, store: ObjectStore | None = None) -> VideoResponse:
    url = store.presigned_url(video.object_key) if store and video.object_key else None
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


@app.post(
    "/v1/workspaces",
    response_model=WorkspaceResponse,
    dependencies=[Depends(require_api_key)],
)
def create_workspace(
    request: WorkspaceCreateRequest, session: Session = Depends(db_dep)
) -> WorkspaceResponse:
    slug = request.slug or request.name.lower().replace(" ", "-")
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
    user = session.scalars(select(AuthUser).where(AuthUser.email == email)).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Auth user not found")

    membership = session.scalars(
        select(AuthMembership).where(
            AuthMembership.organization_id == org.id,
            AuthMembership.user_id == user.id,
        )
    ).first()
    if membership is None:
        session.add(
            AuthMembership(
                organization_id=org.id,
                user_id=user.id,
                role="owner",
            )
        )

    session.execute(
        text(
            "INSERT INTO organization (id, slug, name) "
            "VALUES (:id, :slug, :name) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"id": org.id, "slug": org.slug, "name": org.name},
    )
    session.commit()
    return {"organization_id": org.id, "email": email}


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


@app.post(
    "/v1/videos/upload",
    response_model=JobResponse,
    dependencies=[Depends(require_api_key)],
)
async def upload_video(
    file: UploadFile = File(...),
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
):
    _get_workspace(session, organization_id)
    video_id = new_id()
    job_id = new_id()
    filename = Path(file.filename or f"{video_id}.mp4").name
    object_key = video_object_key(video_id, filename)

    # Stream the upload directly into MinIO — no temp file needed.
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
    job = Job(
        id=job_id,
        organization_id=organization_id,
        kind="ingest_uploaded_object",
        status="queued",
        video_id=video_id,
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
    job = Job(
        id=job_id,
        organization_id=organization_id,
        kind="ingest_url",
        status="queued",
        video_id=video_id,
        payload={"url": request.url, "max_height": request.max_height},
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
    videos = session.scalars(
        select(Video)
        .where(Video.organization_id == organization_id)
        .order_by(Video.created_at.desc())
    ).all()
    return [_video_response(video, store) for video in videos]


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
    return _video_response(video, ObjectStore())


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
    return _video_response(video, ObjectStore())


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
    job = Job(
        id=new_id(),
        organization_id=organization_id,
        kind=f"reindex_{video.source_type}",
        status="queued",
        video_id=video_id,
        progress=0.0,
        message="Reindex queued",
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

    clip_ids = session.scalars(
        select(Clip.id).where(
            Clip.organization_id == organization_id,
            Clip.video_id == video_id,
        )
    ).all()
    if clip_ids:
        session.execute(delete(Job).where(Job.clip_id.in_(clip_ids)))
    session.execute(delete(Clip).where(Clip.video_id == video_id, Clip.organization_id == organization_id))
    session.execute(delete(VideoChunk).where(VideoChunk.video_id == video_id, VideoChunk.organization_id == organization_id))
    session.execute(delete(Job).where(Job.video_id == video_id, Job.organization_id == organization_id))
    session.delete(video)
    session.commit()


@app.get("/v1/media/{object_key:path}", dependencies=[Depends(require_api_key)])
def get_media(
    object_key: str,
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
        object_key, content_type=(video.content_type if video else "video/mp4")
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
        )
    finally:
        reset_embedder()
    if request.threshold is not None:
        results = [r for r in results if r["similarity_score"] >= request.threshold]
    return SearchResponse(results=results)


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
