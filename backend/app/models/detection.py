from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    track_id = Column(String, nullable=True, index=True)
    vehicle_class = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    bounding_box = Column(JSON, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    frame_number = Column(Integer, default=0)
    is_parked = Column(Boolean, default=False)
    dwell_seconds = Column(Integer, default=0)
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
