"""Unit tests for app.models.loader."""

from pathlib import Path
from unittest.mock import patch, MagicMock
import torch

from app.models.loader import (
    ModelName,
    MODEL_FILES,
    _detect_device,
    load_all_models,
)


def test_detect_device():
    """Test device selection logic."""
    device = _detect_device()
    assert isinstance(device, torch.device)


def test_model_files_mapping():
    """Test model file names mapping."""
    assert MODEL_FILES[ModelName.YOLO11] == "yolo11.pt"
    assert MODEL_FILES[ModelName.FASTER_RCNN] == "fasterrcnn_resnet50_fpn_v2.pth"
    assert MODEL_FILES[ModelName.RETINANET] == "retinanet_resnet50_fpn.pth"
    assert MODEL_FILES[ModelName.RT_DETR] == "rt_detr.pt"


@patch("app.models.loader.Path.exists", return_value=False)
def test_load_all_models_missing_files(mock_exists):
    """Test load_all_models when model weights files are missing."""
    models = load_all_models("/non/existent/path", 0.25)
    assert models == {}
