"""E2E tests for /predict endpoint with real Testcontainers MySQL DB."""

from io import BytesIO
import pytest
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import Inference


@pytest.mark.asyncio
async def test_predict_image_success(client, db_session):
    """Test POST /ml-service/predict with valid image persists to DB and returns 200 OK."""
    # Create test image in memory
    img = Image.new("RGB", (100, 100), color="blue")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    buffer.seek(0)

    files = [("files", ("test_pcb.jpg", buffer, "image/jpeg"))]

    response = await client.post(
        "/ml-service/predict",
        params={"model_name": "yolo11"},
        files=files,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["model_name"] == "yolo11"
    assert data["total_detections"] >= 0
    assert len(data["images"]) == 1
    assert data["images"][0]["image_name"] == "test_pcb.jpg"
    assert "amazonaws.com" in data["images"][0]["image_url"]

    # Verify database persistence via Testcontainers MySQL
    stmt = select(Inference).options(selectinload(Inference.images))
    result = await db_session.execute(stmt)
    inferences = result.scalars().all()

    assert len(inferences) == 1
    assert inferences[0].model_name == "yolo11"
    assert len(inferences[0].images) == 1
    assert inferences[0].images[0].image_name == "test_pcb.jpg"


@pytest.mark.asyncio
async def test_predict_invalid_file_type(client):
    """Test POST /ml-service/predict with unsupported file type returns 400 Bad Request."""
    files = [("files", ("script.sh", b"echo hello", "text/plain"))]

    response = await client.post(
        "/ml-service/predict",
        params={"model_name": "yolo11"},
        files=files,
    )

    assert response.status_code == 400
    data = response.json()
    assert "Invalid file type" in data["detail"]


@pytest.mark.asyncio
async def test_predict_unloaded_model(client):
    """Test POST /ml-service/predict with model not loaded returns 404."""
    img = Image.new("RGB", (50, 50))
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    files = [("files", ("test.png", buffer, "image/png"))]

    response = await client.post(
        "/ml-service/predict",
        params={"model_name": "faster_rcnn"},
        files=files,
    )

    assert response.status_code == 404
    data = response.json()
    assert "is not loaded" in data["detail"]
