import json
from io import BytesIO
from urllib.error import HTTPError

import pytest

from vivadeo.llm import OpenAICompatibleChat, OpenAICompatibleError, list_ollama_models, validate_base_url


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
    assert validate_base_url("http://localhost:11434") == "http://localhost:11434"
    with pytest.raises(OpenAICompatibleError):
        validate_base_url("http://api.example.com/v1")


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
