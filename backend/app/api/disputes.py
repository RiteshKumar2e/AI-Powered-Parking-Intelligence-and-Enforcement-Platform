from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app.models.dispute import Dispute, DisputeStatus, DisputeReason
from app.models.violation import Violation, ViolationStatus
from app.api.deps import get_current_user, require_officer_or_admin
from app.models.user import User

router = APIRouter(prefix="/disputes", tags=["Disputes"])


class DisputeCreate(BaseModel):
    violation_id: int
    submitted_by_name: str
    submitted_by_contact: str
    reason_category: DisputeReason
    description: str


class DisputeResolve(BaseModel):
    status: DisputeStatus
    resolution_notes: Optional[str] = None


class DisputeOut(BaseModel):
    id: int
    violation_id: int
    submitted_by_name: str
    submitted_by_contact: str
    reason_category: str
    description: str
    status: str
    resolution_notes: Optional[str] = None
    submitted_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("", response_model=DisputeOut, status_code=201)
def submit_dispute(payload: DisputeCreate, db: Session = Depends(get_db)):
    """Public endpoint — no auth required. Vehicle owners submit disputes here."""
    violation = db.query(Violation).filter(Violation.id == payload.violation_id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    existing = db.query(Dispute).filter(Dispute.violation_id == payload.violation_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="A dispute already exists for this violation")

    dispute = Dispute(**payload.dict())
    db.add(dispute)

    violation.status = ViolationStatus.appealed
    db.commit()
    db.refresh(dispute)
    return dispute


@router.get("", response_model=List[DisputeOut])
def list_disputes(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Dispute)
    if status:
        q = q.filter(Dispute.status == status)
    return q.order_by(Dispute.submitted_at.desc()).all()


@router.patch("/{dispute_id}", response_model=DisputeOut)
def resolve_dispute(
    dispute_id: int,
    payload: DisputeResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = payload.status
    dispute.resolution_notes = payload.resolution_notes
    dispute.reviewed_by = current_user.id
    dispute.resolved_at = datetime.now(timezone.utc)

    if payload.status == DisputeStatus.approved:
        violation = db.query(Violation).filter(Violation.id == dispute.violation_id).first()
        if violation:
            violation.status = ViolationStatus.dismissed

    db.commit()
    db.refresh(dispute)
    return dispute
