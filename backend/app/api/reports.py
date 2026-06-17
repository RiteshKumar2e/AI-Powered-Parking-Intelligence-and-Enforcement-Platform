from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.report import Report, ReportType
from app.models.violation import Violation
from app.models.user import User
from app.api.deps import get_current_user, require_analyst_or_above
from app.schemas.report import ReportCreateRequest, ReportOut
from app.services.reporting import generate_report_with_llm

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/", response_model=List[ReportOut])
def list_reports(
    report_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Report)
    if report_type:
        query = query.filter(Report.report_type == report_type)
    total = query.count()
    items = query.order_by(Report.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return items


@router.post("/", response_model=ReportOut, status_code=201)
def create_report(
    payload: ReportCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above),
):
    period_start = payload.period_start or (datetime.utcnow() - timedelta(hours=24))
    period_end = payload.period_end or datetime.utcnow()

    query = db.query(Violation).filter(
        Violation.frame_timestamp >= period_start,
        Violation.frame_timestamp <= period_end,
    )
    if payload.zone_ids:
        query = query.filter(Violation.zone_id.in_(payload.zone_ids))
    if payload.violation_ids:
        query = query.filter(Violation.id.in_(payload.violation_ids))

    violations = query.all()

    report = generate_report_with_llm(
        db=db,
        report_type=payload.report_type,
        violations=violations,
        period_start=period_start,
        period_end=period_end,
        zone_ids=payload.zone_ids,
        user_id=current_user.id,
    )
    return report


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
