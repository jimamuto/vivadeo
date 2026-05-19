"""FastAPI production API."""

import os
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from starlette.responses import StreamingResponse
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import Base, Clip, Job, Organization, OrganizationSetting, SessionLocal, Video, make_engine, new_id
from .embedder import get_embedder, reset_embedder
from .object_store import ObjectStore, video_object_key
from .media import stream_object
from .production_store import PostgresVideoStore
from .schemas import (
    ClipRequest,
    ClipResponse,
    JobResponse,
    LocalPathIngestRequest,
    SearchRequest,
    SearchResponse,
    UrlIngestRequest,
    VideoResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceSettingsRequest,
    WorkspaceSettingsResponse,
)
from .worker import ingest_local_path, ingest_uploaded_object, ingest_url, trim_clip_task


app = FastAPI(title="SentrySearch", version="0.1.0")


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
            {"id": get_settings().default_org_id, "slug": "default", "name": "Default workspace"},
        )
    ObjectStore().ensure_bucket()


def settings_dep() -> Settings:
    return get_settings()


def require_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
    settings: Settings = Depends(settings_dep),
) -> None:
    if not settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    if x_api_key == settings.api_key or x_internal_service_key == settings.internal_service_key:
        return
    if x_api_key == settings.internal_service_key:
        return
    if x_internal_service_key == settings.api_key:
        return
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


def workspace_dep(
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
    settings: Settings = Depends(settings_dep),
) -> str:
    return x_workspace_id or settings.default_org_id


def _get_workspace(session: Session, organization_id: str) -> Organization:
    org = session.get(Organization, organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
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


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/v1/workspaces", response_model=list[WorkspaceResponse], dependencies=[Depends(require_api_key)])
def list_workspaces(session: Session = Depends(db_dep)) -> list[WorkspaceResponse]:
    orgs = session.scalars(select(Organization).order_by(Organization.created_at.desc())).all()
    return [WorkspaceResponse(id=org.id, slug=org.slug, name=org.name, plan=org.plan) for org in orgs]


@app.post("/v1/workspaces", response_model=WorkspaceResponse, dependencies=[Depends(require_api_key)])
def create_workspace(request: WorkspaceCreateRequest, session: Session = Depends(db_dep)) -> WorkspaceResponse:
    slug = request.slug or request.name.lower().replace(" ", "-")
    org = Organization(id=new_id(), slug=slug, name=request.name)
    session.add(org)
    session.commit()
    return WorkspaceResponse(id=org.id, slug=org.slug, name=org.name, plan=org.plan)


@app.get("/v1/settings", response_model=WorkspaceSettingsResponse, dependencies=[Depends(require_api_key)])
def get_settings(session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)) -> WorkspaceSettingsResponse:
    _get_workspace(session, organization_id)
    settings = session.get(OrganizationSetting, organization_id)
    return WorkspaceSettingsResponse(organization_id=organization_id, settings=(settings.settings if settings else {}))


@app.put("/v1/settings", response_model=WorkspaceSettingsResponse, dependencies=[Depends(require_api_key)])
def update_settings(
    request: WorkspaceSettingsRequest,
    session: Session = Depends(db_dep),
    organization_id: str = Depends(workspace_dep),
) -> WorkspaceSettingsResponse:
    _get_workspace(session, organization_id)
    settings = session.get(OrganizationSetting, organization_id)
    if settings is None:
        settings = OrganizationSetting(organization_id=organization_id, settings=request.settings)
        session.add(settings)
    else:
        settings.settings = request.settings
    session.commit()
    return WorkspaceSettingsResponse(organization_id=organization_id, settings=settings.settings)


@app.post("/v1/videos/upload", response_model=JobResponse, dependencies=[Depends(require_api_key)])
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

    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
        tmp_path = tmp.name
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            tmp.write(chunk)

    try:
        ObjectStore().upload_file(tmp_path, object_key, file.content_type)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

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
    job = Job(id=job_id, organization_id=organization_id, kind="ingest_uploaded_object", status="queued", video_id=video_id)
    session.add(job)
    session.commit()
    ingest_uploaded_object.delay(job_id, video_id, organization_id)
    return _job_response(job)


@app.post("/v1/videos/url", response_model=JobResponse, dependencies=[Depends(require_api_key)])
def ingest_video_url(request: UrlIngestRequest, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
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


@app.post("/v1/videos/local-path", response_model=JobResponse, dependencies=[Depends(require_api_key)])
def ingest_local_video(request: LocalPathIngestRequest, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
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
    job = Job(id=job_id, organization_id=organization_id, kind="ingest_local_path", status="queued", video_id=video_id)
    session.add(job)
    session.commit()
    ingest_local_path.delay(job_id, video_id, organization_id, str(path))
    return _job_response(job)


@app.get("/v1/videos", response_model=list[VideoResponse], dependencies=[Depends(require_api_key)])
def list_videos(session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
    store = ObjectStore()
    videos = session.scalars(select(Video).where(Video.organization_id == organization_id).order_by(Video.created_at.desc())).all()
    return [_video_response(video, store) for video in videos]


@app.get("/v1/videos/{video_id}", response_model=VideoResponse, dependencies=[Depends(require_api_key)])
def get_video(video_id: str, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
    video = session.get(Video, video_id)
    if not video or video.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Video not found")
    return _video_response(video, ObjectStore())


@app.get("/v1/media/{object_key:path}", dependencies=[Depends(require_api_key)])
def get_media(object_key: str, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)) -> StreamingResponse:
    video = session.scalars(
        select(Video).where(Video.organization_id == organization_id, Video.object_key == object_key)
    ).first()
    clip = session.scalars(
        select(Clip).where(Clip.organization_id == organization_id, Clip.object_key == object_key)
    ).first()
    if video is None and clip is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return stream_object(object_key, content_type=(video.content_type if video else "video/mp4"))


@app.get("/v1/jobs/{job_id}", response_model=JobResponse, dependencies=[Depends(require_api_key)])
def get_job(job_id: str, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
    job = session.get(Job, job_id)
    if not job or job.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_response(job)


@app.post("/v1/search", response_model=SearchResponse, dependencies=[Depends(require_api_key)])
def search(request: SearchRequest, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
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


@app.post("/v1/clips", response_model=ClipResponse, dependencies=[Depends(require_api_key)])
def create_clip(request: ClipRequest, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
    if request.end_time <= request.start_time:
        raise HTTPException(status_code=400, detail="end_time must be greater than start_time")
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
    job = Job(id=new_id(), organization_id=organization_id, kind="trim_clip", status="queued", video_id=request.video_id, clip_id=clip.id)
    clip.job_id = job.id
    session.add_all([clip, job])
    session.commit()
    trim_clip_task.delay(job.id, clip.id, organization_id)
    return _clip_response(clip)


@app.get("/v1/clips/{clip_id}", response_model=ClipResponse, dependencies=[Depends(require_api_key)])
def get_clip(clip_id: str, session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)):
    clip = session.get(Clip, clip_id)
    if not clip or clip.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Clip not found")
    return _clip_response(clip, ObjectStore())


@app.get("/v1/stats", dependencies=[Depends(require_api_key)])
def stats(session: Session = Depends(db_dep), organization_id: str = Depends(workspace_dep)) -> dict:
    try:
        return PostgresVideoStore(session).stats(organization_id=organization_id)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
