from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class CameraStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"
    error = "error"


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rtsp_url = Column(String, nullable=True)
    status = Column(Enum(CameraStatus), default=CameraStatus.active)
    zone_type = Column(String, default="general")
    fps = Column(Integer, default=25)
    resolution = Column(String, default="1920x1080")
    notes = Column(Text, nullable=True)
    installed_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    violations = relationship("Violation", back_populates="camera")
    congestion_metrics = relationship("CongestionMetric", back_populates="camera")
