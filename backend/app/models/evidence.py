from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class EvidenceType(str, enum.Enum):
    image = "image"
    video_clip = "video_clip"
    annotated_image = "annotated_image"
    plate_crop = "plate_crop"


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    evidence_type = Column(Enum(EvidenceType), nullable=False)
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=True)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String, default="image/jpeg")
    checksum = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)
    frame_number = Column(Integer, nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    violation = relationship("Violation", back_populates="evidence")
