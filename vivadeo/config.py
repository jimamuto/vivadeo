"""Runtime configuration for local and production deployments."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_key: str = Field("change-me", alias="VIVADEO_API_KEY")
    api_url: str | None = Field(None, alias="VIVADEO_API_URL")
    internal_service_key: str = Field("change-me", alias="VIVADEO_INTERNAL_SERVICE_KEY")
    settings_encryption_key: str | None = Field(None, alias="VIVADEO_SETTINGS_ENCRYPTION_KEY")
    default_org_id: str = Field("default-workspace", alias="VIVADEO_DEFAULT_ORG_ID")

    database_url: str = Field(
        "postgresql+psycopg://vivadeo:vivadeo@localhost:5432/vivadeo",
        alias="DATABASE_URL",
    )
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")
    db_pool_size: int = Field(3, ge=1, alias="VIVADEO_DB_POOL_SIZE")
    db_max_overflow: int = Field(2, ge=0, alias="VIVADEO_DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(30, ge=1, alias="VIVADEO_DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(1800, ge=0, alias="VIVADEO_DB_POOL_RECYCLE")

    storage_backend: Literal["s3", "azure"] = Field("azure", alias="STORAGE_BACKEND")
    storage_public_endpoint_url: str = Field(
        "http://localhost:3000/api/proxy/v1/media",
        alias="STORAGE_PUBLIC_ENDPOINT_URL",
    )
    azure_storage_connection_string: str | None = Field(None, alias="AZURE_STORAGE_CONNECTION_STRING")
    azure_storage_container: str = Field("vivadeo", alias="AZURE_STORAGE_CONTAINER")
    azure_storage_timeout: int = Field(300, ge=30, alias="AZURE_STORAGE_TIMEOUT")
    s3_endpoint_url: str = Field("https://s3.eu-central-003.backblazeb2.com", alias="S3_ENDPOINT_URL")
    s3_bucket: str = Field("vivadeo", alias="S3_BUCKET")
    s3_access_key_id: str = Field("change-me", alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str = Field("change-me", alias="S3_SECRET_ACCESS_KEY")
    s3_region: str = Field("eu-central-003", alias="S3_REGION")

    modal_app: str = Field(
        "vivadeo-qwen3-vl-embedding-2b",
        alias="VIVADEO_MODAL_APP",
    )
    modal_class: str = Field("QwenEmbedder", alias="VIVADEO_MODAL_CLASS")
    modal_timeout: int = Field(900, alias="VIVADEO_MODAL_TIMEOUT")
    azure_openai_endpoint: str | None = Field(None, alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str | None = Field(None, alias="AZURE_OPENAI_API_KEY")
    azure_openai_api_version: str = Field("2024-10-21", alias="AZURE_OPENAI_API_VERSION")
    azure_openai_whisper_deployment: str | None = Field(None, alias="AZURE_OPENAI_WHISPER_DEPLOYMENT")
    azure_openai_whisper_timeout: int = Field(900, ge=30, alias="AZURE_OPENAI_WHISPER_TIMEOUT")
    modal_gemma_app: str = Field("vivadeo-qwen3-vl-embedding-2b", alias="VIVADEO_MODAL_GEMMA_APP")
    modal_gemma_function: str = Field("GemmaAnswerer.answer", alias="VIVADEO_MODAL_GEMMA_FUNCTION")
    chat_context_segments: int = Field(8, alias="VIVADEO_CHAT_CONTEXT_SEGMENTS")
    pro_llm_api_key: str | None = Field(None, alias="VIVADEO_PRO_LLM_API_KEY")
    pro_llm_base_url: str | None = Field(None, alias="VIVADEO_PRO_LLM_BASE_URL")
    pro_llm_model: str = Field("gpt-5.6-luna", alias="VIVADEO_PRO_LLM_MODEL")
    pro_llm_timeout: int = Field(120, alias="VIVADEO_PRO_LLM_TIMEOUT")
    pro_embedding_api_key: str | None = Field(None, alias="VIVADEO_PRO_EMBEDDING_API_KEY")
    pro_embedding_base_url: str = Field("https://integrate.api.nvidia.com/v1", alias="VIVADEO_PRO_EMBEDDING_BASE_URL")
    pro_embedding_model: str = Field("nvidia/nemotron-3-embed-1b", alias="VIVADEO_PRO_EMBEDDING_MODEL")
    pro_embedding_timeout: int = Field(120, alias="VIVADEO_PRO_EMBEDDING_TIMEOUT")

    chunk_duration: int = Field(30, alias="VIVADEO_CHUNK_DURATION")
    chunk_overlap: int = Field(5, alias="VIVADEO_CHUNK_OVERLAP")
    batch_size: int = Field(4, alias="VIVADEO_BATCH_SIZE")
    preprocess: bool = Field(True, alias="VIVADEO_PREPROCESS")
    target_resolution: int = Field(480, alias="VIVADEO_TARGET_RESOLUTION")
    target_fps: int = Field(5, alias="VIVADEO_TARGET_FPS")
    keyframe_interval: int = Field(5, ge=1, alias="VIVADEO_KEYFRAME_INTERVAL")
    skip_still: bool = Field(False, alias="VIVADEO_SKIP_STILL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
