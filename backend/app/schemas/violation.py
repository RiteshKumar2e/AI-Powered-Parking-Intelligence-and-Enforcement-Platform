from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.violation import ViolationType, VehicleType, ViolationStatus


class ViolationCreate(BaseModel):
    camera_id: Optional[int] = None
    zone_id: Optional[int] = None
    violation_type: ViolationType
    vehicle_type: VehicleType = VehicleType.unknown
    plate_number: Optional[str] = None
    plate_confidence: float = 0.0
    detection_confidence: float = 0.0
    congestion_impact_score: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    frame_timestamp: datetime
    dwell_seconds: int = 0
    fine_amount: float = 500.0
    bounding_box: Optional[Dict[str, float]] = None
    notes: Optional[str] = None


class ViolationUpdate(BaseModel):
    status: Optional[ViolationStatus] = None
    notes: Optional[str] = None
    fine_amount: Optional[float] = None
    plate_number: Optional[str] = None


class ViolationOut(BaseModel):
    id: int
    camera_id: Optional[int]
    zone_id: Optional[int]
    violation_type: ViolationType
    vehicle_type: VehicleType
    plate_number: Optional[str]
    plate_confidence: float
    detection_confidence: float
    congestion_impact_score: float
    latitude: Optional[float]
    longitude: Optional[float]
    frame_timestamp: datetime
    dwell_seconds: int
    status: ViolationStatus
    fine_amount: float
    bounding_box: Optional[Dict]
    evidence_image_url: Optional[str]
    annotated_image_url: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ViolationDetailOut(ViolationOut):
    camera_name: Optional[str] = None
    zone_name: Optional[str] = None
    enforcement_actions: List[Dict] = []

    class Config:
        from_attributes = True


class EnforcementActionCreate(BaseModel):
    action_type: str
    notes: Optional[str] = None
    ticket_number: Optional[str] = None
    fine_amount: Optional[float] = None
