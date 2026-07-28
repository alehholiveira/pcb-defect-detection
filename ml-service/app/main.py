import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Adding logs to the ML-service
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

from app.core.config import get_settings
from app.core.lifespan import lifespan
from app.api.routes.router import api_router_ml_service


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app.

    Uses the FastAPI lifespan context manager pattern to eagerly load ML models
    during application startup. This avoids cold-start latency on the first request,
    ensuring the API is fully responsive immediately after starting.

    The loaded models are stored in `app.state.models` (the application state object),
    which provides a global, thread-safe storage pattern accessible to all route handlers
    without requiring global variables.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Machine Learning microservice for PCB defect detection. "
            "Supports inference using YOLO11, Faster R-CNN, RetinaNet, and RT-DETR models."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS — restrict to allowed origins from config
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.CORS_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routes
    app.include_router(api_router_ml_service, prefix="/ml-service")

    return app


app = create_app()
