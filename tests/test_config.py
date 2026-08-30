"""Tests for production configuration."""

from vivadeo.config import Settings


def test_settings_reads_production_env(monkeypatch):
    monkeypatch.setenv("VIVADEO_API_KEY", "secret")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@db:5432/app")
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/1")
    monkeypatch.setenv("STORAGE_BACKEND", "azure")
    monkeypatch.setenv("AZURE_STORAGE_CONNECTION_STRING", "private")
    monkeypatch.setenv("AZURE_STORAGE_CONTAINER", "videos")

    settings = Settings()

    assert settings.api_key == "secret"
    assert settings.database_url.endswith("/app")
    assert settings.redis_url == "redis://redis:6379/1"
    assert settings.storage_backend == "azure"
    assert settings.azure_storage_connection_string == "private"
    assert settings.azure_storage_container == "videos"

