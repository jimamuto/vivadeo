"""Media streaming helpers for browser delivery."""

from __future__ import annotations

from fastapi import HTTPException, status
from starlette.responses import StreamingResponse

from .object_store import ObjectStore


def stream_object(object_key: str, content_type: str | None = None) -> StreamingResponse:
    store = ObjectStore()
    try:
        response = store.client.get_object(Bucket=store.bucket, Key=object_key)
    except Exception as exc:  # pragma: no cover - thin transport wrapper
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found") from exc

    headers = {}
    if content_type:
        headers["Content-Type"] = content_type
    elif response.get("ContentType"):
        headers["Content-Type"] = response["ContentType"]

    return StreamingResponse(
        response["Body"],
        status_code=status.HTTP_200_OK,
        media_type=headers.get("Content-Type") or "application/octet-stream",
        headers=headers,
    )
