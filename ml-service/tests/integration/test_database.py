"""Integration tests for SQLAlchemy ORM models with Testcontainers MySQL."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import Inference, InferenceImage, Detection


@pytest.mark.asyncio
async def test_create_and_query_inference_cascade(db_session):
    """Test inserting Inference with child InferenceImage and Detection, then reading back."""
    inference = Inference(
        model_name="yolo11",
        inference_time_ms=150.2,
        total_detections=2,
    )
    
    image = InferenceImage(
        image_name="board_01.jpg",
        total_detections=2,
        image_url="https://s3/board_01.jpg",
    )
    
    det1 = Detection(
        class_name="mouse_bite",
        confidence=0.92,
        x1=10.0,
        y1=20.0,
        x2=30.0,
        y2=40.0,
    )
    det2 = Detection(
        class_name="short",
        confidence=0.88,
        x1=50.0,
        y1=60.0,
        x2=70.0,
        y2=80.0,
    )
    
    image.detections.extend([det1, det2])
    inference.images.append(image)
    
    db_session.add(inference)
    await db_session.commit()

    assert inference.id is not None

    # Query back
    stmt = (
        select(Inference)
        .where(Inference.id == inference.id)
        .options(selectinload(Inference.images).selectinload(InferenceImage.detections))
    )
    result = await db_session.execute(stmt)
    saved_inference = result.scalar_one()

    assert saved_inference.model_name == "yolo11"
    assert len(saved_inference.images) == 1
    assert saved_inference.images[0].image_name == "board_01.jpg"
    assert len(saved_inference.images[0].detections) == 2
    assert saved_inference.images[0].detections[0].class_name == "mouse_bite"


@pytest.mark.asyncio
async def test_delete_inference_cascade(db_session):
    """Test that deleting an Inference cascades to InferenceImages and Detections."""
    inference = Inference(
        model_name="faster_rcnn",
        inference_time_ms=200.0,
        total_detections=1,
    )
    image = InferenceImage(
        image_name="test.png",
        total_detections=1,
        image_url="http://s3/test.png",
    )
    det = Detection(
        class_name="spur",
        confidence=0.99,
        x1=1.0,
        y1=1.0,
        x2=2.0,
        y2=2.0,
    )
    image.detections.append(det)
    inference.images.append(image)

    db_session.add(inference)
    await db_session.commit()

    inf_id = inference.id

    # Delete inference
    await db_session.delete(inference)
    await db_session.commit()

    # Verify cascading delete
    res_images = await db_session.execute(select(InferenceImage).where(InferenceImage.inference_id == inf_id))
    assert res_images.scalars().all() == []

    res_detections = await db_session.execute(select(Detection).where(Detection.class_name == "spur"))
    assert res_detections.scalars().all() == []
