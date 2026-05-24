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
from PIL import Image, ImageDraw
from torchvision.transforms import functional as TF

from app.models.loader import LoadedModel
from app.schemas.prediction import Detection, ImageResult, PredictionResponse


# ──────────────────────────────────────────────────────────────────────
# Image saving
# ──────────────────────────────────────────────────────────────────────


def _save_annotated_image(
    image: Image.Image,
    output_dir: Path,
    filename: str,
) -> str:
    """
    Save an annotated image to disk and return its local path.

    Directory structure:
      outputs/<date>/<time>/filename.png
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    image.save(output_path, format="PNG")
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
# Annotation: PyTorch models (Faster R-CNN, RetinaNet)
# Reference: pcb_utils.draw_predictions()
#
#   draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
#   draw.text((x1 + 2, text_y), caption, fill="yellow")
# ──────────────────────────────────────────────────────────────────────


def _annotate_image_pytorch(
    image: Image.Image,
    detections: list[Detection],
) -> Image.Image:
    """
    Draw bounding boxes on the image following pcb_utils.draw_predictions().
    Returns the annotated PIL Image.
    """
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    for det in detections:
        x1, y1, x2, y2 = det.x1, det.y1, det.x2, det.y2
        caption = f"{det.class_name}: {det.confidence:.2f}"

        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        text_y = y1 - 12 if y1 > 12 else y1 + 2
        draw.text((x1 + 2, text_y), caption, fill="yellow")

    return annotated


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
) -> tuple[list[Detection], Image.Image]:
    """
    Run inference using an Ultralytics model (YOLO11 or RT-DETR).
    Returns detections and annotated PIL Image.
    """
    results = loaded.model.predict(
        source=image,
        conf=confidence_threshold,
        device=loaded.device,
        verbose=False,
    )

    detections: list[Detection] = []
    annotated_pil = image.copy()

    for result in results:
        # Annotated image — follows notebook: result.plot() → BGR → RGB
        im_array = result.plot()
        annotated_pil = Image.fromarray(im_array[..., ::-1])

        # Extract detections — follows notebook extraction loop
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

    return detections, annotated_pil


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
    Run inference on a single image: detect, annotate, save, and return result.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    image : PIL.Image
        Input image (RGB).
    confidence_threshold : float
        Minimum confidence for detections.
    output_dir : Path
        Directory where annotated image will be saved.
    image_filename : str
        Original filename (used for naming the output file).

    Returns
    -------
    ImageResult
        Detections + path to annotated image for this single image.
    """
    if loaded.framework == "ultralytics":
        detections, annotated_pil = _infer_ultralytics(
            loaded, image, confidence_threshold
        )
    else:
        detections = _infer_pytorch(loaded, image, confidence_threshold)
        # Annotation follows pcb_utils.draw_predictions()
        annotated_pil = _annotate_image_pytorch(image, detections)

    # Save annotated image to disk
    stem = Path(image_filename).stem
    output_filename = f"{stem}_pred.png"
    image_url = _save_annotated_image(annotated_pil, output_dir, output_filename)

    return ImageResult(
        image_name=image_filename,
        total_detections=len(detections),
        detections=detections,
        image_url=image_url,
    )


# ──────────────────────────────────────────────────────────────────────
# Batch inference entry point
# ──────────────────────────────────────────────────────────────────────


def run_batch_inference(
    loaded: LoadedModel,
    images: list[tuple[str, Image.Image]],
    confidence_threshold: float | None = None,
    output_base_dir: str = "./outputs",
) -> PredictionResponse:
    """
    Run inference on multiple images using the specified model.

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    images : list[tuple[str, PIL.Image]]
        List of (filename, PIL Image) tuples.
    confidence_threshold : float | None
        Minimum confidence for detections. Uses model default if None.
    output_base_dir : str
        Base directory for saving annotated images.

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

    return PredictionResponse(
        model_name=loaded.name.value,
        inference_time_ms=round(elapsed_ms, 2),
        total_detections=total_detections,
        images=image_results,
    )
