"""Unit tests for Pydantic schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.health import HealthResponse
from app.schemas.prediction import Detection, ImageResult, PredictionResponse


def test_health_response_schema():
    """Test valid HealthResponse instantiation."""
    resp = HealthResponse(
        status="healthy",
        service="PCB Defect ML Service",
        version="1.0.0",
        models_loaded=["yolo11", "faster_rcnn"],
    )
    assert resp.status == "healthy"
    assert len(resp.models_loaded) == 2


def test_detection_schema():
    """Test valid and invalid Detection schemas."""
    det = Detection(
        class_name="mouse_bite",
        confidence=0.95,
        x1=10.0,
        y1=20.0,
        x2=50.0,
        y2=60.0,
    )
    assert det.class_name == "mouse_bite"
    assert det.confidence == 0.95

    # Invalid confidence > 1.0
    with pytest.raises(ValidationError):
        Detection(
            class_name="spur",
            confidence=1.5,
            x1=0,
            y1=0,
            x2=10,
            y2=10,
        )


def test_prediction_response_schema():
    """Test complete PredictionResponse instantiation."""
    det = Detection(
        class_name="spur",
        confidence=0.88,
        x1=5.0,
        y1=5.0,
        x2=15.0,
        y2=15.0,
    )
    img_res = ImageResult(
        image_name="test.jpg",
        total_detections=1,
        detections=[det],
        image_url="http://s3/test.jpg",
    )
    resp = PredictionResponse(
        model_name="yolo11",
        inference_time_ms=45.2,
        total_detections=1,
        images=[img_res],
    )
    assert resp.model_name == "yolo11"
    assert resp.images[0].detections[0].class_name == "spur"
