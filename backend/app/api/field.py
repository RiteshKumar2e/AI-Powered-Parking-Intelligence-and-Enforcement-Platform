"""
Field Officer API — optimised for mobile-first, single-tap violation capture from the street.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import base64, io

from app.database import get_db
from app.models.violation import Violation, ViolationType, VehicleType, ViolationStatus
from app.models.payment import Payment, PaymentStatus, generate_ticket_number
from app.models.watchlist import WatchlistEntry
from app.api.deps import require_officer_or_admin
from app.models.user import User

router = APIRouter(prefix="/field", tags=["Field"])


class QuickCaptureResponse(BaseModel):
    violation_id: int
    ticket_number: str
    plate_number: Optional[str]
    violation_type: str
    fine_amount: float
    is_watchlisted: bool
    watchlist_reason: Optional[str] = None
    alert_level: Optional[str] = None


@router.post("/quick-capture", response_model=QuickCaptureResponse, status_code=201)
async def quick_capture(
    plate_text: str = Form(...),
    violation_type: ViolationType = Form(ViolationType.illegal_parking),
    vehicle_type: VehicleType = Form(VehicleType.car),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    normalized_plate = plate_text.upper().replace(" ", "").replace("-", "")

    # Check watchlist
    watchlist_hit = db.query(WatchlistEntry).filter(
        WatchlistEntry.plate_number == normalized_plate,
        WatchlistEntry.is_active == True,
    ).first()

    # Store photo if provided
    evidence_url = None
    if photo:
        from app.config import settings
        import os, uuid
        ext = photo.filename.split(".")[-1] if photo.filename else "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        path = os.path.join(settings.LOCAL_STORAGE_PATH, "evidence", filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        content = await photo.read()
        with open(path, "wb") as f:
            f.write(content)
        evidence_url = f"{settings.BACKEND_PUBLIC_URL}/storage/evidence/{filename}"

    fine_amount = 500.0
    violation = Violation(
        violation_type=violation_type,
        vehicle_type=vehicle_type,
        plate_number=normalized_plate,
        latitude=latitude,
        longitude=longitude,
        frame_timestamp=datetime.now(timezone.utc),
        status=ViolationStatus.flagged if watchlist_hit else ViolationStatus.ticket_issued,
        fine_amount=fine_amount,
        notes=notes,
        evidence_image_url=evidence_url,
    )
    db.add(violation)
    db.flush()

    ticket_num = generate_ticket_number()
    payment = Payment(
        violation_id=violation.id,
        ticket_number=ticket_num,
        amount_due=fine_amount,
        payment_status=PaymentStatus.unpaid,
        due_date=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(payment)
    db.commit()
    db.refresh(violation)

    return QuickCaptureResponse(
        violation_id=violation.id,
        ticket_number=ticket_num,
        plate_number=normalized_plate,
        violation_type=violation_type.value,
        fine_amount=fine_amount,
        is_watchlisted=bool(watchlist_hit),
        watchlist_reason=watchlist_hit.reason.value if watchlist_hit else None,
        alert_level=watchlist_hit.alert_level.value if watchlist_hit else None,
    )


@router.get("/plate-check/{plate}")
def plate_check(
    plate: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    """Instant plate lookup: watchlist status + recent violation history."""
    normalized = plate.upper().replace(" ", "").replace("-", "")

    watchlist = db.query(WatchlistEntry).filter(
        WatchlistEntry.plate_number == normalized,
        WatchlistEntry.is_active == True,
    ).first()

    recent = (
        db.query(Violation)
        .filter(Violation.plate_number == normalized)
        .order_by(Violation.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "plate": normalized,
        "is_watchlisted": bool(watchlist),
        "watchlist": {
            "reason": watchlist.reason.value,
            "alert_level": watchlist.alert_level.value,
            "notes": watchlist.notes,
        } if watchlist else None,
        "violation_count": len(recent),
        "recent_violations": [
            {
                "id": v.id,
                "type": v.violation_type.value,
                "status": v.status.value,
                "date": v.created_at.isoformat() if v.created_at else None,
                "fine": v.fine_amount,
            }
            for v in recent
        ],
    }
