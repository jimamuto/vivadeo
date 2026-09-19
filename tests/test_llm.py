import json
from email.message import Message
from io import BytesIO
from urllib.error import HTTPError

import pytest

import vivadeo.llm as llm
from vivadeo.llm import FailoverChat, OpenAICompatibleChat, OpenAICompatibleError, list_ollama_models, validate_base_url


@pytest.fixture(autouse=True)
def resolve_example_provider(monkeypatch):
    original = __import__("socket").getaddrinfo

    def resolve(host, port, *args, **kwargs):
        if host == "api.example.com":
            return [(2, 1, 6, "", ("93.184.216.34", port))]
        return original(host, port, *args, **kwargs)

    monkeypatch.setattr("vivadeo.llm.socket.getaddrinfo", resolve)


class _Response:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


def test_validate_base_url_requires_secure_remote_endpoint():
    assert validate_base_url("https://api.example.com/v1") == "https://api.example.com/v1"
    with pytest.raises(OpenAICompatibleError):
        validate_base_url("http://api.example.com/v1")
    with pytest.raises(OpenAICompatibleError):
        validate_base_url("http://localhost:11434")


@pytest.mark.parametrize("url", [
    "https://127.0.0.1/v1",
    "https://10.0.0.1/v1",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/v1",
])
def test_validate_base_url_rejects_non_public_addresses(url):
    with pytest.raises(OpenAICompatibleError):
        validate_base_url(url)


def test_ollama_models_are_discovered_through_the_docker_host(monkeypatch):
    captured = {}

    def respond(request, timeout):
        captured["url"] = request.full_url
        return _Response({"models": [{"name": "qwen3:8b"}, {"name": "gemma3:4b"}]})

    monkeypatch.setattr("vivadeo.llm.Path.exists", lambda _path: True)
    monkeypatch.setattr("vivadeo.llm.urlopen", respond)

    assert list_ollama_models("http://localhost:11434") == ["gemma3:4b", "qwen3:8b"]
    assert captured["url"] == "http://host.docker.internal:11434/api/tags"


def test_openai_compatible_chat_normalizes_answer(monkeypatch):
    captured = {}

    def respond(request, timeout):
        captured.update(json.loads(request.data))
        return _Response({"choices": [{"message": {"content": " grounded answer "}}]})

    monkeypatch.setattr("vivadeo.llm.urlopen", respond)

    answer = OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="test-model",
    ).answer([{"role": "user", "content": "Question"}], [{"filename": "clip.mp4", "start_time": 1, "end_time": 2, "text": "Evidence"}])

    assert answer == "grounded answer"
    assert "temperature" not in captured


def test_openai_compatible_chat_knows_vivadeo_without_video_evidence(monkeypatch):
    captured = {}

    def respond(request, timeout):
        captured.update(json.loads(request.data))
        return _Response({"choices": [{"message": {"content": "Vivadeo helps teams search their video archive."}}]})

    monkeypatch.setattr("vivadeo.llm.urlopen", respond)

    OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="test-model",
    ).answer([{"role": "user", "content": "What is Vivadeo?"}], [])

    system_prompt = captured["messages"][0]["content"]
    assert "video archive and search product" in system_prompt
    assert "never confuse Vivadeo with VivaVideo" in system_prompt


def test_openai_compatible_chat_retries_transient_http_errors(monkeypatch):
    attempts = []

    def respond(request, timeout):
        attempts.append(request.full_url)
        if len(attempts) < 3:
            raise HTTPError(request.full_url, 429, "Too Many Requests", {}, BytesIO(b""))
        return _Response({"choices": [{"message": {"content": "recovered answer"}}]})

    monkeypatch.setattr("vivadeo.llm.urlopen", respond)
    monkeypatch.setattr("vivadeo.llm.time.sleep", lambda _seconds: None)

    answer = OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="test-model",
    ).answer([{"role": "user", "content": "Question"}], [])

    assert answer == "recovered answer"
    assert len(attempts) == 3


def test_openai_compatible_chat_honors_retry_after(monkeypatch):
    attempts = []
    delays = []
    headers = Message()
    headers["Retry-After"] = "7"

    def respond(request, timeout):
        attempts.append(request.full_url)
        if len(attempts) == 1:
            raise HTTPError(request.full_url, 429, "Too Many Requests", headers, BytesIO(b""))
        return _Response({"choices": [{"message": {"content": "recovered after provider delay"}}]})

    monkeypatch.setattr("vivadeo.llm.urlopen", respond)
    monkeypatch.setattr("vivadeo.llm.time.sleep", delays.append)

    answer = OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="test-model",
    ).answer([{"role": "user", "content": "Question"}], [])

    assert answer == "recovered after provider delay"
    assert delays == [7.0]


def test_visual_verifier_uses_completion_token_parameter_for_gpt5(monkeypatch, tmp_path):
    frame = tmp_path / "frame.jpg"
    frame.write_bytes(b"jpeg")
    captured = {}

    def respond(request, timeout):
        captured.update(json.loads(request.data))
        return _Response({"choices": [{"message": {"content": '{"candidates":[{"index":1,"relevant":true}]}'}}]})

    monkeypatch.setattr("vivadeo.llm.urlopen", respond)
    result = OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="gpt-5.6-luna",
    ).verify_visual_candidates("What is happening?", [{"path": str(frame), "timestamp": 1.0}])

    assert result[0]["relevant"] is True
    assert captured["max_completion_tokens"] == 512
    assert "max_tokens" not in captured
    assert "temperature" not in captured


def test_visual_verifier_caches_by_model_question_and_frame_hash(monkeypatch, tmp_path):
    frame = tmp_path / "frame.jpg"
    frame.write_bytes(b"jpeg")
    calls = []

    def respond(request, timeout):
        calls.append(request)
        return _Response({"choices": [{"message": {"content": '{"candidates":[{"index":1,"relevant":true,"confidence":0.9}]}'}}]})

    llm._visual_verification_cache.clear()
    monkeypatch.setattr("vivadeo.llm.urlopen", respond)
    verifier = OpenAICompatibleChat(
        base_url="https://api.example.com/v1",
        api_key="secret",
        model="vision-model",
    )
    candidates = [{"path": str(frame), "timestamp": 1.0}]

    assert verifier.verify_visual_candidates("What is visible?", candidates)[0]["confidence"] == 0.9
    assert verifier.verify_visual_candidates("What is visible?", candidates)[0]["confidence"] == 0.9
    assert len(calls) == 1


def test_failover_chat_uses_secondary_after_primary_error():
    class FailingChat:
        def answer(self, messages, context, on_delta=None):
            raise OpenAICompatibleError("primary failed", reason="rate_limited")

    class WorkingChat:
        def answer(self, messages, context, on_delta=None):
            return "secondary answer"

    assert FailoverChat(FailingChat(), WorkingChat()).answer([], []) == "secondary answer"
