from io import BytesIO

import vivadeo.media as media


def test_stream_object_forwards_browser_byte_range(monkeypatch):
    calls = {}

    class Client:
        def get_object(self, **kwargs):
            calls.update(kwargs)
            return {
                "Body": BytesIO(b"video"),
                "ContentLength": 100,
                "ContentRange": "bytes 100-199/1000",
                "ContentType": "video/mp4",
            }

    class Store:
        bucket = "videos"
        client = Client()

    monkeypatch.setattr(media, "ObjectStore", Store)

    response = media.stream_object("source.mp4", range_header="bytes=100-199")

    assert calls == {"Bucket": "videos", "Key": "source.mp4", "Range": "bytes=100-199"}
    assert response.status_code == 206
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-range"] == "bytes 100-199/1000"
    assert response.headers["content-length"] == "100"
