"""Unit tests for app.core.config."""

import os
from app.core.config import Settings, get_settings


def test_settings_default_values(monkeypatch):
    """Test default values of Settings class."""
    monkeypatch.setenv("CORS_ORIGIN", "http://localhost:3000")
    monkeypatch.setenv("MODELS_DIR", "app/models")
    monkeypatch.setenv("MAX_FILE_SIZE", "10485760")
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.25")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "3306")
    monkeypatch.setenv("DB_NAME", "pcb_db")
    monkeypatch.setenv("DB_USER", "root")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("AWS_S3_BUCKET_NAME", "test-bucket")

    settings = Settings()
    assert settings.APP_NAME == "PCB Defect ML Service"
    assert settings.APP_VERSION == "1.0.0"
    assert settings.CORS_ORIGIN == "http://localhost:3000"
    assert settings.AWS_REGION == "us-east-1"


def test_get_settings_lru_cache():
    """Test that get_settings returns a cached Settings instance."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
