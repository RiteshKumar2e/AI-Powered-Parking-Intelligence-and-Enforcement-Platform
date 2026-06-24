from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.audit_log import AuditLog
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit"])


class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    entity_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if actor_id:
        q = q.filter(AuditLog.actor_id == actor_id)
    if action:
        q = q.filter(AuditLog.action.contains(action))
    return q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
