"""Media streaming helpers for browser delivery."""

from __future__ import annotations

import re

from fastapi import HTTPException, status
from starlette.responses import StreamingResponse

from .object_store import ObjectStore, UnsatisfiableRange


def stream_object(
    object_key: str,
    content_type: str | None = None,
    range_header: str | None = None,
) -> StreamingResponse:
    store = ObjectStore()
    try:
        normalized_range = None
        if range_header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
            if not match or not (match.group(1) or match.group(2)):
                raise UnsatisfiableRange(store.object_size(object_key))
            start, end = match.groups()
            normalized_range = f"bytes={start}-{end}"
        response = store.get_object(object_key, normalized_range)
    except UnsatisfiableRange as exc:
        raise HTTPException(
            status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail="Requested range is outside the media object",
            headers={"Accept-Ranges": "bytes", "Content-Range": f"bytes */{exc.total}"},
        ) from exc
    except Exception as exc:  # pragma: no cover - thin transport wrapper
        error_response = getattr(exc, "response", None)
        error_code = (
            error_response.get("Error", {}).get("Code")
            if isinstance(error_response, dict)
            else getattr(exc, "error_code", None)
        )
        if error_code in {"InvalidRange", "RequestedRangeNotSatisfiable"}:
            total = store.object_size(object_key)
            raise HTTPException(
                status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
                detail="Requested range is outside the media object",
                headers={"Accept-Ranges": "bytes", "Content-Range": f"bytes */{total}"},
            ) from exc
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
