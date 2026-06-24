"""
Repeat offender detection. Called after a new violation is committed.
If a plate has >= threshold violations in the last 30 days, escalates the fine
and automatically adds/updates the watchlist entry.
"""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.violation import Violation
from app.models.watchlist import WatchlistEntry, WatchlistReason, AlertLevel

logger = logging.getLogger(__name__)

REPEAT_THRESHOLD = 3
LOOKBACK_DAYS = 30
FINE_ESCALATION_MULTIPLIER = 1.5


def check_and_flag_repeat(db: Session, plate_number: str, current_violation_id: int) -> dict:
    """Returns dict with is_repeat, violation_count, escalated_fine."""
    if not plate_number:
        return {"is_repeat": False, "violation_count": 0, "escalated_fine": None}

    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    count = (
        db.query(Violation)
        .filter(
            Violation.plate_number == plate_number,
            Violation.created_at >= cutoff,
        )
        .count()
    )

    if count < REPEAT_THRESHOLD:
        return {"is_repeat": False, "violation_count": count, "escalated_fine": None}

    logger.info("Repeat offender detected: %s (%d violations in %d days)", plate_number, count, LOOKBACK_DAYS)

    # Mark current violation with higher fine
    current = db.query(Violation).filter(Violation.id == current_violation_id).first()
    escalated_fine = None
    if current:
        escalated_fine = round(current.fine_amount * FINE_ESCALATION_MULTIPLIER, 2)
        current.fine_amount = escalated_fine
        current.notes = (current.notes or "") + f" [REPEAT OFFENDER: {count} violations in {LOOKBACK_DAYS}d]"

    # Upsert watchlist
    existing = db.query(WatchlistEntry).filter(WatchlistEntry.plate_number == plate_number).first()
    if existing:
        existing.reason = WatchlistReason.unpaid_fines
        existing.alert_level = AlertLevel.warning if count < 6 else AlertLevel.critical
        existing.is_active = True
    else:
        db.add(WatchlistEntry(
            plate_number=plate_number,
            reason=WatchlistReason.unpaid_fines,
            alert_level=AlertLevel.warning if count < 6 else AlertLevel.critical,
            notes=f"Auto-flagged: {count} violations in {LOOKBACK_DAYS} days",
        ))

    db.commit()
    return {"is_repeat": True, "violation_count": count, "escalated_fine": escalated_fine}
