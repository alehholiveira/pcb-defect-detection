from fastapi import APIRouter

from app.api.routes.endpoints.health import router as health_router
from app.api.routes.endpoints.predict import router as predict_router

api_router_ml_service = APIRouter()

api_router_ml_service.include_router(health_router, tags=["Health"])
api_router_ml_service.include_router(predict_router, tags=["Prediction"])
