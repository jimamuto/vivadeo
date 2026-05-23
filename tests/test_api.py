"""Tests for the production FastAPI surface."""

from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

import vivadeo.api as api
from vivadeo.api import app


class _FakeConn:
    def execute(self, *args, **kwargs):
        return None


class _FakeBegin:
    def __enter__(self):
        return _FakeConn()

    def __exit__(self, *args):
        return False


class _FakeEngine:
    def begin(self):
        return _FakeBegin()


class _FakeObjectStore:
    def ensure_bucket(self):
        return None


def _disable_startup_io(monkeypatch):
    monkeypatch.setattr("vivadeo.api.make_engine", lambda: _FakeEngine())
    monkeypatch.setattr("vivadeo.api.ObjectStore", lambda: _FakeObjectStore())
    monkeypatch.setattr("vivadeo.api.Base.metadata.create_all", lambda bind: None)


def test_healthz_without_api_key(monkeypatch):
    _disable_startup_io(monkeypatch)
    with TestClient(app) as client:
        response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_stats_rejects_missing_api_key(monkeypatch):
    _disable_startup_io(monkeypatch)
    with TestClient(app) as client:
        response = client.get("/v1/stats")

    assert response.status_code == 401


def test_retry_failed_clip_job(monkeypatch):
    _disable_startup_io(monkeypatch)
    monkeypatch.setattr(api, "get_runtime_settings", lambda: SimpleNamespace(api_key="test-key", internal_service_key="internal", default_org_id="default-workspace"))
    now = datetime.now(timezone.utc)

    clip = SimpleNamespace(id="clip-1")
    video = SimpleNamespace(id="video-1", source_uri="/tmp/source.mp4")
    job = SimpleNamespace(
        id="job-1",
        organization_id="default-workspace",
        kind="trim_clip",
        status="failed",
        progress=0.2,
        message="Failed",
        error="boom",
        video_id="video-1",
        clip_id="clip-1",
        payload={},
        created_at=now,
        updated_at=now,
    )

    class FakeSession:
        def get(self, model, ident):
            if model.__name__ == "Job" and ident == "job-1":
                return job
            if model.__name__ == "Video" and ident == "video-1":
                return video
            if model.__name__ == "Clip" and ident == "clip-1":
                return clip
            return None

        def commit(self):
            return None

    called = {}

    monkeypatch.setattr(api.trim_clip_task, "delay", lambda *args: called.setdefault("args", args))

    response = api.retry_job("job-1", session=FakeSession(), organization_id="default-workspace")

    assert response.status == "queued"
    assert called["args"] == ("job-1", "clip-1", "default-workspace")


def test_video_response_includes_error_and_timestamps():
    now = datetime.now(timezone.utc)
    video = SimpleNamespace(
        id="video-1",
        organization_id="default-workspace",
        source_type="upload",
        source_uri="clip.mp4",
        filename="clip.mp4",
        status="failed",
        duration=12.5,
        object_key="videos/video-1/clip.mp4",
        error="decode failed",
        created_at=now,
        updated_at=now,
    )

    response = api._video_response(video)

    assert response.error == "decode failed"
    assert response.created_at == now
    assert response.updated_at == now


def test_job_response_includes_timestamps():
    now = datetime.now(timezone.utc)
    job = SimpleNamespace(
        id="job-1",
        organization_id="default-workspace",
        kind="ingest_url",
        status="queued",
        progress=0.1,
        message="Queued",
        error=None,
        video_id="video-1",
        clip_id=None,
        created_at=now,
        updated_at=now,
    )

    response = api._job_response(job)

    assert response.created_at == now
    assert response.updated_at == now


def test_video_chunk_response_includes_metadata():
    now = datetime.now(timezone.utc)
    chunk = SimpleNamespace(
        id="chunk-1",
        organization_id="default-workspace",
        video_id="video-1",
        start_time=15.0,
        end_time=45.0,
        embedding_backend="modal",
        embedding_model="Qwen/Qwen3-VL-Embedding-2B",
        chunk_metadata={"still": False, "scene": "intro"},
        created_at=now,
    )

    response = api._video_chunk_response(chunk)

    assert response.metadata == {"still": False, "scene": "intro"}
    assert response.created_at == now


def test_search_chat_answers_with_transcript_citations(monkeypatch):
    now = datetime.now(timezone.utc)
    segment = SimpleNamespace(
        id="segment-1",
        video_id="video-1",
        start_time=10.0,
        end_time=18.0,
        text="The launch timeline is next Friday.",
    )
    video = SimpleNamespace(
        id="video-1",
        filename="townhall.mp4",
        source_uri="s3://videos/townhall.mp4",
    )

    class FakeEmbedder:
        def embed_query(self, query):
            assert query == "When is launch?"
            return [0.1, 0.2]

    class FakeStore:
        def __init__(self, session):
            self.session = session

        def search(self, embedding, n_results, organization_id, video_id):
            assert embedding == [0.1, 0.2]
            assert n_results == 4
            assert organization_id == "default-workspace"
            assert video_id is None
            return [
                {
                    "video_id": "video-1",
                    "start_time": 9.0,
                    "end_time": 20.0,
                    "similarity_score": 0.87,
                }
            ]

    class FakeRows:
        def all(self):
            return [(segment, video)]

    class FakeSession:
        def execute(self, stmt):
            return FakeRows()

    class FakeGemma:
        def __init__(self, app_name, function_name, timeout):
            assert app_name == "gemma-app"
            assert function_name == "answer"

        def answer(self, messages, context):
            assert messages[-1]["content"] == "When is launch?"
            assert context[0]["text"] == "The launch timeline is next Friday."
            return "Launch is next Friday."

    monkeypatch.setattr(api, "get_embedder", lambda: FakeEmbedder())
    monkeypatch.setattr(api, "reset_embedder", lambda: None)
    monkeypatch.setattr(api, "PostgresVideoStore", FakeStore)
    monkeypatch.setattr(api, "ModalGemmaChat", FakeGemma)
    monkeypatch.setattr(api, "get_runtime_settings", lambda: SimpleNamespace(modal_gemma_app="gemma-app", modal_gemma_function="answer", modal_timeout=30))

    response = api.search_chat(
        api.ChatRequest(messages=[api.ChatMessage(role="user", content="When is launch?")], results=4),
        session=FakeSession(),
        organization_id="default-workspace",
    )

    assert response.answer == "Launch is next Friday."
    assert response.citations[0].text == "The launch timeline is next Friday."
    assert response.citations[0].similarity_score == 0.87


def test_search_by_image_returns_search_results(monkeypatch):
    _disable_startup_io(monkeypatch)
    monkeypatch.setattr(
        api,
        "get_runtime_settings",
        lambda: SimpleNamespace(
            api_key="test-key",
            internal_service_key="internal",
            default_org_id="default-workspace",
        ),
    )

    class FakeEmbedder:
        def embed_image(self, path: str):
            assert path.endswith(".png")
            return [0.25, 0.5]

    class FakeStore:
        def __init__(self, session):
            self.session = session

        def search(self, embedding, n_results, organization_id, video_id):
            assert embedding == [0.25, 0.5]
            assert n_results == 3
            assert organization_id == "default-workspace"
            assert video_id is None
            return [
                {
                    "chunk_id": "chunk-1",
                    "organization_id": "default-workspace",
                    "video_id": "video-1",
                    "filename": "clip.mp4",
                    "source_uri": "clip.mp4",
                    "object_key": "videos/video-1/clip.mp4",
                    "start_time": 10.0,
                    "end_time": 18.0,
                    "similarity_score": 0.91,
                    "distance": 0.09,
                }
            ]

    monkeypatch.setattr(api, "get_embedder", lambda: FakeEmbedder())
    monkeypatch.setattr(api, "reset_embedder", lambda: None)
    monkeypatch.setattr(api, "PostgresVideoStore", FakeStore)

    with TestClient(app) as client:
        response = client.post(
            "/v1/search/image?results=3",
            headers={"X-API-Key": "test-key"},
            files={"image": ("query.png", b"fake-image", "image/png")},
        )

    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "chunk_id": "chunk-1",
                "organization_id": "default-workspace",
                "video_id": "video-1",
                "filename": "clip.mp4",
                "source_uri": "clip.mp4",
                "start_time": 10.0,
                "end_time": 18.0,
                "similarity_score": 0.91,
            }
        ]
    }


def test_stats_includes_storage_bytes(monkeypatch):
    _disable_startup_io(monkeypatch)
    monkeypatch.setattr(
        api,
        "get_runtime_settings",
        lambda: SimpleNamespace(
            api_key="test-key",
            internal_service_key="internal",
            default_org_id="default-workspace",
        ),
    )

    class FakeStore:
        def __init__(self, session):
            self.session = session

        def stats(self, organization_id, object_store):
            assert organization_id == "default-workspace"
            assert object_store == "object-store"
            return {
                "total_videos": 4,
                "total_chunks": 22,
                "total_storage_bytes": 1048576,
            }

    class FakeObjectStore:
        def ensure_bucket(self):
            return None

        def __eq__(self, other):
            return other == "object-store"

    monkeypatch.setattr(api, "PostgresVideoStore", FakeStore)
    monkeypatch.setattr(api, "ObjectStore", FakeObjectStore)

    with TestClient(app) as client:
        response = client.get("/v1/stats", headers={"X-API-Key": "test-key"})

    assert response.status_code == 200
    assert response.json() == {
        "total_videos": 4,
        "total_chunks": 22,
        "total_storage_bytes": 1048576,
    }


def test_reindex_video_queues_upload_job(monkeypatch):
    now = datetime.now(timezone.utc)
    video = SimpleNamespace(
        id="video-1",
        organization_id="default-workspace",
        source_type="upload",
        source_uri="clip.mp4",
        object_key="videos/video-1/clip.mp4",
        filename="clip.mp4",
        status="ready",
        error=None,
        created_at=now,
        updated_at=now,
    )
    recorded = {"jobs": [], "deleted": []}

    class FakeSession:
        def get(self, model, ident):
            if model.__name__ == "Video" and ident == "video-1":
                return video
            return None

        def execute(self, stmt):
            recorded["deleted"].append(str(stmt))
            return None

        def add(self, job):
            recorded["jobs"].append(job)

        def commit(self):
            return None

    called = {}
    monkeypatch.setattr(api.ingest_uploaded_object, "delay", lambda *args: called.setdefault("args", args))

    response = api.reindex_video("video-1", session=FakeSession(), organization_id="default-workspace")

    assert response.status == "queued"
    assert recorded["jobs"][0].kind == "reindex_upload"
    assert called["args"] == (recorded["jobs"][0].id, "video-1", "default-workspace")


def test_cancel_job_marks_job_and_video_canceled():
    now = datetime.now(timezone.utc)
    video = SimpleNamespace(
        id="video-1",
        organization_id="default-workspace",
        status="indexing",
        error=None,
    )
    job = SimpleNamespace(
        id="job-1",
        organization_id="default-workspace",
        kind="ingest_uploaded_object",
        status="running",
        progress=0.5,
        message="Embedding chunk 1/4",
        error=None,
        video_id="video-1",
        clip_id=None,
        created_at=now,
        updated_at=now,
    )

    class FakeSession:
        def get(self, model, ident):
            if model.__name__ == "Job" and ident == "job-1":
                return job
            if model.__name__ == "Video" and ident == "video-1":
                return video
            return None

        def commit(self):
            return None

    response = api.cancel_job("job-1", session=FakeSession(), organization_id="default-workspace")

    assert response.status == "canceled"
    assert response.message == "Canceled by user"
    assert video.status == "canceled"
    assert video.error == "Canceled by user"


def test_retry_canceled_upload_job(monkeypatch):
    _disable_startup_io(monkeypatch)
    monkeypatch.setattr(api, "get_runtime_settings", lambda: SimpleNamespace(api_key="test-key", internal_service_key="internal", default_org_id="default-workspace"))
    now = datetime.now(timezone.utc)

    video = SimpleNamespace(id="video-1", source_uri="clip.mp4", object_key="videos/video-1/clip.mp4")
    job = SimpleNamespace(
        id="job-1",
        organization_id="default-workspace",
        kind="ingest_uploaded_object",
        status="canceled",
        progress=0.0,
        message="Canceled by user",
        error=None,
        video_id="video-1",
        clip_id=None,
        payload={},
        created_at=now,
        updated_at=now,
    )

    class FakeSession:
        def get(self, model, ident):
            if model.__name__ == "Job" and ident == "job-1":
                return job
            if model.__name__ == "Video" and ident == "video-1":
                return video
            return None

        def commit(self):
            return None

    called = {}
    monkeypatch.setattr(api.ingest_uploaded_object, "delay", lambda *args: called.setdefault("args", args))

    response = api.retry_job("job-1", session=FakeSession(), organization_id="default-workspace")

    assert response.status == "queued"
    assert response.message == "Retry queued"
    assert called["args"] == ("job-1", "video-1", "default-workspace")


def test_dead_letter_response_includes_error_window():
    now = datetime.now(timezone.utc)
    entry = SimpleNamespace(
        id="dlq-1",
        organization_id="default-workspace",
        video_id="video-1",
        chunk_id="video-1:15.0",
        source_uri="clip.mp4",
        start_time=15.0,
        end_time=45.0,
        error="embed failed",
        attempts=2,
        created_at=now,
        updated_at=now,
    )

    response = api._dead_letter_response(entry)

    assert response.chunk_id == "video-1:15.0"
    assert response.error == "embed failed"
    assert response.attempts == 2
