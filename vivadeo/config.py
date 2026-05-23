"""Runtime configuration for local and production deployments."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_key: str = Field("change-me", alias="VIVADEO_API_KEY")
    api_url: str | None = Field(None, alias="VIVADEO_API_URL")
    internal_service_key: str = Field("change-me", alias="VIVADEO_INTERNAL_SERVICE_KEY")
    default_org_id: str = Field("default-workspace", alias="VIVADEO_DEFAULT_ORG_ID")

    database_url: str = Field(
        "postgresql+psycopg://vivadeo:vivadeo@localhost:5432/vivadeo",
        alias="DATABASE_URL",
    )
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    s3_endpoint_url: str = Field("http://localhost:9000", alias="S3_ENDPOINT_URL")
    s3_public_endpoint_url: str | None = Field(None, alias="S3_PUBLIC_ENDPOINT_URL")
    s3_bucket: str = Field("vivadeo", alias="S3_BUCKET")
    s3_access_key_id: str = Field("minioadmin", alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str = Field("minioadmin", alias="S3_SECRET_ACCESS_KEY")
    s3_region: str = Field("us-east-1", alias="S3_REGION")
    s3_presign_seconds: int = Field(3600, alias="S3_PRESIGN_SECONDS")

    modal_app: str = Field(
        "vivadeo-qwen3-vl-embedding-2b",
        alias="VIVADEO_MODAL_APP",
    )
    modal_class: str = Field("QwenEmbedder", alias="VIVADEO_MODAL_CLASS")
    modal_timeout: int = Field(900, alias="VIVADEO_MODAL_TIMEOUT")
    modal_whisper_app: str = Field("vivadeo-qwen3-vl-embedding-2b", alias="VIVADEO_MODAL_WHISPER_APP")
    modal_whisper_function: str = Field("transcribe", alias="VIVADEO_MODAL_WHISPER_FUNCTION")
    modal_gemma_app: str = Field("vivadeo-qwen3-vl-embedding-2b", alias="VIVADEO_MODAL_GEMMA_APP")
    modal_gemma_function: str = Field("answer", alias="VIVADEO_MODAL_GEMMA_FUNCTION")
    chat_context_segments: int = Field(8, alias="VIVADEO_CHAT_CONTEXT_SEGMENTS")

    chunk_duration: int = Field(30, alias="VIVADEO_CHUNK_DURATION")
    chunk_overlap: int = Field(5, alias="VIVADEO_CHUNK_OVERLAP")
    batch_size: int = Field(4, alias="VIVADEO_BATCH_SIZE")
    preprocess: bool = Field(True, alias="VIVADEO_PREPROCESS")
    target_resolution: int = Field(480, alias="VIVADEO_TARGET_RESOLUTION")
    target_fps: int = Field(5, alias="VIVADEO_TARGET_FPS")
    skip_still: bool = Field(False, alias="VIVADEO_SKIP_STILL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
