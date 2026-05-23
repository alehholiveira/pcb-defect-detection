"""Pydantic schemas for the /predict endpoint."""

from pydantic import BaseModel, Field


class Detection(BaseModel):
    """A single detected defect in the image."""

    class_name: str = Field(..., description="Defect type (e.g. 'mouse_bite', 'short')")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence score")
    x1: float = Field(..., description="Bounding box top-left X coordinate")
    y1: float = Field(..., description="Bounding box top-left Y coordinate")
    x2: float = Field(..., description="Bounding box bottom-right X coordinate")
    y2: float = Field(..., description="Bounding box bottom-right Y coordinate")


class PredictionResponse(BaseModel):
    """Response schema for a prediction request."""

    model_name: str = Field(..., description="Name of the model used for inference")
    inference_time_ms: float = Field(
        ..., description="Inference time in milliseconds"
    )
    total_detections: int = Field(..., description="Total number of detections")
    detections: list[Detection] = Field(
        default_factory=list, description="List of detected defects"
    )
    annotated_image_base64: str | None = Field(
        None, description="Base64-encoded annotated image with bounding boxes (PNG)"
    )
