"""
Global pytest fixtures for the ML Service.

Includes:
- MySQL Testcontainer setup with automatic schema creation (using Base.metadata)
- Async SQLAlchemy session factory fixture
- FastAPI AsyncClient fixture (httpx)
- Mocks for S3 uploads and ML model loading
"""

import os
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text
from testcontainers.community.mysql import MySqlContainer
import torch

from app.main import app
from app.db.models import Base
from app.core.database import get_db_session
from app.models.loader import ModelName, LoadedModel


@pytest.fixture(scope="session")
def mysql_container() -> Generator[MySqlContainer, None, None]:
    """Spin up a MySQL 8.0 container using Testcontainers."""
    with MySqlContainer("mysql:8.0") as mysql:
        yield mysql


@pytest_asyncio.fixture
async def test_engine(mysql_container: MySqlContainer):
    """Create async SQLAlchemy engine pointing to the Testcontainers MySQL instance."""
    host = mysql_container.get_container_host_ip()
    port = mysql_container.get_exposed_port(3306)
    user = mysql_container.username
    password = mysql_container.password
    dbname = mysql_container.dbname

    dsn = f"mysql+aiomysql://{user}:{password}@{host}:{port}/{dbname}"
    engine = create_async_engine(dsn, echo=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a clean AsyncSession per test function, truncating tables after test."""
    session_factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    # Truncate tables for test isolation
    async with test_engine.begin() as conn:
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        await conn.execute(text("TRUNCATE TABLE detections;"))
        await conn.execute(text("TRUNCATE TABLE inference_images;"))
        await conn.execute(text("TRUNCATE TABLE inferences;"))
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))


@pytest.fixture(autouse=True)
def mock_s3_uploads():
    """Mock S3 upload functions to avoid network calls to AWS."""
    with patch("app.services.inference.upload_image", return_value="https://test-bucket.s3.us-east-1.amazonaws.com/test_image.jpg"), \
         patch("app.services.inference.upload_json", return_value="https://test-bucket.s3.us-east-1.amazonaws.com/test_results.json"), \
         patch("app.core.s3_client.upload_image", return_value="https://test-bucket.s3.us-east-1.amazonaws.com/test_image.jpg"), \
         patch("app.core.s3_client.upload_json", return_value="https://test-bucket.s3.us-east-1.amazonaws.com/test_results.json"):
        yield


@pytest.fixture
def mock_loaded_models():
    """Return a dictionary of mocked LoadedModel instances for testing prediction endpoints."""
    mock_model = MagicMock()
    
    label_map = {1: "mouse_bite", 2: "spur", 3: "missing_hole", 4: "short", 5: "open_circuit", 6: "spurious_copper"}
    
    loaded_yolo = LoadedModel(
        name=ModelName.YOLO11,
        model=mock_model,
        framework="ultralytics",
        label_to_name=label_map,
        score_threshold=0.25,
        device=torch.device("cpu"),
    )
    
    return {
        ModelName.YOLO11: loaded_yolo,
    }


@pytest_asyncio.fixture
async def client(db_session, mock_loaded_models) -> AsyncGenerator[AsyncClient, None]:
    """FastAPI AsyncClient configured with test DB session and mocked models."""
    async def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db_session] = _get_db_override
    app.state.models = mock_loaded_models

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()
