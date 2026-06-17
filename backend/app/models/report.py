from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ReportType(str, enum.Enum):
    violation_summary = "violation_summary"
    zone_analysis = "zone_analysis"
    daily_digest = "daily_digest"
    incident_report = "incident_report"
    enforcement_recommendation = "enforcement_recommendation"
    trend_analysis = "trend_analysis"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(Enum(ReportType), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # Full LLM-generated markdown
    structured_data = Column(JSON, nullable=True)  # Parsed metrics
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    violation_ids = Column(JSON, nullable=True)  # List of violation IDs covered
    zone_ids = Column(JSON, nullable=True)
    llm_model = Column(String, nullable=True)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_user = relationship("User", back_populates="reports")
