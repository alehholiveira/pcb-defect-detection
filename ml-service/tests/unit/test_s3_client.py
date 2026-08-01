"""Unit tests for app.core.s3_client."""

from unittest.mock import MagicMock, patch
from PIL import Image

from app.core.s3_client import upload_image, upload_json, _get_public_url


def test_get_public_url():
    """Test URL generation helper."""
    url = _get_public_url("my-bucket", "folder/file.jpg", "us-east-1")
    assert url == "https://my-bucket.s3.us-east-1.amazonaws.com/folder/file.jpg"


@patch("app.core.s3_client._get_s3_client")
def test_upload_image(mock_get_s3):
    """Test upload_image formats and calls put_object."""
    mock_boto = MagicMock()
    mock_get_s3.return_value = mock_boto

    img = Image.new("RGB", (100, 100), color="red")
    url = upload_image(img, "2026/test.jpg", "test.jpg")

    assert "test-bucket" in url or "amazonaws" in url
    mock_boto.put_object.assert_called_once()
    kwargs = mock_boto.put_object.call_args.kwargs
    assert kwargs["Key"] == "2026/test.jpg"
    assert kwargs["ContentType"] == "image/jpeg"


@patch("app.core.s3_client._get_s3_client")
def test_upload_json(mock_get_s3):
    """Test upload_json serializes dict and uploads to S3."""
    mock_boto = MagicMock()
    mock_get_s3.return_value = mock_boto

    data = {"status": "ok", "count": 5}
    url = upload_json(data, "2026/data.json")

    assert "2026/data.json" in url
    mock_boto.put_object.assert_called_once()
    kwargs = mock_boto.put_object.call_args.kwargs
    assert kwargs["Key"] == "2026/data.json"
    assert kwargs["ContentType"] == "application/json"
