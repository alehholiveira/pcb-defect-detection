"""E2E tests for /health endpoint."""

import pytest


@pytest.mark.asyncio
async def test_health_check_endpoint(client):
    """Test GET /ml-service/health returns 200 OK and status."""
    response = await client.get("/ml-service/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert data["service"] == "PCB Defect ML Service"
    assert "yolo11" in data["models_loaded"]
