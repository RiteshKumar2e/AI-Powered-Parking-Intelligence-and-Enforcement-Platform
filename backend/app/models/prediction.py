from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    forecast_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    predicted_violation_count = Column(Float, default=0.0)
    predicted_congestion_score = Column(Float, default=0.0)
    confidence_lower = Column(Float, default=0.0)
    confidence_upper = Column(Float, default=0.0)
    risk_level = Column(String, default="low")  # low, medium, high, critical
    recommended_patrol_count = Column(Integer, default=0)
    recommendation = Column(String, nullable=True)
    model_version = Column(String, default="v1")
    features_used = Column(JSON, nullable=True)
    actual_violation_count = Column(Float, nullable=True)  # for backtesting
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    zone = relationship("Zone", back_populates="predictions")
