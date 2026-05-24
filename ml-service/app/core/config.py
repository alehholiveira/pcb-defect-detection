from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "PCB Defect ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str
    PORT: int

    # Models directory (where trained weights are stored)
    MODELS_DIR: str

    # Max upload file size (bytes)
    MAX_FILE_SIZE: int

    # Output directory for annotated images
    OUTPUTS_DIR: str

    # Confidence threshold for detections
    CONFIDENCE_THRESHOLD: float

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — avoids re-reading .env on every request."""
    return Settings()
