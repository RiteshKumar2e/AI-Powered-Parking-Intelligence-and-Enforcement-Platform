from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.violation import Violation, ViolationStatus, ViolationType
from app.models.enforcement_action import EnforcementAction, ActionType
from app.models.user import User
from app.api.deps import get_current_user, require_officer_or_admin
from app.schemas.violation import ViolationOut, ViolationDetailOut, ViolationUpdate, EnforcementActionCreate
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/violations", tags=["Violations"])


@router.get("/", response_model=PaginatedResponse[ViolationOut])
def list_violations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    violation_type: Optional[str] = None,
    camera_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    plate_number: Optional[str] = None,
    hours_back: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Violation)
    if status:
        query = query.filter(Violation.status == status)
    if violation_type:
        query = query.filter(Violation.violation_type == violation_type)
    if camera_id:
        query = query.filter(Violation.camera_id == camera_id)
    if zone_id:
        query = query.filter(Violation.zone_id == zone_id)
    if plate_number:
        query = query.filter(Violation.plate_number.ilike(f"%{plate_number}%"))
    if hours_back:
        since = datetime.utcnow() - timedelta(hours=hours_back)
        query = query.filter(Violation.frame_timestamp >= since)

    total = query.count()
    items = query.order_by(Violation.frame_timestamp.desc()).offset((page - 1) * size).limit(size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/stats")
def violation_stats(
    hours_back: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours_back)
    violations = db.query(Violation).filter(Violation.frame_timestamp >= since).all()

    by_type: dict = {}
    by_vehicle: dict = {}
    by_status: dict = {}
    total_congestion = 0.0

    for v in violations:
        key = v.violation_type.value
        by_type[key] = by_type.get(key, 0) + 1
        vk = v.vehicle_type.value
        by_vehicle[vk] = by_vehicle.get(vk, 0) + 1
        sk = v.status.value
        by_status[sk] = by_status.get(sk, 0) + 1
        total_congestion += v.congestion_impact_score

    return {
        "total": len(violations),
        "avg_congestion_impact": round(total_congestion / len(violations), 2) if violations else 0,
        "by_type": by_type,
        "by_vehicle": by_vehicle,
        "by_status": by_status,
        "period_hours": hours_back,
    }


@router.get("/{violation_id}", response_model=ViolationDetailOut)
def get_violation(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    detail = ViolationDetailOut.model_validate(v)
    if v.camera:
        detail.camera_name = v.camera.name
    if v.zone:
        detail.zone_name = v.zone.name
    detail.enforcement_actions = [
        {
            "id": a.id,
            "action_type": a.action_type.value,
            "officer": a.officer.full_name if a.officer else None,
            "notes": a.notes,
            "timestamp": a.action_timestamp.isoformat(),
        }
        for a in v.enforcement_actions
    ]
    return detail


@router.patch("/{violation_id}", response_model=ViolationOut)
def update_violation(
    violation_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, key, val)
    db.commit()
    db.refresh(v)
    return v


@router.post("/{violation_id}/actions", status_code=201)
def create_enforcement_action(
    violation_id: int,
    payload: EnforcementActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin),
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    action = EnforcementAction(
        violation_id=violation_id,
        officer_id=current_user.id,
        action_type=payload.action_type,
        notes=payload.notes,
        ticket_number=payload.ticket_number,
        fine_amount=payload.fine_amount,
    )
    db.add(action)

    # Update violation status based on action
    if payload.action_type == "confirm":
        v.status = ViolationStatus.confirmed
    elif payload.action_type == "dismiss":
        v.status = ViolationStatus.dismissed
    elif payload.action_type == "issue_ticket":
        v.status = ViolationStatus.ticket_issued

    db.commit()
    db.refresh(action)
    return {"id": action.id, "status": v.status.value, "message": "Action recorded"}
