from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class DisputeStatus(str, enum.Enum):
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"


class DisputeReason(str, enum.Enum):
    incorrect_plate = "incorrect_plate"
    vehicle_not_present = "vehicle_not_present"
    valid_permit = "valid_permit"
    signage_unclear = "signage_unclear"
    other = "other"


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    submitted_by_name = Column(String, nullable=False)
    submitted_by_contact = Column(String, nullable=False)
    reason_category = Column(Enum(DisputeReason), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.pending)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    violation = relationship("Violation", backref="dispute")
