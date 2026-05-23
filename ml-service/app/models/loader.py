"""
Model loader — Loads all trained models into memory.

Supports:
- YOLO11 (Ultralytics)
- RT-DETR (Ultralytics)
- Faster R-CNN (PyTorch / torchvision)
- RetinaNet (PyTorch / torchvision)

Loading logic follows the inference notebooks:
- YOLOv11_inferencia.ipynb
- RT-DETR_inferencia.ipynb
- FasterRCNN_inferencia.ipynb
- RetinaNet_inferencia.ipynb
"""

from pathlib import Path
from enum import Enum

import torch
from torchvision.models.detection import (
    fasterrcnn_resnet50_fpn_v2,
    retinanet_resnet50_fpn,
)
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from ultralytics import YOLO, RTDETR


class ModelName(str, Enum):
    """Available model identifiers."""

    YOLO11 = "yolo11"
    FASTER_RCNN = "faster_rcnn"
    RETINANET = "retinanet"
    RT_DETR = "rt_detr"


# Default class label mapping for the PCB dataset (background = 0)
DEFAULT_LABEL_TO_NAME = {
    1: "mouse_bite",
    2: "spur",
    3: "missing_hole",
    4: "short",
    5: "open_circuit",
    6: "spurious_copper",
}


class LoadedModel:
    """
    Wrapper that holds a loaded model alongside its metadata.
    Provides a uniform interface regardless of the underlying framework.
    """

    def __init__(
        self,
        name: ModelName,
        model: object,
        framework: str,
        label_to_name: dict[int, str],
        score_threshold: float,
        device: torch.device,
    ):
        self.name = name
        self.model = model
        self.framework = framework  # "ultralytics" or "pytorch"
        self.label_to_name = label_to_name
        self.score_threshold = score_threshold
        self.device = device


def _detect_device() -> torch.device:
    """
    Detect the best available device for inference.

    Mirrors pcb_utils.detect_device():
    - CUDA → cuda:0
    - MPS  → cpu (MPS can cause eval errors, notebooks use cpu for eval)
    - else → cpu
    """
    if torch.cuda.is_available():
        return torch.device("cuda:0")
    elif torch.backends.mps.is_available():
        # Notebooks: eval_device = "cpu" when MPS — MPS causes issues in eval
        return torch.device("cpu")
    else:
        return torch.device("cpu")


# ──────────────────────────────────────────────────────────────────────
# Ultralytics models (YOLO11, RT-DETR)
# Reference: YOLOv11_inferencia.ipynb Cell 4, RT-DETR_inferencia.ipynb Cell 4
#
#   predict_model = YOLO(str(MODEL_PATH))
#   results = predict_model.predict(str(image_path), conf=conf,
#                                   device=EVAL_DEVICE, verbose=False)
# ──────────────────────────────────────────────────────────────────────


def _load_ultralytics_model(
    model_path: Path,
    model_name: ModelName,
    model_class: type,
    device: torch.device,
) -> LoadedModel:
    """Load an Ultralytics-based model (YOLO11 or RT-DETR)."""
    model = model_class(str(model_path))
    label_to_name = model.names  # Ultralytics stores class names internally

    return LoadedModel(
        name=model_name,
        model=model,
        framework="ultralytics",
        label_to_name=label_to_name,
        score_threshold=0.25,  # notebooks: conf=0.25
        device=device,
    )


# ──────────────────────────────────────────────────────────────────────
# Faster R-CNN
# Reference: FasterRCNN_inferencia.ipynb Cell 4
#
#   model = fasterrcnn_resnet50_fpn_v2(weights=None)
#   in_features = model.roi_heads.box_predictor.cls_score.in_features
#   model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
#   checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu")
#   model.load_state_dict(checkpoint["model_state_dict"])
#   model.to(DEVICE)
#   model.eval()
# ──────────────────────────────────────────────────────────────────────


def _load_faster_rcnn(
    model_path: Path,
    device: torch.device,
) -> LoadedModel:
    """Load Faster R-CNN following FasterRCNN_inferencia.ipynb."""
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)

    # Extract class mapping from checkpoint
    label_to_name = checkpoint.get("label_to_name", DEFAULT_LABEL_TO_NAME)
    if isinstance(label_to_name, dict):
        label_to_name = {int(k): v for k, v in label_to_name.items()}

    num_classes = max(label_to_name.keys()) + 1  # includes background (0)

    # Build model — Faster R-CNN does NOT accept num_classes directly,
    # the box predictor head must be replaced manually
    model = fasterrcnn_resnet50_fpn_v2(weights=None)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    # Notebook: checkpoint.get("config", {}).get("score_threshold", 0.30)
    score_threshold = float(
        checkpoint.get("config", {}).get("score_threshold", 0.30)
    )

    return LoadedModel(
        name=ModelName.FASTER_RCNN,
        model=model,
        framework="pytorch",
        label_to_name=label_to_name,
        score_threshold=score_threshold,
        device=device,
    )


# ──────────────────────────────────────────────────────────────────────
# RetinaNet
# Reference: RetinaNet_inferencia.ipynb Cell 4
#
#   model = retinanet_resnet50_fpn(weights=None, num_classes=num_classes)
#   checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu")
#   model.load_state_dict(checkpoint["model_state_dict"])
#   model.to(DEVICE)
#   model.eval()
# ──────────────────────────────────────────────────────────────────────


def _load_retinanet(
    model_path: Path,
    device: torch.device,
) -> LoadedModel:
    """Load RetinaNet following RetinaNet_inferencia.ipynb."""
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)

    # Extract class mapping from checkpoint
    label_to_name = checkpoint.get("label_to_name", DEFAULT_LABEL_TO_NAME)
    if isinstance(label_to_name, dict):
        label_to_name = {int(k): v for k, v in label_to_name.items()}

    num_classes = max(label_to_name.keys()) + 1  # includes background (0)

    # Build model — RetinaNet accepts num_classes directly
    model = retinanet_resnet50_fpn(weights=None, num_classes=num_classes)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    # Notebook: checkpoint.get("config", {}).get("score_threshold", 0.30)
    score_threshold = float(
        checkpoint.get("config", {}).get("score_threshold", 0.30)
    )

    return LoadedModel(
        name=ModelName.RETINANET,
        model=model,
        framework="pytorch",
        label_to_name=label_to_name,
        score_threshold=score_threshold,
        device=device,
    )


# ──────────────────────────────────────────────────────────────────────
# Model file mapping
# ──────────────────────────────────────────────────────────────────────

MODEL_FILES = {
    ModelName.YOLO11: "yolo11.pt",
    ModelName.FASTER_RCNN: "fasterrcnn_resnet50_fpn_v2.pth",
    ModelName.RETINANET: "retinanet_resnet50_fpn.pth",
    ModelName.RT_DETR: "rt_detr.pt",
}


def load_all_models(models_dir: str) -> dict[ModelName, LoadedModel]:
    """
    Load all 4 trained models from the specified directory.

    Parameters
    ----------
    models_dir : str
        Path to the directory containing model weight files.

    Returns
    -------
    dict[ModelName, LoadedModel]
        Dictionary mapping model names to loaded model wrappers.
    """
    models_path = Path(models_dir)
    device = _detect_device()
    loaded: dict[ModelName, LoadedModel] = {}

    print(f"🔧 Device for inference: {device}")

    # --- Ultralytics models ---
    ultralytics_configs = [
        (ModelName.YOLO11, YOLO),
        (ModelName.RT_DETR, RTDETR),
    ]

    for model_name, model_class in ultralytics_configs:
        filepath = models_path / MODEL_FILES[model_name]
        if filepath.exists():
            print(f"📦 Loading {model_name.value}...")
            loaded[model_name] = _load_ultralytics_model(
                filepath, model_name, model_class, device
            )
            print(f"  ✅ {model_name.value} loaded successfully")
        else:
            print(f"  ⚠️ {model_name.value} weights not found at {filepath}")

    # --- Faster R-CNN ---
    frcnn_path = models_path / MODEL_FILES[ModelName.FASTER_RCNN]
    if frcnn_path.exists():
        print(f"📦 Loading {ModelName.FASTER_RCNN.value}...")
        loaded[ModelName.FASTER_RCNN] = _load_faster_rcnn(frcnn_path, device)
        print(f"  ✅ {ModelName.FASTER_RCNN.value} loaded successfully")
    else:
        print(f"  ⚠️ {ModelName.FASTER_RCNN.value} weights not found at {frcnn_path}")

    # --- RetinaNet ---
    retinanet_path = models_path / MODEL_FILES[ModelName.RETINANET]
    if retinanet_path.exists():
        print(f"📦 Loading {ModelName.RETINANET.value}...")
        loaded[ModelName.RETINANET] = _load_retinanet(retinanet_path, device)
        print(f"  ✅ {ModelName.RETINANET.value} loaded successfully")
    else:
        print(f"  ⚠️ {ModelName.RETINANET.value} weights not found at {retinanet_path}")

    return loaded
