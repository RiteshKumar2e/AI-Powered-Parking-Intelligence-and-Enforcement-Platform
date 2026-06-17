from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LicensePlate(Base):
    __tablename__ = "license_plates"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), unique=True)
    raw_text = Column(String, nullable=False)
    normalized_text = Column(String, nullable=True, index=True)
    state_code = Column(String(2), nullable=True)
    district_code = Column(String(2), nullable=True)
    series = Column(String(4), nullable=True)
    number = Column(String(4), nullable=True)
    confidence = Column(Float, default=0.0)
    needs_review = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    crop_image_url = Column(String, nullable=True)
    ocr_alternatives = Column(JSON, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    violation = relationship("Violation", back_populates="plate")
