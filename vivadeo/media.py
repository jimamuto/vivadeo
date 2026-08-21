"""Media streaming helpers for browser delivery."""

from __future__ import annotations

import re

from fastapi import HTTPException, status
from starlette.responses import StreamingResponse

from .object_store import ObjectStore


def stream_object(
    object_key: str,
    content_type: str | None = None,
    range_header: str | None = None,
) -> StreamingResponse:
    store = ObjectStore()
    try:
        request_args = {"Bucket": store.bucket, "Key": object_key}
        if range_header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
            if match and (match.group(1) or match.group(2)):
                start, end = match.groups()
                request_args["Range"] = f"bytes={start}-{end}"
        response = store.client.get_object(**request_args)
    except Exception as exc:  # pragma: no cover - thin transport wrapper
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found") from exc

    headers = {"Accept-Ranges": "bytes"}
    if content_type:
        headers["Content-Type"] = content_type
    elif response.get("ContentType"):
        headers["Content-Type"] = response["ContentType"]
    if response.get("ContentLength") is not None:
        headers["Content-Length"] = str(response["ContentLength"])
    if response.get("ContentRange"):
        headers["Content-Range"] = response["ContentRange"]

    return StreamingResponse(
        response["Body"],
        status_code=status.HTTP_206_PARTIAL_CONTENT if response.get("ContentRange") else status.HTTP_200_OK,
        media_type=headers.get("Content-Type") or "application/octet-stream",
        headers=headers,
    )
