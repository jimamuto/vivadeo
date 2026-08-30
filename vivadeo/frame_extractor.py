"""Exact timestamp frame extraction with ffmpeg."""

import os
import subprocess

from .chunker import _get_ffmpeg_executable


def extract_frame(source_file: str, timestamp: float, output_path: str) -> str:
    """Write one JPEG frame from *source_file* at *timestamp* seconds."""
    if timestamp < 0:
        raise ValueError("timestamp must be non-negative")
    output_dir = os.path.dirname(output_path) or "."
    os.makedirs(output_dir, exist_ok=True)
    result = subprocess.run(
        [
            _get_ffmpeg_executable(),
            "-y",
            "-ss", f"{timestamp:.3f}",
            "-i", source_file,
            "-frames:v", "1",
            "-q:v", "2",
            output_path,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError(f"Failed to extract frame at {timestamp:.3f}s: {result.stderr[-1000:]}")
    return output_path
