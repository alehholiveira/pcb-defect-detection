"""
S3 client — handles uploads of images and JSON data to Amazon S3.

All S3 interactions are centralized here for maintainability.
The boto3 client reads AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
from environment variables automatically.
"""

import json
from io import BytesIO
from functools import lru_cache

import boto3
from PIL import Image

from app.core.config import get_settings


@lru_cache()
def _get_s3_client():
    """Cached boto3 S3 client — avoids re-initializing on every request."""
    settings = get_settings()
    return boto3.client("s3", region_name=settings.AWS_REGION)


def _get_public_url(bucket: str, key: str, region: str) -> str:
    """Build the public URL for an S3 object."""
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def upload_image(image: Image.Image, s3_key: str, filename: str) -> str:
    """
    Upload a PIL Image to S3 and return its public URL.

    Parameters
    ----------
    image : PIL.Image
        Image to upload.
    s3_key : str
        Full S3 object key (e.g. '2026-06-16/42/photo.jpg').
    filename : str
        Original filename (used to determine format).

    Returns
    -------
    str
        Public URL of the uploaded image.
    """
    settings = get_settings()
    client = _get_s3_client()

    # Determine format from extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "png"
    content_type = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
    save_format = "JPEG" if ext in ("jpg", "jpeg") else "PNG"

    buffer = BytesIO()
    image.save(buffer, format=save_format)
    buffer.seek(0)

    client.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=s3_key,
        Body=buffer,
        ContentType=content_type,
    )

    return _get_public_url(settings.AWS_S3_BUCKET_NAME, s3_key, settings.AWS_REGION)


def upload_json(data: dict, s3_key: str) -> str:
    """
    Upload a dict as a JSON file to S3 and return its public URL.

    Parameters
    ----------
    data : dict
        Dictionary to serialize as JSON.
    s3_key : str
        Full S3 object key (e.g. '2026-06-16/42/result.json').

    Returns
    -------
    str
        Public URL of the uploaded JSON file.
    """
    settings = get_settings()
    client = _get_s3_client()

    json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")

    client.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=s3_key,
        Body=json_bytes,
        ContentType="application/json",
    )

    return _get_public_url(settings.AWS_S3_BUCKET_NAME, s3_key, settings.AWS_REGION)
