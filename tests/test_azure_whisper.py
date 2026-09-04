from pathlib import Path
from types import SimpleNamespace

import pytest

from vivadeo import azure_whisper
from vivadeo.azure_whisper import AzureWhisperError, AzureWhisperTranscriber


def _client(**overrides):
    values = {
        "endpoint": "https://example.openai.azure.com/",
        "api_key": "secret",
        "deployment": "whisper prod",
    }
    values.update(overrides)
    return AzureWhisperTranscriber(**values)


def test_requires_azure_configuration():
    with pytest.raises(AzureWhisperError, match="AZURE_OPENAI_ENDPOINT.*AZURE_OPENAI_API_KEY"):
        AzureWhisperTranscriber(None, None, "whisper")


def test_transcribe_normalizes_and_offsets_segments(monkeypatch, tmp_path):
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"audio")
    client = _client()
    monkeypatch.setattr(client, "_prepare_audio_chunks", lambda _path, _dir: [(audio, 1800.0)])
    calls = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"segments": [{"start": 1.25, "end": 2.5, "text": " hello "}]}

    def post(url, **kwargs):
        calls.update(url=url, **kwargs)
        return Response()

    monkeypatch.setattr(azure_whisper.httpx, "post", post)

    assert client.transcribe("video.mp4") == [
        {"start_time": 1801.25, "end_time": 1802.5, "text": "hello"}
    ]
    assert "/whisper%20prod/audio/transcriptions?api-version=2024-10-21" in calls["url"]
    assert calls["headers"] == {"api-key": "secret"}
    assert calls["data"] == {"response_format": "verbose_json"}


def test_prepare_audio_chunks_covers_partial_final_chunk(monkeypatch, tmp_path):
    source = tmp_path / "video.mp4"
    source.write_bytes(b"video")
    commands = []
    monkeypatch.setattr(azure_whisper, "_get_video_duration", lambda _path: 1800.1)
    monkeypatch.setattr(azure_whisper, "_get_ffmpeg_executable", lambda: "ffmpeg")

    def run(command, **_kwargs):
        commands.append(command)
        Path(command[-1]).write_bytes(b"audio")
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr(azure_whisper.subprocess, "run", run)
    (tmp_path / "output").mkdir()

    chunks = _client()._prepare_audio_chunks(str(source), str(tmp_path / "output"))

    assert [offset for _path, offset in chunks] == [0.0, 1800.0]
    assert [command[command.index("-ss") + 1] for command in commands] == ["0", "1800"]


def test_rejects_invalid_azure_payload(monkeypatch, tmp_path):
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"audio")
    client = _client()
    monkeypatch.setattr(client, "_prepare_audio_chunks", lambda _path, _dir: [(audio, 0.0)])

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"text": "missing segments"}

    monkeypatch.setattr(azure_whisper.httpx, "post", lambda *_args, **_kwargs: Response())

    with pytest.raises(AzureWhisperError, match="invalid transcript payload"):
        client.transcribe("video.mp4")
