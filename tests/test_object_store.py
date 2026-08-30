from io import BytesIO
from types import SimpleNamespace

import pytest

import vivadeo.object_store as object_store


def _azure_store(monkeypatch):
    data = {}
    content_types = {}
    calls = {}

    class Downloader:
        def __init__(self, value):
            self.value = value

        def chunks(self):
            return iter([self.value])

        def readinto(self, target):
            return target.write(self.value)

    class Blob:
        def __init__(self, key):
            self.key = key

        def get_blob_properties(self):
            return SimpleNamespace(
                size=len(data[self.key]),
                content_settings=SimpleNamespace(content_type=content_types[self.key]),
            )

        def download_blob(self, offset=None, length=None):
            calls.update(key=self.key, offset=offset, length=length)
            value = data[self.key]
            return Downloader(value[offset:offset + length] if offset is not None else value)

    class Container:
        def create_container(self):
            calls["created"] = True

        def upload_blob(self, key, source, overwrite, content_settings, **kwargs):
            data[key] = source.read()
            content_types[key] = content_settings.content_type

        def download_blob(self, key):
            return Downloader(data[key])

        def get_blob_client(self, key):
            return Blob(key)

        def delete_blob(self, key, **kwargs):
            del data[key]

    class Service:
        def get_container_client(self, name):
            calls["container"] = name
            return Container()

    monkeypatch.setattr(
        object_store.BlobServiceClient,
        "from_connection_string",
        lambda value, **kwargs: Service(),
    )
    settings = SimpleNamespace(
        storage_backend="azure",
        storage_public_endpoint_url="http://localhost/media",
        azure_storage_connection_string="private",
        azure_storage_container="vivadeo",
        azure_storage_timeout=300,
    )
    return object_store.ObjectStore(settings), data, content_types, calls


def test_azure_object_range_uses_blob_offsets(monkeypatch):
    store, data, content_types, calls = _azure_store(monkeypatch)
    data["video.mp4"] = b"0123456789"
    content_types["video.mp4"] = "video/mp4"

    response = store.get_object("video.mp4", "bytes=-4")

    assert calls == {"container": "vivadeo", "key": "video.mp4", "offset": 6, "length": 4}
    assert response["ContentRange"] == "bytes 6-9/10"
    assert response["ContentLength"] == 4
    assert b"".join(response["Body"]) == b"6789"


def test_azure_object_lifecycle(monkeypatch, tmp_path):
    store, data, _, _ = _azure_store(monkeypatch)
    source = tmp_path / "source.mp4"
    source.write_bytes(b"video")

    store.upload_file(source, "source.mp4")
    store.upload_fileobj(BytesIO(b"frame"), "frame.jpg", filename="frame.jpg")
    assert store.object_size("source.mp4") == 5
    assert store.get_object("source.mp4")["ContentRange"] is None

    target = tmp_path / "download.mp4"
    store.download_file("source.mp4", target)
    assert target.read_bytes() == b"video"
    assert data["frame.jpg"] == b"frame"

    store.delete_object("source.mp4")
    assert "source.mp4" not in data


@pytest.mark.parametrize(("value", "total"), [("bytes=-0", 10), ("bytes=0-0", 0)])
def test_empty_ranges_are_unsatisfiable(value, total):
    with pytest.raises(object_store.UnsatisfiableRange) as raised:
        object_store._byte_range(value, total)

    assert raised.value.total == total


def test_s3_get_object_contract(monkeypatch):
    calls = {}

    class Client:
        def get_object(self, **kwargs):
            calls.update(kwargs)
            return {"Body": BytesIO(b"s3")}

    monkeypatch.setattr(object_store.boto3, "client", lambda *args, **kwargs: Client())
    settings = SimpleNamespace(
        storage_backend="s3",
        storage_public_endpoint_url="http://localhost/media",
        s3_bucket="vivadeo",
        s3_endpoint_url="https://s3.example",
        s3_access_key_id="key",
        s3_secret_access_key="secret",
        s3_region="region",
    )

    response = object_store.ObjectStore(settings).get_object("video.mp4", "bytes=0-2")

    assert calls == {"Bucket": "vivadeo", "Key": "video.mp4", "Range": "bytes=0-2"}
    assert response["Body"].read() == b"s3"
