from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.report import ReportType


class ReportCreateRequest(BaseModel):
    report_type: ReportType
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    zone_ids: Optional[List[int]] = None
    violation_ids: Optional[List[int]] = None
    custom_prompt: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    report_type: ReportType
    title: str
    summary: Optional[str]
    content: Optional[str]
    structured_data: Optional[Dict]
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    llm_model: Optional[str]
    input_tokens: int
    output_tokens: int
    created_at: datetime

    class Config:
        from_attributes = True
