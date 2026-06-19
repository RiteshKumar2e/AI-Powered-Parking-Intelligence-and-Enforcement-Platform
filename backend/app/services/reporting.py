"""
LLM-powered report generation using Groq API (llama-3.3-70b-versatile).
Converts raw violation data into structured, human-readable enforcement reports.
"""
import logging
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.config import settings
from app.models.report import Report, ReportType
from app.models.violation import Violation, ViolationStatus
from app.models.zone import Zone

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI assistant for a Smart Parking Intelligence and Enforcement Platform.
You analyze parking violation data and generate structured enforcement reports for traffic authorities.

Your reports must be:
- Clear, professional, and actionable
- Based strictly on the data provided
- Structured with sections: Executive Summary, Key Findings, Violation Analysis,
  Congestion Impact, Priority Zones, Enforcement Recommendations
- Written for traffic officers and administrators

Always respond with a JSON object containing:
{
  "title": "Report title",
  "summary": "2-3 sentence executive summary",
  "content": "Full markdown report",
  "key_metrics": {"total_violations": N, "avg_congestion_score": X, ...},
  "priority_zones": [{"name": str, "violation_count": N, "risk_level": str}],
  "recommendations": ["action 1", "action 2", ...]
}"""


def _build_violation_summary(violations: List[Violation]) -> Dict[str, Any]:
    if not violations:
        return {"total": 0}

    type_counts: Dict[str, int] = {}
    vehicle_counts: Dict[str, int] = {}
    total_congestion = 0.0
    confirmed = 0
    plate_detected = 0

    for v in violations:
        type_counts[v.violation_type.value] = type_counts.get(v.violation_type.value, 0) + 1
        vehicle_counts[v.vehicle_type.value] = vehicle_counts.get(v.vehicle_type.value, 0) + 1
        total_congestion += v.congestion_impact_score
        if v.status == ViolationStatus.confirmed:
            confirmed += 1
        if v.plate_number:
            plate_detected += 1

    return {
        "total": len(violations),
        "confirmed": confirmed,
        "pending_review": len(violations) - confirmed,
        "plate_detection_rate": round(plate_detected / len(violations) * 100, 1),
        "avg_congestion_score": round(total_congestion / len(violations), 2),
        "by_violation_type": type_counts,
        "by_vehicle_type": vehicle_counts,
        "top_violation": max(type_counts, key=type_counts.get) if type_counts else "N/A",
    }


def _build_zone_breakdown(violations: List[Violation], db: Session) -> List[Dict]:
    zone_data: Dict[int, Dict] = {}
    for v in violations:
        zid = v.zone_id or 0
        if zid not in zone_data:
            zone = db.query(Zone).filter(Zone.id == zid).first() if zid else None
            zone_data[zid] = {
                "zone_id": zid,
                "name": zone.name if zone else "Unknown Zone",
                "zone_type": zone.zone_type.value if zone else "general",
                "count": 0,
                "total_congestion": 0.0,
            }
        zone_data[zid]["count"] += 1
        zone_data[zid]["total_congestion"] += v.congestion_impact_score

    result = sorted(zone_data.values(), key=lambda x: x["count"], reverse=True)
    for z in result:
        z["avg_congestion"] = round(z["total_congestion"] / z["count"], 2) if z["count"] else 0
        del z["total_congestion"]
    return result[:10]


def generate_report_with_llm(
    db: Session,
    report_type: ReportType,
    violations: List[Violation],
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    zone_ids: Optional[List[int]] = None,
    user_id: Optional[int] = None,
) -> Report:
    """Generate an LLM-powered enforcement report using Groq."""
    summary_data = _build_violation_summary(violations)
    zone_breakdown = _build_zone_breakdown(violations, db)

    period_str = ""
    if period_start and period_end:
        period_str = f"{period_start.strftime('%Y-%m-%d %H:%M')} to {period_end.strftime('%Y-%m-%d %H:%M')}"

    user_message = f"""Generate a {report_type.value.replace('_', ' ')} report for the following parking enforcement data:

**Period:** {period_str or 'Last 24 hours'}
**Total Violations:** {summary_data['total']}
**Confirmed:** {summary_data.get('confirmed', 0)}
**Average Congestion Impact Score:** {summary_data.get('avg_congestion_score', 0)}/100
**License Plate Detection Rate:** {summary_data.get('plate_detection_rate', 0)}%
**Top Violation Type:** {summary_data.get('top_violation', 'N/A')}

**Violation Breakdown by Type:**
{json.dumps(summary_data.get('by_violation_type', {}), indent=2)}

**Vehicle Type Breakdown:**
{json.dumps(summary_data.get('by_vehicle_type', {}), indent=2)}

**Top Zones with Violations:**
{json.dumps(zone_breakdown, indent=2)}

Generate a comprehensive enforcement report with actionable recommendations."""

    content = None
    title = f"{report_type.value.replace('_', ' ').title()} - {datetime.utcnow().strftime('%Y-%m-%d')}"
    summary_text = f"Analysis of {summary_data['total']} violations detected during the reporting period."
    structured_data = {
        "metrics": summary_data,
        "zone_breakdown": zone_breakdown,
        "recommendations": [],
    }
    input_tokens = 0
    output_tokens = 0
    model_used = "fallback"

    if settings.GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                max_tokens=settings.GROQ_MAX_TOKENS,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
            )
            raw = response.choices[0].message.content
            input_tokens  = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            model_used    = settings.GROQ_MODEL

            try:
                # Strip markdown fences if Groq wraps JSON in ```json … ```
                clean = raw.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                parsed = json.loads(clean)
                title        = parsed.get("title", title)
                summary_text = parsed.get("summary", summary_text)
                content      = parsed.get("content", raw)
                structured_data["key_metrics"]    = parsed.get("key_metrics", {})
                structured_data["priority_zones"] = parsed.get("priority_zones", [])
                structured_data["recommendations"] = parsed.get("recommendations", [])
            except json.JSONDecodeError:
                content = raw
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            content = _generate_fallback_report(summary_data, zone_breakdown, report_type, period_str)
    else:
        logger.info("No GROQ_API_KEY set — using fallback report generator")
        content = _generate_fallback_report(summary_data, zone_breakdown, report_type, period_str)

    report = Report(
        report_type=report_type,
        title=title,
        summary=summary_text,
        content=content,
        structured_data=structured_data,
        period_start=period_start,
        period_end=period_end,
        violation_ids=[v.id for v in violations],
        zone_ids=zone_ids,
        llm_model=model_used,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        created_by=user_id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    logger.info(f"Report {report.id} generated: {report_type.value}")
    return report


def _generate_fallback_report(
    summary: Dict,
    zone_breakdown: List[Dict],
    report_type: ReportType,
    period_str: str,
) -> str:
    """Template-based fallback when Groq API is unavailable."""
    top_zones = "\n".join(
        f"- **{z['name']}** ({z['zone_type']}): {z['count']} violations, avg impact {z['avg_congestion']}/100"
        for z in zone_breakdown[:5]
    )
    type_breakdown = "\n".join(
        f"- {k.replace('_', ' ').title()}: {v}"
        for k, v in summary.get("by_violation_type", {}).items()
    )

    return f"""# Parking Enforcement Report
**Type:** {report_type.value.replace('_', ' ').title()}
**Period:** {period_str or 'Last 24 hours'}
**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}

---

## Executive Summary

During the reporting period, **{summary['total']} parking violations** were detected across monitored zones.
The average congestion impact score was **{summary.get('avg_congestion_score', 0):.1f}/100**,
indicating {"significant" if summary.get('avg_congestion_score', 0) > 50 else "moderate"} traffic impact.
License plates were successfully identified in **{summary.get('plate_detection_rate', 0)}%** of violations.

---

## Key Findings

- Total violations detected: **{summary['total']}**
- Confirmed violations: **{summary.get('confirmed', 0)}**
- Pending officer review: **{summary.get('pending_review', 0)}**
- Most frequent violation: **{summary.get('top_violation', 'N/A').replace('_', ' ').title()}**

---

## Violation Analysis

### By Type
{type_breakdown or "No data available"}

---

## Top Priority Zones

{top_zones or "No zone data available"}

---

## Enforcement Recommendations

1. **Deploy patrols** to the top 3 high-severity zones during peak hours
2. **Review pending violations** — {summary.get('pending_review', 0)} cases awaiting officer confirmation
3. **Increase monitoring frequency** in zones with congestion scores above 70
4. **Cross-reference** flagged plates with outstanding warrant database
5. **Schedule targeted enforcement** during predicted peak violation windows

---

*Report generated by AI-Powered Parking Intelligence Platform*
"""
