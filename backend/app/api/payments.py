from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.payment import Payment, PaymentStatus, generate_ticket_number
from app.models.violation import Violation, ViolationStatus
from app.api.deps import get_current_user, require_officer_or_admin
from app.models.user import User

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentUpdate(BaseModel):
    payment_status: Optional[PaymentStatus] = None
    amount_paid: Optional[float] = None
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    violation_id: int
    ticket_number: str
    amount_due: float
    amount_paid: float
    payment_status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = None
    escalation_count: int
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[PaymentOut])
def list_payments(
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Payment)
    if payment_status:
        q = q.filter(Payment.payment_status == payment_status)
    return q.order_by(Payment.created_at.desc()).all()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.patch("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(payment, field, value)

    if payload.payment_status == PaymentStatus.paid and not payment.paid_at:
        payment.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(payment)
    return payment


@router.post("/overdue-sweep")
def overdue_sweep(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    """Mark past-due unpaid payments as overdue and escalate repeat offenders."""
    now = datetime.now(timezone.utc)
    unpaid = db.query(Payment).filter(
        Payment.payment_status == PaymentStatus.unpaid,
        Payment.due_date < now,
    ).all()

    updated = 0
    for p in unpaid:
        p.payment_status = PaymentStatus.overdue
        p.escalation_count += 1
        updated += 1

    db.commit()
    return {"swept": updated, "timestamp": now.isoformat()}
