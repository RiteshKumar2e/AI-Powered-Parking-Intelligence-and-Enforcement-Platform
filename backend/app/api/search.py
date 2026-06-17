from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.violation import Violation
from app.models.plate import LicensePlate
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
def search(
    q: str = Query(..., min_length=2, description="Search query (plate number, location, etc.)"),
    entity: Optional[str] = Query(None, description="Filter by entity: violations, plates"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = {"violations": [], "plates": [], "query": q}

    if entity in (None, "violations"):
        violations = (
            db.query(Violation)
            .filter(Violation.plate_number.ilike(f"%{q}%"))
            .order_by(Violation.frame_timestamp.desc())
            .limit(limit)
            .all()
        )
        results["violations"] = [
            {
                "id": v.id,
                "plate_number": v.plate_number,
                "violation_type": v.violation_type.value,
                "status": v.status.value,
                "timestamp": v.frame_timestamp.isoformat(),
                "congestion_score": v.congestion_impact_score,
            }
            for v in violations
        ]

    if entity in (None, "plates"):
        plates = (
            db.query(LicensePlate)
            .filter(LicensePlate.normalized_text.ilike(f"%{q.upper()}%"))
            .order_by(LicensePlate.detected_at.desc())
            .limit(limit)
            .all()
        )
        results["plates"] = [
            {
                "id": p.id,
                "violation_id": p.violation_id,
                "normalized_text": p.normalized_text,
                "confidence": p.confidence,
                "detected_at": p.detected_at.isoformat(),
                "is_verified": p.is_verified,
            }
            for p in plates
        ]

    results["total"] = len(results["violations"]) + len(results["plates"])
    return results
