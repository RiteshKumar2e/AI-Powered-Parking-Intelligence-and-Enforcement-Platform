from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.camera import CameraStatus


class CameraCreate(BaseModel):
    name: str
    location_name: str
    latitude: float
    longitude: float
    rtsp_url: Optional[str] = None
    status: CameraStatus = CameraStatus.active
    zone_type: str = "general"
    fps: int = 25
    resolution: str = "1920x1080"
    notes: Optional[str] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location_name: Optional[str] = None
    rtsp_url: Optional[str] = None
    status: Optional[CameraStatus] = None
    notes: Optional[str] = None


class CameraOut(BaseModel):
    id: int
    name: str
    location_name: str
    latitude: float
    longitude: float
    rtsp_url: Optional[str]
    status: CameraStatus
    zone_type: str
    fps: int
    resolution: str
    notes: Optional[str]
    installed_at: datetime
    last_active: Optional[datetime]
    violation_count: int = 0

    class Config:
        from_attributes = True
