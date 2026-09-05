from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from vivadeo import worker
from vivadeo.llm import OpenAICompatibleError, _read_answer_stream


@pytest.mark.parametrize("visual", [False, True])
def test_preparation_only_runs_required_stages(monkeypatch, visual):
    calls = []
    video = SimpleNamespace(transcript_status="pending", visual_status="pending")
    job = SimpleNamespace(payload={"transcribe": True, "prepare_visual": visual})

    @contextmanager
    def scope():
        yield SimpleNamespace(get=lambda model, _: job if model is worker.Job else video)

    monkeypatch.setattr(worker, "session_scope", scope)
    monkeypatch.setattr(worker, "_raise_if_canceled", lambda _: None)
    monkeypatch.setattr(worker, "_mark_video", lambda *a, **kw: calls.append(kw))
    monkeypatch.setattr(worker, "_transcribe_file", lambda *a: calls.append("transcript"))
    monkeypatch.setattr(worker, "_index_file", lambda *a: calls.append("visual"))
    worker._prepare_file("v", "org", "file", "job")
    assert "transcript" in calls
    assert ("visual" in calls) is visual


def test_durable_stream_stops_before_publishing_when_canceled(monkeypatch):
    job = SimpleNamespace(status="canceled", payload={})

    @contextmanager
    def scope():
        yield SimpleNamespace(scalar=lambda _: job)

    published = []
    monkeypatch.setattr(worker, "session_scope", scope)
    monkeypatch.setattr(worker.progress_bus, "publish", lambda *args: published.append(args))
    with pytest.raises(worker.JobCanceled):
        worker._stream_chat_answer("job", "late token")
    assert published == []


def test_stream_emits_before_completion_and_rejects_truncation():
    deltas = []

    def events():
        yield b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n'
        assert deltas == ["Hello"]
        yield b'data: {"choices":[{"delta":{"content":" world"}}]}\n'
        yield b'data: [DONE]\n'

    assert _read_answer_stream(events(), deltas.append, "openai") == "Hello world"
    with pytest.raises(OpenAICompatibleError, match="disconnected"):
        _read_answer_stream(iter([b'data: {"choices":[{"delta":{"content":"Partial"}}]}\n']), lambda _: None, "openai")


@pytest.mark.parametrize("protocol,events", [
    ("ollama", [b'{"message":{"content":"Hi"},"done":false}\n', b'{"done":true}\n']),
    ("anthropic", [b'data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n', b'data: {"type":"message_stop"}\n']),
])
def test_stream_protocols(protocol, events):
    deltas = []
    assert _read_answer_stream(iter(events), deltas.append, protocol) == "Hi"
    assert deltas == ["Hi"]
