import json
import pytest

from vivadeo.llm import OpenAICompatibleChat, OpenAICompatibleError, validate_base_url


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
