"""POST /predict endpoint — runs PCB defect detection on uploaded images."""

from fastapi import APIRouter, File, Query, Request, UploadFile, HTTPException
from PIL import Image

from app.models.loader import ModelName
from app.schemas.prediction import PredictionResponse
from app.services.inference import run_inference

router = APIRouter()


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Run defect detection on an image",
    description=(
        "Upload a PCB image and specify which model to use for inference. "
        "Returns detected defects with bounding boxes and an annotated image."
    ),
)
async def predict(
    request: Request,
    file: UploadFile = File(..., description="PCB image file (JPEG, PNG)"),
    model_name: ModelName = Query(
        ...,
        description="Model to use for inference",
        examples=["yolo11", "faster_rcnn", "retinanet", "rt_detr"],
    ),
    confidence: float = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence threshold (uses model default if not specified)",
    ),
) -> PredictionResponse:
    # Validate that models are loaded
    models = getattr(request.app.state, "models", None)
    if not models:
        raise HTTPException(
            status_code=503,
            detail="Models are not loaded. The service may still be starting up.",
        )

    # Validate that the requested model is available
    if model_name not in models:
        available = [m.value for m in models.keys()]
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name.value}' is not loaded. Available models: {available}",
        )

    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Accepted: JPEG, PNG",
        )

    # Read and convert image
    try:
        contents = await file.read()
        from io import BytesIO

        image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not process the uploaded image: {str(e)}",
        )

    # Run inference
    loaded_model = models[model_name]
    result = run_inference(loaded_model, image, confidence)

    return result
