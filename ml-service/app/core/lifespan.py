from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.core.config import get_settings
from app.models.loader import load_all_models


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    settings = get_settings()

    # --- Startup ---
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📂 Models directory: {settings.MODELS_DIR}")

    # Load all ML models into memory
    try:
        app.state.models = load_all_models(
            settings.MODELS_DIR,
            settings.CONFIDENCE_THRESHOLD,
        )
        print(f"✅ {len(app.state.models)} model(s) loaded and ready for inference")
    except Exception as e:
        print(f"⚠️ Failed to load models: {e}")
        app.state.models = {}

    yield

    # --- Shutdown ---
    print(f"👋 Shutting down {settings.APP_NAME}")
    # Free model references
    app.state.models = {}
