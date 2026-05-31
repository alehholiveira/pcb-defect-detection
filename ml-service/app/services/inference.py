"""
Inference service — runs defect detection on images using loaded models.

Handles both Ultralytics-based models (YOLO11, RT-DETR) and
PyTorch-based models (Faster R-CNN, RetinaNet) with a unified interface.

Logic follows the inference notebooks:
- Ultralytics: result.plot() for annotation (YOLOv11_inferencia, RT-DETR_inferencia)
- PyTorch: pcb_utils.draw_predictions() style (FasterRCNN_inferencia, RetinaNet_inferencia)
"""

import time
from datetime import datetime
from pathlib import Path

import torch
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from torchvision.transforms import functional as TF

from app.db.models import Detection as DetectionORM
from app.db.models import Inference as InferenceORM
from app.db.models import InferenceImage as InferenceImageORM
from app.models.loader import LoadedModel
from app.schemas.prediction import Detection, ImageResult, PredictionResponse


# ──────────────────────────────────────────────────────────────────────
# Image saving
# ──────────────────────────────────────────────────────────────────────


def _save_image(
    image: Image.Image,
    output_dir: Path,
    filename: str,
) -> str:
    """
    Save the original image to disk and return its local path.

    Directory structure:
      outputs/<date>/<time>/filename
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    # Determine format from extension or fallback to PNG
    ext = output_path.suffix.lower()
    save_format = "JPEG" if ext in [".jpg", ".jpeg"] else "PNG"
    image.save(output_path, format=save_format)
    return str(output_path)


def _create_output_dir(base_dir: str) -> Path:
    """
    Create output directory following the pattern:
      <base_dir>/<YYYY-MM-DD>/<HH-MM-SS>/

    Parameters
    ----------
    base_dir : str
        Base output directory (e.g. './outputs').

    Returns
    -------
    Path
        Full path to the timestamped directory.
    """
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    output_dir = Path(base_dir) / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir





# ──────────────────────────────────────────────────────────────────────
# Ultralytics inference (YOLO11, RT-DETR)
# Reference: YOLOv11_inferencia.ipynb Cell 4, RT-DETR_inferencia.ipynb Cell 4
#
#   results = predict_model.predict(str(image_path), conf=conf,
#                                   device=EVAL_DEVICE, verbose=False)
#   for result in results:
#       im_array = result.plot()
#       im = Image.fromarray(im_array[..., ::-1])   # BGR → RGB
#       for box in result.boxes:
#           x1, y1, x2, y2 = box.xyxy[0].tolist()
#           class_name = result.names[int(box.cls.item())]
#           score = float(box.conf.item())
# ──────────────────────────────────────────────────────────────────────


def _infer_ultralytics(
    loaded: LoadedModel,
    image: Image.Image,
    confidence_threshold: float,
) -> list[Detection]:
    """
    Run inference using an Ultralytics model (YOLO11 or RT-DETR).
    Returns only detections.
    """
    results = loaded.model.predict(
        source=image,
        conf=confidence_threshold,
        device=loaded.device,
        verbose=False,
    )

    detections: list[Detection] = []

    for result in results:
        # Extract detections
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append(
                Detection(
                    class_name=result.names[int(box.cls.item())],
                    confidence=round(float(box.conf.item()), 4),
                    x1=round(x1, 2),
                    y1=round(y1, 2),
                    x2=round(x2, 2),
                    y2=round(y2, 2),
                )
            )

    return detections


# ──────────────────────────────────────────────────────────────────────
# PyTorch inference (Faster R-CNN, RetinaNet)
# Reference: FasterRCNN_inferencia.ipynb Cell 5, RetinaNet_inferencia.ipynb Cell 5
#
#   image, tensor = load_image_tensor(image_path)
#   with torch.no_grad():
#       output = model([tensor.to(DEVICE)])[0]
#   keep = output["scores"].detach().cpu() >= score_threshold
#   filtered = {
#       "boxes":  output["boxes"].detach().cpu()[keep],
#       "scores": output["scores"].detach().cpu()[keep],
#       "labels": output["labels"].detach().cpu()[keep],
#   }
# ──────────────────────────────────────────────────────────────────────


def _infer_pytorch(
    loaded: LoadedModel,
    image: Image.Image,
    confidence_threshold: float,
) -> list[Detection]:
    """
    Run inference using a PyTorch/torchvision model (Faster R-CNN or RetinaNet).
    Follows predict_single_image() from the notebooks.
    """
    # load_image_tensor(): TF.pil_to_tensor(image).float() / 255.0
    tensor = TF.pil_to_tensor(image).float() / 255.0

    with torch.no_grad():
        output = loaded.model([tensor.to(loaded.device)])[0]

    # Filter by score threshold
    keep = output["scores"].detach().cpu() >= confidence_threshold

    boxes = output["boxes"].detach().cpu()[keep]
    scores = output["scores"].detach().cpu()[keep]
    labels = output["labels"].detach().cpu()[keep]

    detections: list[Detection] = []

    for box, score, label in zip(boxes, scores, labels):
        x1, y1, x2, y2 = [float(v) for v in box.tolist()]
        label_idx = int(label.item())
        class_name = loaded.label_to_name.get(label_idx, f"class_{label_idx}")

        detections.append(
            Detection(
                class_name=class_name,
                confidence=round(float(score.item()), 4),
                x1=round(x1, 2),
                y1=round(y1, 2),
                x2=round(x2, 2),
                y2=round(y2, 2),
            )
        )

    return detections


# ──────────────────────────────────────────────────────────────────────
# Single-image inference (used internally per image)
# ──────────────────────────────────────────────────────────────────────


def _run_single_inference(
    loaded: LoadedModel,
    image: Image.Image,
    confidence_threshold: float,
    output_dir: Path,
    image_filename: str,
) -> ImageResult:
    """
    Run inference on a single image: detect, save original, and return result.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    image : PIL.Image
        Input image (RGB).
    confidence_threshold : float
        Minimum confidence for detections.
    output_dir : Path
        Directory where image will be saved.
    image_filename : str
        Original filename (used for naming the output file).

    Returns
    -------
    ImageResult
        Detections + path to saved image for this single image.
    """
    if loaded.framework == "ultralytics":
        detections = _infer_ultralytics(loaded, image, confidence_threshold)
    else:
        detections = _infer_pytorch(loaded, image, confidence_threshold)

    # Save original image to disk
    stem = Path(image_filename).stem
    ext = Path(image_filename).suffix
    if not ext:
        ext = ".png"
    output_filename = f"{stem}{ext}"
    image_url = _save_image(image, output_dir, output_filename)

    return ImageResult(
        image_name=image_filename,
        total_detections=len(detections),
        detections=detections,
        image_url=image_url,
    )


# ──────────────────────────────────────────────────────────────────────
# Batch inference entry point
# ──────────────────────────────────────────────────────────────────────


async def run_batch_inference(
    loaded: LoadedModel,
    images: list[tuple[str, Image.Image]],
    output_base_dir: str,
    session: AsyncSession,
    confidence_threshold: float | None = None,
) -> PredictionResponse:
    """
    Run inference on multiple images, persist the result to the database,
    and return the aggregated PredictionResponse.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    images : list[tuple[str, PIL.Image]]
        List of (filename, PIL Image) tuples.
    output_base_dir : str
        Base directory for saving annotated images.
    session : AsyncSession
        Active SQLAlchemy async session for persisting the inference result.
    confidence_threshold : float | None
        Minimum confidence for detections. Uses model default if None.

    Returns
    -------
    PredictionResponse
        Aggregated result with per-image detections and total count.
    """
    if confidence_threshold is None:
        confidence_threshold = loaded.score_threshold

    output_dir = _create_output_dir(output_base_dir)

    start = time.perf_counter()

    image_results: list[ImageResult] = []
    for filename, image in images:
        result = _run_single_inference(
            loaded, image, confidence_threshold, output_dir, filename
        )
        image_results.append(result)

    elapsed_ms = (time.perf_counter() - start) * 1000
    total_detections = sum(r.total_detections for r in image_results)

    response = PredictionResponse(
        model_name=loaded.name.value,
        inference_time_ms=round(elapsed_ms, 2),
        total_detections=total_detections,
        images=image_results,
    )

    # Persist to database
    inference_orm = InferenceORM(
        model_name=response.model_name,
        inference_time_ms=response.inference_time_ms,
        total_detections=response.total_detections,
    )

    for image_result in response.images:
        inference_image_orm = InferenceImageORM(
            image_name=image_result.image_name,
            total_detections=image_result.total_detections,
            image_url=image_result.image_url,
            detections=[
                DetectionORM(
                    class_name=det.class_name,
                    confidence=det.confidence,
                    x1=det.x1,
                    y1=det.y1,
                    x2=det.x2,
                    y2=det.y2,
                )
                for det in image_result.detections
            ],
        )
        inference_orm.images.append(inference_image_orm)

    session.add(inference_orm)
    await session.commit()

    return response
