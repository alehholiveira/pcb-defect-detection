"""
SQLAlchemy ORM models for the ML service.

These models reflect the tables created by the Node.js backend migration:
  - inferences
  - inference_images
  - detections

No CREATE TABLE is done here — the schema is owned by the backend.
"""

from datetime import datetime, timezone
from typing import List

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    """Return current UTC time (timezone-naive, matching MySQL DATETIME)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class Inference(Base):
    """
    SQLAlchemy model representing an inference job.
    
    Maps to the 'inferences' table. Stores metadata about the entire batch inference,
    including total time taken and aggregate detection count.
    """

    __tablename__ = "inferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)
    inference_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    total_detections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now(), onupdate=_now
    )

    # Relationship
    images: Mapped[List["InferenceImage"]] = relationship(
        "InferenceImage", back_populates="inference", cascade="all, delete-orphan"
    )


class InferenceImage(Base):
    """
    SQLAlchemy model representing a single image processed during an inference job.
    
    Maps to the 'inference_images' table. Linked to an Inference record and contains
    the S3 URL of the original image and total detections on this specific image.
    """

    __tablename__ = "inference_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inference_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inferences.id", ondelete="CASCADE"), nullable=False
    )
    image_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_detections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now(), onupdate=_now
    )

    # Relationships
    inference: Mapped["Inference"] = relationship("Inference", back_populates="images")
    detections: Mapped[List["Detection"]] = relationship(
        "Detection", back_populates="inference_image", cascade="all, delete-orphan"
    )


class Detection(Base):
    """
    SQLAlchemy model representing a single defect detected on an image.
    
    Maps to the 'detections' table. Stores the bounding box coordinates,
    confidence score, and predicted class name for the defect.
    """

    __tablename__ = "detections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inference_image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inference_images.id", ondelete="CASCADE"), nullable=False
    )
    class_name: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    x1: Mapped[float] = mapped_column(Float, nullable=False)
    y1: Mapped[float] = mapped_column(Float, nullable=False)
    x2: Mapped[float] = mapped_column(Float, nullable=False)
    y2: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, server_default=func.now(), onupdate=_now
    )

    # Relationship
    inference_image: Mapped["InferenceImage"] = relationship(
        "InferenceImage", back_populates="detections"
    )
