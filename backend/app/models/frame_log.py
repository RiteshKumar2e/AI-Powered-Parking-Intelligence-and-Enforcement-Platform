from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class FrameLog(Base):
    __tablename__ = "frame_logs"

    id                  = Column(Integer, primary_key=True, index=True)
    camera_id           = Column(Integer, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    camera_name         = Column(String, nullable=True)
    frame_number        = Column(Integer, default=0)
    processed_at        = Column(DateTime(timezone=True), nullable=False, index=True)
    vehicle_count       = Column(Integer, default=0)
    parked_count        = Column(Integer, default=0)
    violations_created  = Column(Integer, default=0)
    congestion_score    = Column(Float, default=0.0)
    original_image_url  = Column(String, nullable=True)
    annotated_image_url = Column(String, nullable=True)
    violation_ids       = Column(JSON, default=list)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
