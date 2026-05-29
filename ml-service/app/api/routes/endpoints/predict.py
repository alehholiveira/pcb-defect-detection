"""POST /predict endpoint — runs PCB defect detection on uploaded images."""

from io import BytesIO

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, HTTPException
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db_session
from app.models.loader import ModelName
from app.schemas.prediction import PredictionResponse
from app.services.inference import run_batch_inference

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/bmp"}


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Run defect detection on one or more images",
    description=(
        "Upload one or more PCB images and specify which model to use for inference. "
        "Returns detected defects with bounding boxes per image, "
        "total detection count, and local paths to annotated images."
    ),
)
async def predict(
    request: Request,
    files: list[UploadFile] = File(
        ..., description="PCB image files (JPEG, PNG, BMP). Multiple files allowed."
    ),
    model_name: ModelName = Query(
        ...,
        description="Model to use for inference",
        examples=["yolo11", "faster_rcnn", "retinanet", "rt_detr"],
    ),
    confidence: float | None = Query(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence threshold (uses model default if not specified)",
    ),
    session: AsyncSession = Depends(get_db_session),
) -> PredictionResponse:
    settings = get_settings()

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

    # Validate and read all images
    images: list[tuple[str, Image.Image]] = []
    total_size = 0

    for file in files:
        # Validate file type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid file type '{file.content_type}' for file '{file.filename}'. "
                    f"Accepted: JPEG, PNG, BMP."
                ),
            )

        # Read file contents
        try:
            contents = await file.read()
            total_size += len(contents)

            # Validate total upload size
            if total_size > settings.MAX_FILE_SIZE:
                max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
                raise HTTPException(
                    status_code=413,
                    detail=f"Total upload size exceeds the limit of {max_mb:.0f}MB.",
                )

            image = Image.open(BytesIO(contents)).convert("RGB")
            images.append((file.filename or "unknown.jpg", image))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not process file '{file.filename}': {str(e)}",
            )

    if not images:
        raise HTTPException(
            status_code=400,
            detail="No valid images were provided.",
        )

    # Run batch inference and persist to database
    return await run_batch_inference(
        loaded=models[model_name],
        images=images,
        output_base_dir=settings.OUTPUTS_DIR,
        session=session,
        confidence_threshold=confidence,
    )
