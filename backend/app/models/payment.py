from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import random
import string
from app.database import Base


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    partial = "partial"
    overdue = "overdue"
    escalated = "escalated"
    waived = "waived"


def generate_ticket_number() -> str:
    return "TKT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    ticket_number = Column(String, unique=True, index=True, nullable=False, default=generate_ticket_number)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid)
    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_method = Column(String, nullable=True)
    transaction_ref = Column(String, nullable=True)
    escalation_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    violation = relationship("Violation", backref="payment", uselist=False)
