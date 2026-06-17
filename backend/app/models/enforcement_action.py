from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ActionType(str, enum.Enum):
    confirm = "confirm"
    dismiss = "dismiss"
    issue_ticket = "issue_ticket"
    escalate = "escalate"
    request_review = "request_review"
    mark_resolved = "mark_resolved"


class EnforcementAction(Base):
    __tablename__ = "enforcement_actions"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    notes = Column(Text, nullable=True)
    ticket_number = Column(String, nullable=True)
    fine_amount = Column(Float, nullable=True)
    action_timestamp = Column(DateTime(timezone=True), server_default=func.now())

    violation = relationship("Violation", back_populates="enforcement_actions")
    officer = relationship("User", back_populates="enforcement_actions")
