from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.watchlist import WatchlistEntry, WatchlistReason, AlertLevel
from app.api.deps import get_current_user, require_officer_or_admin
from app.models.user import User
from app.websocket.manager import manager

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class WatchlistCreate(BaseModel):
    plate_number: str
    reason: WatchlistReason
    alert_level: AlertLevel = AlertLevel.warning
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class WatchlistOut(BaseModel):
    id: int
    plate_number: str
    reason: str
    alert_level: str
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[WatchlistOut])
def list_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.is_active == True)
        .order_by(WatchlistEntry.created_at.desc())
        .all()
    )


@router.post("", response_model=WatchlistOut, status_code=201)
def add_to_watchlist(
    payload: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    normalized = payload.plate_number.upper().replace(" ", "").replace("-", "")
    existing = db.query(WatchlistEntry).filter(WatchlistEntry.plate_number == normalized).first()
    if existing:
        existing.reason = payload.reason
        existing.alert_level = payload.alert_level
        existing.expires_at = payload.expires_at
        existing.notes = payload.notes
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing

    entry = WatchlistEntry(
        plate_number=normalized,
        reason=payload.reason,
        alert_level=payload.alert_level,
        expires_at=payload.expires_at,
        notes=payload.notes,
        added_by=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def remove_from_watchlist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.is_active = False
    db.commit()


@router.get("/check/{plate}")
def check_plate(
    plate: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized = plate.upper().replace(" ", "").replace("-", "")
    entry = db.query(WatchlistEntry).filter(
        WatchlistEntry.plate_number == normalized,
        WatchlistEntry.is_active == True,
    ).first()

    if not entry:
        return {"is_watchlisted": False, "plate": normalized}

    return {
        "is_watchlisted": True,
        "plate": normalized,
        "reason": entry.reason.value,
        "alert_level": entry.alert_level.value,
        "notes": entry.notes,
        "entry_id": entry.id,
    }
