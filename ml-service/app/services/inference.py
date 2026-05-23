"""
Inference service — runs defect detection on images using loaded models.

Handles both Ultralytics-based models (YOLO11, RT-DETR) and
PyTorch-based models (Faster R-CNN, RetinaNet) with a unified interface.

Logic follows the inference notebooks:
- Ultralytics: result.plot() for annotation (YOLOv11_inferencia, RT-DETR_inferencia)
- PyTorch: pcb_utils.draw_predictions() style (FasterRCNN_inferencia, RetinaNet_inferencia)
"""

import base64
import io
import time

import torch
from PIL import Image, ImageDraw
from torchvision.transforms import functional as TF

from app.models.loader import LoadedModel
from app.schemas.prediction import Detection, PredictionResponse


def _image_to_base64(image: Image.Image) -> str:
    """Convert a PIL Image to base64-encoded PNG string."""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


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
) -> str:
    """
    Draw bounding boxes on the image following pcb_utils.draw_predictions().
    Returns base64-encoded PNG.
    """
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    for det in detections:
        x1, y1, x2, y2 = det.x1, det.y1, det.x2, det.y2
        caption = f"{det.class_name}: {det.confidence:.2f}"

        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        text_y = y1 - 12 if y1 > 12 else y1 + 2
        draw.text((x1 + 2, text_y), caption, fill="yellow")

    return _image_to_base64(annotated)


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
) -> tuple[list[Detection], str]:
    """
    Run inference using an Ultralytics model (YOLO11 or RT-DETR).
    Returns detections and base64-encoded annotated image.
    """
    results = loaded.model.predict(
        source=image,
        conf=confidence_threshold,
        device=loaded.device,
        verbose=False,
    )

    detections: list[Detection] = []
    annotated_b64 = ""

    for result in results:
        # Annotated image — follows notebook: result.plot() → BGR → RGB
        im_array = result.plot()
        annotated_pil = Image.fromarray(im_array[..., ::-1])
        annotated_b64 = _image_to_base64(annotated_pil)

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

    return detections, annotated_b64


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
# Unified inference entry point
# ──────────────────────────────────────────────────────────────────────


def run_inference(
    loaded: LoadedModel,
    image: Image.Image,
    confidence_threshold: float | None = None,
) -> PredictionResponse:
    """
    Run inference on an image using the specified model.

    Dispatches to the appropriate inference function based on the model's
    framework (Ultralytics vs PyTorch).

    Parameters
    ----------
    loaded : LoadedModel
        Model wrapper with loaded weights.
    image : PIL.Image
        Input image (RGB).
    confidence_threshold : float | None
        Minimum confidence for detections. Uses model default if None.

    Returns
    -------
    PredictionResponse
        Structured prediction result with detections and annotated image.
    """
    if confidence_threshold is None:
        confidence_threshold = loaded.score_threshold

    start = time.perf_counter()

    if loaded.framework == "ultralytics":
        detections, annotated_b64 = _infer_ultralytics(
            loaded, image, confidence_threshold
        )
    else:
        detections = _infer_pytorch(loaded, image, confidence_threshold)
        # Annotation follows pcb_utils.draw_predictions()
        annotated_b64 = _annotate_image_pytorch(image, detections)

    elapsed_ms = (time.perf_counter() - start) * 1000

    return PredictionResponse(
        model_name=loaded.name.value,
        inference_time_ms=round(elapsed_ms, 2),
        total_detections=len(detections),
        detections=detections,
        annotated_image_base64=annotated_b64,
    )
