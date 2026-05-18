from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the current health status of the ML service and loaded models.",
)
async def health_check() -> HealthResponse:
    settings = get_settings()

    # TODO: Check which models are actually loaded in app.state
    available_models = ["yolo11", "faster_rcnn", "retinanet", "rt_detr"]

    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        models_loaded=available_models,
    )
