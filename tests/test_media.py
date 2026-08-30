from io import BytesIO

import pytest
from fastapi import HTTPException

import vivadeo.media as media


def test_stream_object_forwards_browser_byte_range(monkeypatch):
    calls = {}

    class Store:
        def get_object(self, key, range_header):
            calls.update(key=key, range_header=range_header)
            return {
                "Body": BytesIO(b"video"),
                "ContentLength": 100,
                "ContentRange": "bytes 100-199/1000",
                "ContentType": "video/mp4",
            }

    monkeypatch.setattr(media, "ObjectStore", Store)

    response = media.stream_object("source.mp4", range_header="bytes=100-199")

    assert calls == {"key": "source.mp4", "range_header": "bytes=100-199"}
    assert response.status_code == 206
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-range"] == "bytes 100-199/1000"
    assert response.headers["content-length"] == "100"


def test_stream_object_rejects_unsatisfiable_range(monkeypatch):
    class Store:
        def get_object(self, key, range_header):
            raise media.UnsatisfiableRange(10)

    monkeypatch.setattr(media, "ObjectStore", Store)

    with pytest.raises(HTTPException) as raised:
        media.stream_object("source.mp4", range_header="bytes=10-10")

    assert raised.value.status_code == 416
    assert raised.value.headers == {"Accept-Ranges": "bytes", "Content-Range": "bytes */10"}


def test_stream_object_rejects_malformed_range(monkeypatch):
    class Store:
        def object_size(self, key):
            return 10

    monkeypatch.setattr(media, "ObjectStore", Store)

    with pytest.raises(HTTPException) as raised:
        media.stream_object("source.mp4", range_header="not-a-range")

    assert raised.value.status_code == 416
    assert raised.value.headers["Content-Range"] == "bytes */10"


def test_stream_object_handles_provider_response_objects(monkeypatch):
    class ProviderError(Exception):
        error_code = "BlobNotFound"
        response = object()

    class Store:
        def get_object(self, key, range_header):
            raise ProviderError()

    monkeypatch.setattr(media, "ObjectStore", Store)

    with pytest.raises(HTTPException) as raised:
        media.stream_object("missing.mp4")

    assert raised.value.status_code == 404
