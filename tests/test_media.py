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
    assert response.headers["cache-control"] == "private, max-age=86400"


def test_stream_object_caches_immutable_images_privately(monkeypatch):
    class Store:
        def get_object(self, key, range_header):
            return {
                "Body": BytesIO(b"image"),
                "ContentLength": 5,
                "ContentRange": None,
                "ContentType": "image/jpeg",
            }

    monkeypatch.setattr(media, "ObjectStore", Store)

    response = media.stream_object("frame.jpg")

    assert response.headers["cache-control"] == "private, max-age=604800, immutable"


def test_stream_object_accepts_explicit_edge_cache_policy(monkeypatch):
    class Store:
        def get_object(self, key, range_header):
            return {
                "Body": BytesIO(b"preview"),
                "ContentLength": 7,
                "ContentRange": "bytes 0-6/7",
                "ContentType": "video/mp4",
            }

    monkeypatch.setattr(media, "ObjectStore", Store)

    response = media.stream_object(
        "video-previews/video-1.mp4",
        range_header="bytes=0-6",
        cache_control="public, max-age=60, s-maxage=240, immutable",
    )

    assert response.status_code == 206
    assert response.headers["cache-control"] == "public, max-age=60, s-maxage=240, immutable"


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
