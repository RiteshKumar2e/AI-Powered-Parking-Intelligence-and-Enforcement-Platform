from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ViolationType(str, enum.Enum):
    illegal_parking = "illegal_parking"
    double_parking = "double_parking"
    no_parking_zone = "no_parking_zone"
    blocking_intersection = "blocking_intersection"
    pavement_parking = "pavement_parking"
    bus_stop_parking = "bus_stop_parking"
    fire_hydrant_blocking = "fire_hydrant_blocking"
    wrong_side_driving = "wrong_side_driving"
    red_light_violation = "red_light_violation"
    stop_line_violation = "stop_line_violation"
    helmet_non_compliance = "helmet_non_compliance"
    seatbelt_non_compliance = "seatbelt_non_compliance"
    triple_riding = "triple_riding"
    other = "other"


class VehicleType(str, enum.Enum):
    car = "car"
    motorcycle = "motorcycle"
    truck = "truck"
    bus = "bus"
    auto_rickshaw = "auto_rickshaw"
    bicycle = "bicycle"
    unknown = "unknown"


class ViolationStatus(str, enum.Enum):
    pending_review = "pending_review"
    confirmed = "confirmed"
    dismissed = "dismissed"
    ticket_issued = "ticket_issued"
    appealed = "appealed"


class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    violation_type = Column(Enum(ViolationType), nullable=False)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.unknown)
    plate_number = Column(String, nullable=True, index=True)
    plate_confidence = Column(Float, default=0.0)
    detection_confidence = Column(Float, default=0.0)
    congestion_impact_score = Column(Float, default=0.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    frame_timestamp = Column(DateTime(timezone=True), nullable=False)
    dwell_seconds = Column(Integer, default=0)
    status = Column(Enum(ViolationStatus), default=ViolationStatus.pending_review)
    fine_amount = Column(Float, default=500.0)
    bounding_box = Column(JSON, nullable=True)  # {"x": 100, "y": 200, "w": 150, "h": 80}
    evidence_image_url = Column(String, nullable=True)
    evidence_video_url = Column(String, nullable=True)
    annotated_image_url = Column(String, nullable=True)
    raw_detection_data = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    camera = relationship("Camera", back_populates="violations")
    zone = relationship("Zone", back_populates="violations")
    plate = relationship("LicensePlate", back_populates="violation", uselist=False)
    evidence = relationship("Evidence", back_populates="violation")
    enforcement_actions = relationship("EnforcementAction", back_populates="violation")
