from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.plate import LicensePlate
from app.models.user import User
from app.api.deps import get_current_user, require_officer_or_admin

router = APIRouter(prefix="/plates", tags=["License Plates"])


@router.get("/")
def list_plates(
    needs_review: Optional[bool] = None,
    plate_text: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LicensePlate)
    if needs_review is not None:
        query = query.filter(LicensePlate.needs_review == needs_review)
    if plate_text:
        query = query.filter(LicensePlate.normalized_text.ilike(f"%{plate_text}%"))

    total = query.count()
    items = query.order_by(LicensePlate.detected_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{plate_id}")
def get_plate(
    plate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plate = db.query(LicensePlate).filter(LicensePlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Plate record not found")
    return plate


@router.patch("/{plate_id}/verify")
def verify_plate(
    plate_id: int,
    corrected_text: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    from datetime import datetime
    plate = db.query(LicensePlate).filter(LicensePlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Plate record not found")

    if corrected_text:
        plate.normalized_text = corrected_text.upper().strip()
        if plate.violation:
            plate.violation.plate_number = plate.normalized_text

    plate.is_verified = True
    plate.needs_review = False
    plate.reviewed_at = datetime.utcnow()
    db.commit()
    return {"message": "Plate verified", "normalized_text": plate.normalized_text}


@router.get("/search/{plate_text}")
def search_plate_history(
    plate_text: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plates = (
        db.query(LicensePlate)
        .filter(LicensePlate.normalized_text.ilike(f"%{plate_text.upper()}%"))
        .order_by(LicensePlate.detected_at.desc())
        .limit(50)
        .all()
    )
    return {
        "plate_text": plate_text,
        "occurrences": len(plates),
        "records": [
            {
                "id": p.id,
                "violation_id": p.violation_id,
                "normalized_text": p.normalized_text,
                "confidence": p.confidence,
                "detected_at": p.detected_at.isoformat(),
                "is_verified": p.is_verified,
            }
            for p in plates
        ],
    }
