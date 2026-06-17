from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ZoneType(str, enum.Enum):
    no_parking = "no_parking"
    restricted = "restricted"
    metro_station = "metro_station"
    commercial = "commercial"
    event = "event"
    intersection = "intersection"
    general = "general"


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    zone_type = Column(Enum(ZoneType), nullable=False, default=ZoneType.general)
    description = Column(Text, nullable=True)
    # GeoJSON polygon stored as JSON (PostGIS geometry in production)
    boundary = Column(JSON, nullable=True)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_meters = Column(Float, default=100.0)
    is_active = Column(Boolean, default=True)
    fine_amount = Column(Float, default=500.0)
    priority_level = Column(Integer, default=2)  # 1=low, 2=medium, 3=high, 4=critical
    max_parking_minutes = Column(Integer, default=0)  # 0 = no parking allowed
    operating_hours = Column(JSON, nullable=True)  # {"start": "08:00", "end": "22:00"}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    violations = relationship("Violation", back_populates="zone")
    hotspots = relationship("Hotspot", back_populates="zone")
    predictions = relationship("Prediction", back_populates="zone")
