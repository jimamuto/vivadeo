"""Private object-storage helpers for Azure Blob and S3-compatible services."""

import mimetypes
import re
import uuid
from pathlib import Path

import boto3
from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import BlobServiceClient, ContentSettings
from botocore.client import Config

from .config import Settings, get_settings


_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


class UnsatisfiableRange(ValueError):
    def __init__(self, total: int):
        super().__init__("Requested byte range is outside the object")
        self.total = total


def _byte_range(value: str | None, total: int) -> tuple[int, int] | None:
    if not value:
        return None
    if total <= 0:
        raise UnsatisfiableRange(total)
    if not (match := _RANGE_RE.fullmatch(value.strip())):
        return None
    first, last = match.groups()
    if not first:
        length = min(int(last), total)
        if not length:
            raise UnsatisfiableRange(total)
        return total - length, total - 1
    start = int(first)
    end = min(int(last), total - 1) if last else total - 1
    if start >= total or end < start:
        raise UnsatisfiableRange(total)
    return start, end


class ObjectStore:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.backend = self.settings.storage_backend
        if self.backend == "azure":
            if not self.settings.azure_storage_connection_string:
                raise ValueError("AZURE_STORAGE_CONNECTION_STRING is required for Azure Blob storage")
            self.bucket = self.settings.azure_storage_container
            self.client = BlobServiceClient.from_connection_string(
                self.settings.azure_storage_connection_string,
                connection_timeout=self.settings.azure_storage_timeout,
                read_timeout=self.settings.azure_storage_timeout,
                max_single_put_size=4 * 1024 * 1024,
                max_block_size=4 * 1024 * 1024,
            )
            self.container = self.client.get_container_client(self.bucket)
        else:
            self.bucket = self.settings.s3_bucket
            self.client = boto3.client(
                "s3",
                endpoint_url=self.settings.s3_endpoint_url,
                aws_access_key_id=self.settings.s3_access_key_id,
                aws_secret_access_key=self.settings.s3_secret_access_key,
                region_name=self.settings.s3_region,
                config=Config(signature_version="s3v4"),
            )

    def ensure_bucket(self) -> None:
        if self.backend == "azure":
            try:
                self.container.create_container()
            except ResourceExistsError:
                pass
            return
        buckets = self.client.list_buckets().get("Buckets", [])
        if not any(bucket["Name"] == self.bucket for bucket in buckets):
            self.client.create_bucket(Bucket=self.bucket)

    def upload_file(
        self,
        path: str | Path,
        key: str,
        content_type: str | None = None,
    ) -> str:
        self.ensure_bucket()
        path = Path(path)
        media_type = content_type or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if self.backend == "azure":
            with path.open("rb") as source:
                self.container.upload_blob(
                    key,
                    source,
                    overwrite=True,
                    content_settings=ContentSettings(content_type=media_type),
                    max_concurrency=2,
                )
        else:
            self.client.upload_file(str(path), self.bucket, key, ExtraArgs={"ContentType": media_type})
        return key

    def upload_fileobj(
        self,
        fileobj,
        key: str,
        content_type: str | None = None,
        filename: str | None = None,
    ) -> str:
        self.ensure_bucket()
        media_type = content_type or mimetypes.guess_type(filename or key)[0] or "application/octet-stream"
        if self.backend == "azure":
            self.container.upload_blob(
                key,
                fileobj,
                overwrite=True,
                content_settings=ContentSettings(content_type=media_type),
                max_concurrency=2,
            )
        else:
            self.client.upload_fileobj(fileobj, self.bucket, key, ExtraArgs={"ContentType": media_type})
        return key

    def download_file(self, key: str, path: str | Path) -> str:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        if self.backend == "azure":
            with path.open("wb") as target:
                self.container.download_blob(key).readinto(target)
        else:
            self.client.download_file(self.bucket, key, str(path))
        return str(path)

    def object_size(self, key: str) -> int:
        if self.backend == "azure":
            return int(self.container.get_blob_client(key).get_blob_properties().size)
        response = self.client.head_object(Bucket=self.bucket, Key=key)
        return int(response.get("ContentLength") or 0)

    def delete_object(self, key: str) -> None:
        if self.backend == "azure":
            self.container.delete_blob(key, delete_snapshots="include")
        else:
            self.client.delete_object(Bucket=self.bucket, Key=key)

    def get_object(self, key: str, range_header: str | None = None) -> dict:
        if self.backend == "s3":
            request = {"Bucket": self.bucket, "Key": key}
            if range_header:
                request["Range"] = range_header
            return self.client.get_object(**request)

        blob = self.container.get_blob_client(key)
        properties = blob.get_blob_properties()
        total = int(properties.size)
        requested = _byte_range(range_header, total)
        if requested:
            start, end = requested
            downloader = blob.download_blob(offset=start, length=end - start + 1)
            content_range = f"bytes {start}-{end}/{total}"
            content_length = end - start + 1
        else:
            downloader = blob.download_blob()
            content_range = None
            content_length = total
        return {
            "Body": downloader.chunks(),
            "ContentLength": content_length,
            "ContentRange": content_range,
            "ContentType": properties.content_settings.content_type,
        }

    def presigned_url(self, key: str, expires_in: int | None = None) -> str:
        return f"{self.settings.storage_public_endpoint_url.rstrip('/')}/{key}"


def video_object_key(video_id: str, filename: str) -> str:
    return f"videos/{video_id}/{Path(filename).name}"


def clip_object_key(clip_id: str) -> str:
    return f"clips/{clip_id}.mp4"


def evidence_frame_object_key(frame_id: str) -> str:
    return f"evidence-frames/{frame_id}.jpg"


def visual_keyframe_object_key(video_id: str, timestamp_key: str) -> str:
    return f"visual-keyframes/{video_id}/{timestamp_key}.jpg"


def profile_image_object_key(user_id: str, filename: str) -> str:
    suffix = Path(filename).suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        suffix = ".jpg"
    return f"profile-images/{user_id}/{uuid.uuid4().hex}{suffix}"
