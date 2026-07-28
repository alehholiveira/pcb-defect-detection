"""
Inference service — runs defect detection on images using loaded models.

Handles both Ultralytics-based models (YOLO11, RT-DETR) and
PyTorch-based models (Faster R-CNN, RetinaNet) with a unified interface.

Logic follows the inference notebooks:
- Ultralytics: result.plot() for annotation (YOLOv11_inferencia, RT-DETR_inferencia)
- PyTorch: pcb_utils.draw_predictions() style (FasterRCNN_inferencia, RetinaNet_inferencia)
"""

import logging
import time
from datetime import datetime
from pathlib import Path

import torch
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from torchvision.transforms import functional as TF

from app.core.s3_client import upload_image, upload_json
from app.db.models import Detection as DetectionORM
from app.db.models import Inference as InferenceORM
from app.db.models import InferenceImage as InferenceImageORM
from app.models.loader import LoadedModel
from app.schemas.prediction import Detection, ImageResult, PredictionResponse

logger = logging.getLogger(__name__)

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
        # Extract detections. Ultralytics internally applies Non-Maximum Suppression (NMS)
        # to remove overlapping detections of the same object based on an IoU threshold,
        # keeping only the highest-confidence bounding box.
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
    
    Images are preprocessed using `pil_to_tensor() / 255.0` to match expected inputs.
    Note: Standard ImageNet normalization (mean=[0.485, 0.456, 0.406], 
    std=[0.229, 0.224, 0.225]) is handled internally by torchvision models.
    These values represent the statistical means and stds of the ImageNet training dataset,
    which is required for models pretrained on ImageNet.
    
    Postprocessing extracts the bounding boxes and applies the confidence threshold.
    """
    # Preprocess image: convert to tensor and scale to [0, 1]
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
) -> list[Detection]:
    """
    Run inference on a single image and return detections.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    image : PIL.Image
        Input image (RGB).
    confidence_threshold : float
        Minimum confidence for detections.

    Returns
    -------
    list[Detection]
        List of detected defects.
    """
    if loaded.framework == "ultralytics":
        return _infer_ultralytics(loaded, image, confidence_threshold)
    else:
        return _infer_pytorch(loaded, image, confidence_threshold)


# ──────────────────────────────────────────────────────────────────────
# S3 upload helpers
# ──────────────────────────────────────────────────────────────────────


def _build_s3_prefix(inference_date: datetime, inference_id: int) -> str:
    """
    Build the S3 key prefix for an inference.

    Format: YYYY-MM-DD/<inference_id>/
    Example: 2026-06-16/42/
    """
    date_str = inference_date.strftime("%Y-%m-%d")
    return f"{date_str}/{inference_id}"


def _upload_image_to_s3(
    image: Image.Image,
    s3_prefix: str,
    filename: str,
) -> str:
    """Upload an image to S3 and return the public URL."""
    stem = Path(filename).stem
    ext = Path(filename).suffix or ".png"
    s3_key = f"{s3_prefix}/{stem}{ext}"
    return upload_image(image, s3_key, filename)


def _upload_result_json_to_s3(
    response_data: dict,
    s3_prefix: str,
) -> str:
    """Upload the inference result JSON to S3 and return the public URL."""
    s3_key = f"{s3_prefix}/result.json"
    return upload_json(response_data, s3_key)


# ──────────────────────────────────────────────────────────────────────
# Batch inference entry point
# ──────────────────────────────────────────────────────────────────────


async def run_batch_inference(
    loaded: LoadedModel,
    images: list[tuple[str, Image.Image]],
    session: AsyncSession,
    confidence_threshold: float | None = None,
) -> PredictionResponse:
    """
    Run inference on multiple images, upload to S3, persist to DB,
    and return the aggregated PredictionResponse.

    Flow:
    1. Run inference on all images (detections only)
    2. Flush to DB to obtain the auto-incremented inference ID
    3. Use the ID + date to build the S3 path: /{YYYY-MM-DD}/{id}/
    4. Upload each original image to S3
    5. Build the PredictionResponse and upload result.json to S3
    6. Update image_url in DB with S3 public URLs and commit

    Database Nested Creation Pattern:
    This function uses a single transaction for data consistency. It creates the nested 
    hierarchy (Inference -> InferenceImage -> Detection) by appending child objects to 
    the parent's relationships before flushing. This ensures all related records are 
    inserted together safely.

    If S3 upload fails at any point, session.rollback() is called
    to undo the flush and keep the database clean.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    images : list[tuple[str, PIL.Image]]
        List of (filename, PIL Image) tuples.
    session : AsyncSession
        Active SQLAlchemy async session for persisting the inference result.
    confidence_threshold : float | None
        Minimum confidence for detections. Uses model default if None.

    Returns
    -------
    PredictionResponse
        Aggregated result with per-image detections and S3 URLs.
    """
    if confidence_threshold is None:
        confidence_threshold = loaded.score_threshold

    start = time.perf_counter()

    # ── Step 1: Run inference on all images ─────────────────────────
    inference_results: list[tuple[str, Image.Image, list[Detection]]] = []
    for filename, image in images:
        detections = _run_single_inference(loaded, image, confidence_threshold)
        inference_results.append((filename, image, detections))

    elapsed_ms = (time.perf_counter() - start) * 1000
    total_detections = sum(len(dets) for _, _, dets in inference_results)

    # ── Step 2: Flush to DB to get the auto-incremented ID ──────────
    inference_orm = InferenceORM(
        model_name=loaded.name.value,
        inference_time_ms=round(elapsed_ms, 2),
        total_detections=total_detections,
    )

    image_orms: list[InferenceImageORM] = []
    for filename, _, detections in inference_results:
        inference_image_orm = InferenceImageORM(
            image_name=filename,
            total_detections=len(detections),
            image_url="pending_s3_upload",  # Placeholder — updated after S3 upload
            detections=[
                DetectionORM(
                    class_name=det.class_name,
                    confidence=det.confidence,
                    x1=det.x1,
                    y1=det.y1,
                    x2=det.x2,
                    y2=det.y2,
                )
                for det in detections
            ],
        )
        inference_orm.images.append(inference_image_orm)
        image_orms.append(inference_image_orm)

    try:
        session.add(inference_orm)
        await session.flush()  # Gets the ID without committing
    except Exception as e:
        logger.error("Failed to flush inference to DB: %s", e)
        await session.rollback()
        raise RuntimeError(f"Failed to persist inference to database: {e}") from e

    inference_id = inference_orm.id
    inference_date = inference_orm.created_at
    s3_prefix = _build_s3_prefix(inference_date, inference_id)

    logger.info(
        "Inference %d flushed to DB. Uploading %d images to S3: %s/",
        inference_id,
        len(images),
        s3_prefix,
    )

    # ── Step 3: Upload images to S3 and update DB URLs ──────────────
    image_results: list[ImageResult] = []
    for i, (filename, image, detections) in enumerate(inference_results):
        try:
            s3_url = _upload_image_to_s3(image, s3_prefix, filename)
        except Exception as e:
            logger.error("Failed to upload image '%s' to S3: %s", filename, e)
            await session.rollback()
            raise RuntimeError(
                f"Failed to upload image '{filename}' to S3: {e}"
            ) from e

        # Update the ORM object with the real S3 URL
        image_orms[i].image_url = s3_url

        image_results.append(
            ImageResult(
                image_name=filename,
                total_detections=len(detections),
                detections=detections,
                image_url=s3_url,
            )
        )

    # ── Step 4: Build response and upload result.json to S3 ─────────
    response = PredictionResponse(
        model_name=loaded.name.value,
        inference_time_ms=round(elapsed_ms, 2),
        total_detections=total_detections,
        images=image_results,
    )

    try:
        _upload_result_json_to_s3(response.model_dump(), s3_prefix)
    except Exception as e:
        logger.error("Failed to upload result.json to S3: %s", e)
        await session.rollback()
        raise RuntimeError(f"Failed to upload result.json to S3: {e}") from e

    # ── Step 5: Commit (all S3 uploads succeeded) ───────────────────
    try:
        await session.commit()
    except Exception as e:
        logger.error("Failed to commit inference %d to DB: %s", inference_id, e)
        await session.rollback()
        raise RuntimeError(f"Failed to commit inference to database: {e}") from e

    logger.info(
        "Inference %d completed: %d images, %d detections, %.1fms",
        inference_id,
        len(images),
        total_detections,
        elapsed_ms,
    )

    return response
