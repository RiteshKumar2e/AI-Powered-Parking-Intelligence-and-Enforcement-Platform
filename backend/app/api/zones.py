from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.zone import Zone
from app.models.user import User
from app.api.deps import get_current_user, require_admin
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneOut

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.get("", response_model=List[ZoneOut])
def list_zones(
    zone_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Zone)
    if zone_type:
        query = query.filter(Zone.zone_type == zone_type)
    if is_active is not None:
        query = query.filter(Zone.is_active == is_active)
    zones = query.order_by(Zone.priority_level.desc()).all()
    result = []
    for zone in zones:
        data = zone.__dict__.copy()
        data.pop("_sa_instance_state", None)
        data["violation_count"] = len(zone.violations)
        result.append(ZoneOut.model_validate(data))
    return result


@router.post("", response_model=ZoneOut, status_code=201)
def create_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    zone = Zone(**payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    data = zone.__dict__.copy()
    data.pop("_sa_instance_state", None)
    data["violation_count"] = len(zone.violations)
    return ZoneOut.model_validate(data)


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(
    zone_id: int,
    payload: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(zone, key, val)
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=204)
def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(zone)
    db.commit()
