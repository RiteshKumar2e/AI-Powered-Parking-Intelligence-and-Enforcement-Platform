from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.zone import ZoneType


class ZoneCreate(BaseModel):
    name: str
    zone_type: ZoneType = ZoneType.general
    description: Optional[str] = None
    boundary: Optional[Dict] = None
    center_lat: float
    center_lng: float
    radius_meters: float = 100.0
    fine_amount: float = 500.0
    priority_level: int = 2
    max_parking_minutes: int = 0
    operating_hours: Optional[Dict] = None


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[ZoneType] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    fine_amount: Optional[float] = None
    priority_level: Optional[int] = None
    max_parking_minutes: Optional[int] = None


class ZoneOut(BaseModel):
    id: int
    name: str
    zone_type: ZoneType
    description: Optional[str]
    boundary: Optional[Dict]
    center_lat: float
    center_lng: float
    radius_meters: float
    is_active: bool
    fine_amount: float
    priority_level: int
    max_parking_minutes: int
    operating_hours: Optional[Dict]
    created_at: datetime
    violation_count: int = 0

    class Config:
        from_attributes = True
