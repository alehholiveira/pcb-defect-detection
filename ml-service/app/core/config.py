from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "PCB Defect ML Service"
    APP_VERSION: str = "1.0.0"

    # CORS
    CORS_ORIGIN: str

    # Models directory (where trained weights are stored)
    MODELS_DIR: str

    # Max upload file size (bytes)
    MAX_FILE_SIZE: int

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — avoids re-reading .env on every request."""
    return Settings()
