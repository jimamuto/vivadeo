"""Pydantic API schemas."""

from datetime import datetime
from typing import Literal

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


class LlmSettingsRequest(BaseModel):
    provider: str = "vivadeo-auto"
    base_url: str = ""
    model: str = ""
    api_key: str | None = None


class LlmSettingsResponse(BaseModel):
    organization_id: str
    provider: str = "vivadeo-auto"
    base_url: str = ""
    model: str = ""
    api_key_configured: bool = False


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
    events: list[dict] = Field(default_factory=list)
    transcribe: bool = True


class VideoLibraryUpdateRequest(BaseModel):
    filename: str | None = None
    collection: str | None = None
    labels: list[str] | None = None
    position: int | None = None


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
    collection: str | None = None
    labels: list[str] = Field(default_factory=list)
    position: int = 0
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
    transcribe: bool = True
    thread_id: str | None = None


class LocalPathIngestRequest(BaseModel):
    path: str
    transcribe: bool = True


class SearchRequest(BaseModel):
    query: str
    results: int = Field(5, ge=1, le=100)
    threshold: float | None = None
    video_id: str | None = None
    video_ids: list[str] = Field(default_factory=list)


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


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatThreadUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    pinned: bool | None = None
    archived: bool | None = None
    read: bool | None = None


class ChatThreadSourceRequest(BaseModel):
    video_ids: list[str] = Field(default_factory=list, min_length=1)


class ChatThreadSourceResponse(BaseModel):
    video_id: str
    filename: str
    status: str
    duration: float | None = None
    url: str | None = None
    created_at: datetime


class ChatOnboardingState(BaseModel):
    completed: bool


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    results: int = Field(8, ge=1, le=100)
    video_id: str | None = None
    provider: str = "vivadeo-auto"
    custom_base_url: str | None = None
    custom_api_key: str | None = None
    custom_model: str | None = None
    video_ids: list[str] = Field(default_factory=list)
    thread_id: str | None = None
    parent_search_run_id: str | None = None
    modality: Literal["auto", "visual", "transcript", "hybrid"] = "auto"
    search_mode: Literal["top", "all", "focused"] = "top"
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    extraction_type: Literal["claims", "action_items", "people", "appearances", "objections", "chapters", "visual_events"] | None = None
    comparison_video_ids: list[str] = Field(default_factory=list, max_length=10)
    focus_video_id: str | None = None
    focus_start_time: float | None = Field(default=None, ge=0)
    focus_end_time: float | None = Field(default=None, ge=0)
    focus_window_seconds: float | None = Field(default=None, gt=0, le=120)


class ChatCitation(BaseModel):
    segment_id: str | None = None
    video_id: str
    filename: str
    source_uri: str
    start_time: float
    end_time: float
    text: str = ""
    similarity_score: float | None = None
    visual_verified: bool = False
    verification_status: Literal["verified", "possible", "rejected"] = "verified"
    modality: Literal["visual", "transcript", "hybrid"] = "transcript"
    confidence: float = Field(0.0, ge=0, le=1)
    match_reason: str = ""


class ChatMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=3000)
    edit_message_id: str | None = None
    results: int = Field(8, ge=1, le=100)
    provider: str = "vivadeo-auto"
    custom_base_url: str | None = None
    custom_api_key: str | None = None
    custom_model: str | None = None
    video_id: str | None = None
    video_ids: list[str] = Field(default_factory=list)
    parent_search_run_id: str | None = None
    modality: Literal["auto", "visual", "transcript", "hybrid"] = "auto"
    search_mode: Literal["top", "all", "focused"] = "top"
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    extraction_type: Literal["claims", "action_items", "people", "appearances", "objections", "chapters", "visual_events"] | None = None
    comparison_video_ids: list[str] = Field(default_factory=list, max_length=10)
    focus_video_id: str | None = None
    focus_start_time: float | None = Field(default=None, ge=0)
    focus_end_time: float | None = Field(default=None, ge=0)
    focus_window_seconds: float | None = Field(default=None, gt=0, le=120)


class ChatExtractionRow(BaseModel):
    item: str
    source: str
    video_id: str
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)
    confidence: float = Field(0.0, ge=0, le=1)
    verification_status: Literal["verified", "possible"] = "verified"
    evidence_key: str


class ChatComparisonClaim(BaseModel):
    claim: str
    confidence: float = Field(0.0, ge=0, le=1)
    left_citations: list[ChatCitation] = Field(default_factory=list)
    right_citations: list[ChatCitation] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    citations: list[ChatCitation]
    thread_id: str | None = None
    title: str | None = None
    search_run_id: str | None = None
    intent: dict = Field(default_factory=dict)
    search_complete: bool = True
    verification_summary: dict = Field(default_factory=dict)
    suggested_refinements: list[str] = Field(default_factory=list)
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    rows: list[ChatExtractionRow] = Field(default_factory=list)
    comparison: list[ChatComparisonClaim] = Field(default_factory=list)


class ChatEvidenceFeedbackRequest(BaseModel):
    video_id: str
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., ge=0)
    feedback: Literal["relevant", "not_relevant", "too_early", "too_late", "wrong_modality", "missing_context"]
    correction: str | None = Field(default=None, max_length=500)


class ChatSearchRunResponse(BaseModel):
    id: str
    query: str
    modality: Literal["visual", "transcript", "hybrid"]
    search_mode: Literal["top", "all", "focused"]
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    status: str
    stage: str = "complete"
    progress: float = Field(1.0, ge=0, le=1)
    search_complete: bool
    verification_summary: dict = Field(default_factory=dict)
    rows: list[ChatExtractionRow] = Field(default_factory=list)
    comparison: list[ChatComparisonClaim] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    feedback: list[dict] = Field(default_factory=list)


class SavedSearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    query: str = Field(..., min_length=1, max_length=3000)
    modality: Literal["auto", "visual", "transcript", "hybrid"] = "auto"
    search_mode: Literal["top", "all", "focused"] = "top"
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    extraction_type: Literal["claims", "action_items", "people", "appearances", "objections", "chapters", "visual_events"] | None = None
    video_ids: list[str] = Field(default_factory=list, max_length=10)


class SavedSearchUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    archived: bool | None = None


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: str
    modality: str
    search_mode: str
    output_format: str
    extraction_type: str | None = None
    video_ids: list[str] = Field(default_factory=list)
    archived: bool
    last_run_id: str | None = None
    created_at: datetime
    updated_at: datetime


class EvidenceFrameRequest(BaseModel):
    timestamp: float = Field(..., ge=0)


class EvidenceFrameResponse(BaseModel):
    id: str
    video_id: str
    timestamp: float
    status: str
    url: str | None = None
    job_id: str | None = None
    error: str | None = None


class ChatMessageAttachmentRequest(BaseModel):
    video_ids: list[str] = Field(default_factory=list, min_length=1)


class ChatMessageVideoResponse(BaseModel):
    video_id: str
    filename: str
    status: str
    duration: float | None = None
    created_at: datetime


class ChatThreadMessageResponse(BaseModel):
    id: str
    parent_id: str | None = None
    role: str
    content: str
    citations: list[ChatCitation] = Field(default_factory=list)
    attachments: list[ChatMessageVideoResponse] = Field(default_factory=list)
    status: str = "completed"
    error: str | None = None
    search_run_id: str | None = None
    intent: dict = Field(default_factory=dict)
    verification_summary: dict = Field(default_factory=dict)
    suggested_refinements: list[str] = Field(default_factory=list)
    output_format: Literal["answer", "rows", "comparison"] = "answer"
    rows: list[ChatExtractionRow] = Field(default_factory=list)
    comparison: list[ChatComparisonClaim] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ChatThreadResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    current_message_id: str | None = None
    pinned: bool = False
    archived: bool = False
    read: bool = True
    messages: list[ChatThreadMessageResponse] = Field(default_factory=list)
    sources: list[ChatThreadSourceResponse] = Field(default_factory=list)


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
