"""Azure OpenAI Whisper transcription client."""

import math
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from .chunker import _get_ffmpeg_executable, _get_video_duration

_CHUNK_SECONDS = 30 * 60


class AzureWhisperError(RuntimeError):
    """Raised when Azure Whisper transcription fails."""


class AzureWhisperTranscriber:
    def __init__(
        self,
        endpoint: str | None,
        api_key: str | None,
        deployment: str | None,
        api_version: str = "2024-10-21",
        timeout: int = 900,
    ):
        missing = [
            name
            for name, value in {
                "AZURE_OPENAI_ENDPOINT": endpoint,
                "AZURE_OPENAI_API_KEY": api_key,
                "AZURE_OPENAI_WHISPER_DEPLOYMENT": deployment,
            }.items()
            if not value
        ]
        if missing:
            raise AzureWhisperError(f"Missing Azure Whisper configuration: {', '.join(missing)}")
        self._url = (
            f"{endpoint.rstrip('/')}/openai/deployments/{quote(deployment, safe='')}/audio/transcriptions"
            f"?api-version={quote(api_version, safe='')}"
        )
        self._api_key = api_key
        self._timeout = timeout

    @staticmethod
    def _normalize_segments(payload: Any, offset: float = 0.0) -> list[dict]:
        raw_segments = payload.get("segments") if isinstance(payload, dict) else None
        if not isinstance(raw_segments, list):
            raise AzureWhisperError("Azure Whisper returned an invalid transcript payload.")
        segments: list[dict] = []
        for item in raw_segments:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or "").strip()
            if not text:
                continue
            start = max(0.0, float(item.get("start", 0.0) or 0.0)) + offset
            end = max(start, float(item.get("end", start - offset) or 0.0) + offset)
            segments.append({"start_time": start, "end_time": end, "text": text})
        return segments

    @staticmethod
    def _prepare_audio_chunks(path: str, output_dir: str) -> list[tuple[Path, float]]:
        source = Path(path)
        if not source.is_file():
            raise FileNotFoundError(f"File not found: {path}")
        duration = _get_video_duration(path)
        chunks: list[tuple[Path, float]] = []
        for index, offset in enumerate(range(0, max(1, math.ceil(duration)), _CHUNK_SECONDS)):
            output = Path(output_dir) / f"audio-{index:04d}.mp3"
            result = subprocess.run(
                [
                    _get_ffmpeg_executable(),
                    "-y",
                    "-ss",
                    str(offset),
                    "-i",
                    path,
                    "-t",
                    str(_CHUNK_SECONDS),
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-b:a",
                    "48k",
                    str(output),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0 or not output.is_file() or output.stat().st_size == 0:
                raise AzureWhisperError(f"Could not prepare audio for transcription: {result.stderr[-1000:].strip()}")
            chunks.append((output, float(offset)))
        return chunks

    def transcribe(self, path: str, verbose: bool = False) -> list[dict]:
        started = time.monotonic()
        segments: list[dict] = []
        with tempfile.TemporaryDirectory(prefix="vivadeo-whisper-") as output_dir:
            for audio_path, offset in self._prepare_audio_chunks(path, output_dir):
                try:
                    with audio_path.open("rb") as audio:
                        response = httpx.post(
                            self._url,
                            headers={"api-key": self._api_key},
                            files={"file": (audio_path.name, audio, "audio/mpeg")},
                            data={"response_format": "verbose_json"},
                            timeout=self._timeout,
                        )
                    response.raise_for_status()
                    payload = response.json()
                except (httpx.HTTPError, ValueError) as exc:
                    raise AzureWhisperError(f"Azure Whisper transcription failed: {exc}") from exc
                segments.extend(self._normalize_segments(payload, offset))
        if verbose:
            print(f"  [verbose] azure whisper: segments={len(segments)}, time={time.monotonic() - started:.2f}s")
        return segments
