"""
Lightweight notification service. Sends email via SMTP.
All sends are fire-and-forget (called as FastAPI BackgroundTasks).
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_html: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.debug("SMTP not configured — skipping email to %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
            s.starttls()
            s.login(settings.SMTP_USER, settings.SMTP_PASS)
            s.sendmail(settings.SMTP_USER, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.warning("Email failed to %s: %s", to, exc)
        return False


def notify_violation_created(plate: str, violation_type: str, fine: float, officer_emails: list[str]) -> None:
    if not officer_emails:
        return
    html = f"""
    <h2>New Violation Recorded</h2>
    <p><strong>Plate:</strong> {plate or 'Unknown'}</p>
    <p><strong>Type:</strong> {violation_type.replace('_', ' ').title()}</p>
    <p><strong>Fine:</strong> ₹{fine:.0f}</p>
    <p>Log in to ParkIQ to review.</p>
    """
    for email in officer_emails:
        send_email(email, f"[ParkIQ] New Violation — {plate or 'Unknown'}", html)


def notify_watchlist_hit(plate: str, reason: str, alert_level: str, officer_emails: list[str]) -> None:
    if not officer_emails:
        return
    level_emoji = {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}.get(alert_level, "⚠️")
    html = f"""
    <h2>{level_emoji} Watchlist Alert — {alert_level.upper()}</h2>
    <p><strong>Plate:</strong> {plate}</p>
    <p><strong>Reason:</strong> {reason.replace('_', ' ').title()}</p>
    <p>This vehicle was just detected. Immediate action may be required.</p>
    """
    for email in officer_emails:
        send_email(email, f"[ParkIQ] {level_emoji} WATCHLIST HIT — {plate}", html)
