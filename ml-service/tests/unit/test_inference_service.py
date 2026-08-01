"""Unit tests for app.services.inference."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from PIL import Image
import torch

from app.models.loader import ModelName, LoadedModel
from app.services.inference import (
    _build_s3_prefix,
    _infer_ultralytics,
    _infer_pytorch,
    _run_single_inference,
    run_batch_inference,
)


def test_build_s3_prefix():
    """Test S3 prefix generator formatting."""
    dt = datetime(2026, 7, 31, 14, 0, 0)
    prefix = _build_s3_prefix(dt, 42)
    assert prefix == "2026-07-31/42"


def test_infer_ultralytics():
    """Test Ultralytics prediction parsing with mock result."""
    mock_box = MagicMock()
    mock_box.xyxy = [torch.tensor([10.0, 20.0, 50.0, 60.0])]
    mock_box.cls.item.return_value = 1
    mock_box.conf.item.return_value = 0.95

    mock_result = MagicMock()
    mock_result.boxes = [mock_box]
    mock_result.names = {1: "mouse_bite"}

    mock_model = MagicMock()
    mock_model.predict.return_value = [mock_result]

    loaded = LoadedModel(
        name=ModelName.YOLO11,
        model=mock_model,
        framework="ultralytics",
        label_to_name={1: "mouse_bite"},
        score_threshold=0.25,
        device=torch.device("cpu"),
    )

    img = Image.new("RGB", (100, 100))
    dets = _infer_ultralytics(loaded, img, 0.25)

    assert len(dets) == 1
    assert dets[0].class_name == "mouse_bite"
    assert dets[0].confidence == 0.95
    assert dets[0].x1 == 10.0


def test_infer_pytorch():
    """Test PyTorch prediction parsing with mock output."""
    mock_output = {
        "boxes": torch.tensor([[5.0, 5.0, 15.0, 15.0]]),
        "scores": torch.tensor([0.90]),
        "labels": torch.tensor([2]),
    }

    mock_model = MagicMock()
    mock_model.return_value = [mock_output]

    loaded = LoadedModel(
        name=ModelName.FASTER_RCNN,
        model=mock_model,
        framework="pytorch",
        label_to_name={2: "spur"},
        score_threshold=0.25,
        device=torch.device("cpu"),
    )

    img = Image.new("RGB", (100, 100))
    dets = _infer_pytorch(loaded, img, 0.25)

    assert len(dets) == 1
    assert dets[0].class_name == "spur"
    assert dets[0].confidence == 0.90


def test_run_single_inference_dispatch():
    """Test framework dispatch logic in _run_single_inference."""
    loaded_ultralytics = MagicMock(framework="ultralytics")
    loaded_pytorch = MagicMock(framework="pytorch")

    img = Image.new("RGB", (100, 100))

    with patch("app.services.inference._infer_ultralytics", return_value=[]) as mock_ultra:
        _run_single_inference(loaded_ultralytics, img, 0.5)
        mock_ultra.assert_called_once()

    with patch("app.services.inference._infer_pytorch", return_value=[]) as mock_torch:
        _run_single_inference(loaded_pytorch, img, 0.5)
        mock_torch.assert_called_once()


@pytest.mark.asyncio
async def test_run_batch_inference_db_flush_error():
    """Test run_batch_inference rolls back session when flush fails."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.flush.side_effect = Exception("DB Flush Error")

    loaded = MagicMock(name=ModelName.YOLO11, score_threshold=0.25)
    loaded.name.value = "yolo11"

    img = Image.new("RGB", (10, 10))
    images = [("test.jpg", img)]

    with patch("app.services.inference._run_single_inference", return_value=[]):
        with pytest.raises(RuntimeError, match="Failed to persist inference to database"):
            await run_batch_inference(loaded, images, mock_session)

    mock_session.rollback.assert_called_once()


@pytest.mark.asyncio
async def test_run_batch_inference_s3_upload_error():
    """Test run_batch_inference rolls back session when S3 upload fails."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    async def mock_flush():
        added_inference = mock_session.add.call_args[0][0]
        added_inference.id = 1
        added_inference.created_at = datetime.now()

    mock_session.flush.side_effect = mock_flush

    loaded = MagicMock()
    loaded.name.value = "yolo11"
    loaded.score_threshold = 0.25

    img = Image.new("RGB", (10, 10))
    images = [("test.jpg", img)]

    with patch("app.services.inference._run_single_inference", return_value=[]), \
         patch("app.services.inference._upload_image_to_s3", side_effect=Exception("S3 Error")):
        with pytest.raises(RuntimeError, match="Failed to upload image"):
            await run_batch_inference(loaded, images, mock_session)

    mock_session.rollback.assert_called_once()


@pytest.mark.asyncio
async def test_run_batch_inference_json_upload_error():
    """Test run_batch_inference rolls back session when result JSON S3 upload fails."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    async def mock_flush():
        added_inference = mock_session.add.call_args[0][0]
        added_inference.id = 1
        added_inference.created_at = datetime.now()

    mock_session.flush.side_effect = mock_flush

    loaded = MagicMock()
    loaded.name.value = "yolo11"
    loaded.score_threshold = 0.25

    img = Image.new("RGB", (10, 10))
    images = [("test.jpg", img)]

    with patch("app.services.inference._run_single_inference", return_value=[]), \
         patch("app.services.inference._upload_image_to_s3", return_value="http://s3/test.jpg"), \
         patch("app.services.inference._upload_result_json_to_s3", side_effect=Exception("S3 JSON Error")):
        with pytest.raises(RuntimeError, match="Failed to upload result.json"):
            await run_batch_inference(loaded, images, mock_session)

    mock_session.rollback.assert_called_once()
