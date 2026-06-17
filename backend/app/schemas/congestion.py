from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CongestionMetricOut(BaseModel):
    id: int
    camera_id: Optional[int]
    latitude: float
    longitude: float
    timestamp: datetime
    vehicle_count: int
    parked_vehicle_count: int
    moving_vehicle_count: int
    average_speed_kmh: float
    congestion_score: float
    violation_count: int
    blocked_lanes: int
    flow_rate: float

    class Config:
        from_attributes = True


class HotspotOut(BaseModel):
    id: int
    zone_id: Optional[int]
    latitude: float
    longitude: float
    violation_count: int
    avg_congestion_score: float
    severity_level: int
    peak_hour: Optional[int]
    period_start: datetime
    period_end: datetime
    trend: str
    violation_type_breakdown: Optional[dict]

    class Config:
        from_attributes = True


class PredictionOut(BaseModel):
    id: int
    zone_id: Optional[int]
    latitude: float
    longitude: float
    forecast_timestamp: datetime
    predicted_violation_count: float
    predicted_congestion_score: float
    confidence_lower: float
    confidence_upper: float
    risk_level: str
    recommended_patrol_count: int
    recommendation: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float
    violation_count: int
    severity: int
