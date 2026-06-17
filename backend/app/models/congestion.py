from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CongestionMetric(Base):
    __tablename__ = "congestion_metrics"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    vehicle_count = Column(Integer, default=0)
    parked_vehicle_count = Column(Integer, default=0)
    moving_vehicle_count = Column(Integer, default=0)
    average_speed_kmh = Column(Float, default=0.0)
    congestion_score = Column(Float, default=0.0)  # 0-100
    violation_count = Column(Integer, default=0)
    blocked_lanes = Column(Integer, default=0)
    flow_rate = Column(Float, default=0.0)  # vehicles per minute
    raw_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    camera = relationship("Camera", back_populates="congestion_metrics")
