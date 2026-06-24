from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.sql import func
import enum
from app.database import Base


class WatchlistReason(str, enum.Enum):
    stolen = "stolen"
    warrant = "warrant"
    unpaid_fines = "unpaid_fines"
    flagged = "flagged"
    other = "other"


class AlertLevel(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class WatchlistEntry(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String, unique=True, index=True, nullable=False)
    reason = Column(Enum(WatchlistReason), nullable=False)
    alert_level = Column(Enum(AlertLevel), default=AlertLevel.warning)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
