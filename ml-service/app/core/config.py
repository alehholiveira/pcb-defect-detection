"""
Configuration module for the ML service.
Uses Pydantic BaseSettings to automatically load and validate environment variables.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "PCB Defect ML Service"
    APP_VERSION: str = "1.0.0"

    # CORS
    CORS_ORIGIN: str

    # Models directory (where trained weights are stored)
    MODELS_DIR: str

    # Max upload file size for total batch (in Megabytes, MB)
    MAX_FILE_SIZE: int

    # Max allowed images in a single batch request
    MAX_IMAGES_PER_BATCH: int

    # Default confidence threshold for detections
    CONFIDENCE_THRESHOLD: float

    # Database (MySQL — same instance as the backend)
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    # AWS 
    AWS_S3_BUCKET_NAME: str
    AWS_REGION: str = "us-east-1"

    APP_TIMEZONE: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — avoids re-reading .env on every request."""
    return Settings()
