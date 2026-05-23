from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the current health status of the ML service and loaded models.",
)
async def health_check(request: Request) -> HealthResponse:
    settings = get_settings()

    # Report actually loaded models from app.state
    models = getattr(request.app.state, "models", {})
    models_loaded = [name.value for name in models.keys()]

    return HealthResponse(
        status="healthy" if models_loaded else "degraded",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        models_loaded=models_loaded,
    )
