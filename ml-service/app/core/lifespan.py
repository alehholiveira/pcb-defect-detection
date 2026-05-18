from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    settings = get_settings()

    # --- Startup ---
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    print(f"📂 Models directory: {settings.MODELS_DIR}")

    # TODO: Pre-load ML models here for faster inference
    # This is where you'd load YOLO, Faster R-CNN, RetinaNet, RT-DETR weights
    # Example:
    # app.state.models = load_all_models(settings.MODELS_DIR)

    yield

    # --- Shutdown ---
    print(f"👋 Shutting down {settings.APP_NAME}")
    # TODO: Cleanup resources (free GPU memory, close connections, etc.)
