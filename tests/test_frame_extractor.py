from pathlib import Path

import pytest

import vivadeo.frame_extractor as frame_extractor


def test_extract_frame_writes_timestamped_jpeg(monkeypatch, tmp_path):
    output = tmp_path / "frame.jpg"
    calls = {}

    def fake_run(command, **kwargs):
        calls["command"] = command
        Path(command[-1]).write_bytes(b"jpeg")
        return type("Result", (), {"returncode": 0, "stderr": ""})()

    monkeypatch.setattr(frame_extractor, "_get_ffmpeg_executable", lambda: "ffmpeg")
    monkeypatch.setattr(frame_extractor.subprocess, "run", fake_run)

    assert frame_extractor.extract_frame("source.mp4", 12.3456, str(output)) == str(output)
    assert output.read_bytes() == b"jpeg"
    assert calls["command"] == ["ffmpeg", "-y", "-ss", "12.346", "-i", "source.mp4", "-frames:v", "1", "-q:v", "2", str(output)]


def test_extract_frame_rejects_negative_timestamp(tmp_path):
    with pytest.raises(ValueError, match="non-negative"):
        frame_extractor.extract_frame("source.mp4", -1, str(tmp_path / "frame.jpg"))
