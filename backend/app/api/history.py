from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.frame_log import FrameLog
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
def list_history(
    camera_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FrameLog).order_by(FrameLog.processed_at.desc())
    if camera_id:
        q = q.filter(FrameLog.camera_id == camera_id)
    total = q.count()
    rows  = q.offset(offset).limit(limit).all()
    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "items": [
            {
                "id":                   r.id,
                "camera_id":            r.camera_id,
                "camera_name":          r.camera_name,
                "frame_number":         r.frame_number,
                "processed_at":         r.processed_at.isoformat() if r.processed_at else None,
                "vehicle_count":        r.vehicle_count,
                "parked_count":         r.parked_count,
                "violations_created":   r.violations_created,
                "congestion_score":     r.congestion_score,
                "original_image_url":   r.original_image_url,
                "annotated_image_url":  r.annotated_image_url,
                "violation_ids":        r.violation_ids or [],
            }
            for r in rows
        ],
    }


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(FrameLog).filter(FrameLog.id == log_id).first()
    if row:
        db.delete(row)
        db.commit()
