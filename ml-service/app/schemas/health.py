from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    service: str
    version: str
    models_loaded: list[str]
