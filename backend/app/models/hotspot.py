from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    grid_cell = Column(String, nullable=True, index=True)  # H3 or grid ref
    violation_count = Column(Integer, default=0)
    avg_congestion_score = Column(Float, default=0.0)
    peak_hour = Column(Integer, nullable=True)  # 0-23
    peak_day = Column(Integer, nullable=True)   # 0=Mon, 6=Sun
    severity_level = Column(Integer, default=1)  # 1-5
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    vehicle_type_breakdown = Column(JSON, nullable=True)
    violation_type_breakdown = Column(JSON, nullable=True)
    trend = Column(String, default="stable")  # rising, stable, falling
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    zone = relationship("Zone", back_populates="hotspots")
