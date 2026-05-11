"""
Admin endpoints for alerts, changelog, and general fixes.

GET /admin/changelog           — Entries from company_context_changelog.jsonl
GET /admin/alerts              — Entries from alerts.jsonl (with duplicate scan)
PUT /admin/alerts/update-status— Update alert status by line index
GET /admin/general-fixes       — Rows from general_fixes.csv
"""
import csv
import json
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import AlertStatusUpdateRequest
from app.routes.admin_utils import ALERTS_PATH, CHANGELOG_PATH, GENERAL_FIXES_PATH, read_jsonl, scan_duplicate_companies

router = APIRouter(prefix="/admin")


@router.get("/changelog")
def admin_changelog(
    company_id: Optional[int] = Query(default=None),
    limit: int = Query(default=50, ge=1),
):
    """Return entries from company_context_changelog.jsonl, newest first."""
    entries = read_jsonl(CHANGELOG_PATH)

    if company_id is not None:
        entries = [e for e in entries if e.get("company_id") == company_id]

    entries.reverse()
    entries = entries[:limit]

    return {"total_entries": len(entries), "entries": entries}


@router.get("/alerts")
def admin_alerts(
    status_filter: Optional[str] = Query(default="open", alias="status"),
    db: Session = Depends(get_db),
):
    """Return all alerts. Runs duplicate company scan on each call to detect new duplicates."""
    scan_duplicate_companies(db)

    entries = read_jsonl(ALERTS_PATH)

    for e in entries:
        if "resolved" in e and "status" not in e:
            e["status"] = "resolved" if e["resolved"] else "open"

    for i, e in enumerate(entries):
        e["_file_index"] = i

    if status_filter and status_filter != "all":
        entries = [e for e in entries if e.get("status") == status_filter]

    entries.reverse()

    return {"total_alerts": len(entries), "alerts": entries}


@router.put("/alerts/update-status")
def admin_update_alert_status(request: AlertStatusUpdateRequest):
    """Update the status of an alert by its line index in alerts.jsonl."""
    entries = read_jsonl(ALERTS_PATH)

    if request.index < 0 or request.index >= len(entries):
        raise HTTPException(status_code=404, detail="Alert index out of range.")

    valid_statuses = {"open", "resolved", "fixed"}
    if request.new_status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Status must be one of: {valid_statuses}")

    entries[request.index]["status"] = request.new_status

    with ALERTS_PATH.open("w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")

    return {"success": True, "index": request.index, "new_status": request.new_status}


@router.get("/general-fixes")
def admin_general_fixes(
    limit: int = Query(default=50, ge=1),
    company: Optional[str] = Query(default=None),
):
    """Return rows from general_fixes.csv, newest first."""
    if not GENERAL_FIXES_PATH.exists():
        return {"total_entries": 0, "entries": []}

    try:
        text_content = GENERAL_FIXES_PATH.read_text(encoding="utf-8")
    except OSError:
        return {"total_entries": 0, "entries": []}

    rows = []
    reader = csv.DictReader(StringIO(text_content))
    for row in reader:
        try:
            rows.append(dict(row))
        except Exception:
            continue

    if company:
        company_lower = company.lower()
        rows = [r for r in rows if company_lower in (r.get("company") or "").lower()]

    rows.reverse()
    rows = rows[:limit]

    return {"total_entries": len(rows), "entries": rows}
