from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    service: str
    version: str
    models_loaded: list[str]


class ServiceInfo(BaseModel):
    """Schema for detailed service information."""

    name: str
    version: str
    debug: bool
    available_models: list[str]
