"""Pydantic API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class WorkspaceResponse(BaseModel):
    id: str
    slug: str
    name: str
    plan: str


class WorkspaceCreateRequest(BaseModel):
    name: str
    slug: str | None = None
    owner_email: str | None = None


class WorkspaceSettingsResponse(BaseModel):
    organization_id: str
    settings: dict


class WorkspaceSettingsRequest(BaseModel):
    settings: dict


class JobResponse(BaseModel):
    id: str
    organization_id: str
    kind: str
    status: str
    progress: float
    message: str | None = None
    error: str | None = None
    video_id: str | None = None
    clip_id: str | None = None
    created_at: datetime
    updated_at: datetime


class VideoResponse(BaseModel):
    id: str
    organization_id: str
    source_type: str
    source_uri: str
    filename: str
    status: str
    duration: float | None = None
    object_key: str | None = None
    url: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime


class VideoChunkResponse(BaseModel):
    id: str
    organization_id: str
    video_id: str
    start_time: float
    end_time: float
    embedding_backend: str
    embedding_model: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class DeadLetterEntryResponse(BaseModel):
    id: str
    organization_id: str
    video_id: str | None = None
    chunk_id: str
    source_uri: str
    start_time: float
    end_time: float
    error: str
    attempts: int
    created_at: datetime
    updated_at: datetime


class UrlIngestRequest(BaseModel):
    url: str
    max_height: int = 480


class LocalPathIngestRequest(BaseModel):
    path: str


class SearchRequest(BaseModel):
    query: str
    results: int = Field(5, ge=1, le=100)
    threshold: float | None = None
    video_id: str | None = None


class SearchResult(BaseModel):
    chunk_id: str
    organization_id: str
    video_id: str
    filename: str
    source_uri: str
    start_time: float
    end_time: float
    similarity_score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


class ClipRequest(BaseModel):
    video_id: str
    start_time: float
    end_time: float


class ClipResponse(BaseModel):
    id: str
    organization_id: str
    video_id: str
    status: str
    start_time: float
    end_time: float
    object_key: str | None = None
    url: str | None = None
    job_id: str | None = None
