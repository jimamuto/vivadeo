"""Modal remote-function client for faster-whisper transcription."""

import time
from pathlib import Path
from typing import Any

import modal


class ModalWhisperError(RuntimeError):
    """Raised when Modal faster-whisper transcription fails."""


class ModalWhisperTranscriber:
    """Calls a deployed Modal function with video/audio bytes.

    Expected remote function signature:
        transcribe(media_bytes: bytes, filename: str) -> list[dict]

    Each segment dict should include start, end, and text.
    """

    def __init__(self, app_name: str, function_name: str, timeout: int = 900):
        self._app_name = app_name
        self._function_name = function_name
        self._timeout = timeout
        self._remote = None

    def _get_remote(self):
        if self._remote is not None:
            return self._remote
        try:
            self._remote = modal.Function.from_name(self._app_name, self._function_name)
            return self._remote
        except Exception as exc:
            raise ModalWhisperError(
                "Could not connect to Modal faster-whisper remote function. "
                f"Expected {self._app_name}.{self._function_name}."
            ) from exc

    @staticmethod
    def _read_file(path: str) -> tuple[bytes, str]:
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return file_path.read_bytes(), file_path.name

    @staticmethod
    def _normalize_segments(payload: Any) -> list[dict]:
        raw_segments = payload.get("segments", payload) if isinstance(payload, dict) else payload
        if not isinstance(raw_segments, list):
            raise ModalWhisperError("Modal faster-whisper returned invalid transcript payload.")
        segments: list[dict] = []
        for item in raw_segments:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or "").strip()
            if not text:
                continue
            start = float(item.get("start", item.get("start_time", 0.0)) or 0.0)
            end = float(item.get("end", item.get("end_time", start)) or start)
            if end < start:
                end = start
            segments.append({"start_time": start, "end_time": end, "text": text})
        return segments

    def transcribe(self, path: str, verbose: bool = False) -> list[dict]:
        data, filename = self._read_file(path)
        remote = self._get_remote()
        t0 = time.monotonic()
        try:
            payload = remote.remote(data, filename)
        except Exception as exc:
            raise ModalWhisperError(f"Modal faster-whisper remote function failed: {exc}") from exc
        segments = self._normalize_segments(payload)
        if verbose:
            elapsed = time.monotonic() - t0
            print(f"  [verbose] modal faster-whisper: segments={len(segments)}, time={elapsed:.2f}s")
        return segments
