"""
Shared helpers for admin route modules.
"""
import json
from typing import List

from app.config import DATA_DIR

CHANGELOG_PATH = DATA_DIR / "company_context_changelog.jsonl"
ALERTS_PATH = DATA_DIR / "alerts.jsonl"
GENERAL_FIXES_PATH = DATA_DIR / "general_fixes.csv"


def read_jsonl(path) -> List[dict]:
    """Read a JSONL file and return a list of parsed objects, skipping bad lines."""
    if not path.exists():
        return []
    entries = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return []
    return entries


def scan_duplicate_companies(db) -> None:
    """Detect normalized name collisions among all companies. Append new alerts for untracked pairs."""
    from datetime import datetime, timezone
    from sqlalchemy import text
    from app.routes.companies import _normalize_company_name

    all_companies = db.execute(
        text("SELECT id, name FROM companies ORDER BY id ASC")
    ).fetchall()

    norm_map: dict[str, list[tuple[int, str]]] = {}
    for cid, cname in all_companies:
        norm = _normalize_company_name(cname)
        norm_map.setdefault(norm, []).append((cid, cname))

    colliding_pairs: set[tuple[int, int]] = set()
    for group in norm_map.values():
        if len(group) < 2:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                pair = (min(group[i][0], group[j][0]), max(group[i][0], group[j][0]))
                colliding_pairs.add(pair)

    existing_alerts = read_jsonl(ALERTS_PATH)
    tracked_pairs: dict[tuple[int, int], str] = {}
    for alert in existing_alerts:
        if alert.get("type") == "duplicate_company_name":
            a = alert.get("company_id_a", 0)
            b = alert.get("company_id_b", 0)
            pair = (min(a, b), max(a, b))
            tracked_pairs[pair] = alert.get("status", "open")

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    id_to_name = {cid: cname for cid, cname in all_companies}
    new_alerts = []

    for pair in colliding_pairs:
        existing_status = tracked_pairs.get(pair)
        if existing_status in ("resolved", "open"):
            continue
        norm = _normalize_company_name(id_to_name.get(pair[0], ""))
        new_alerts.append({
            "timestamp": timestamp,
            "type": "duplicate_company_name",
            "company_id_a": pair[0],
            "company_name_a": id_to_name.get(pair[0], ""),
            "company_id_b": pair[1],
            "company_name_b": id_to_name.get(pair[1], ""),
            "normalized_name": norm,
            "message": f"Possible duplicate companies: '{id_to_name.get(pair[0], '')}' and '{id_to_name.get(pair[1], '')}'.",
            "status": "open",
        })

    if new_alerts:
        with ALERTS_PATH.open("a", encoding="utf-8") as f:
            for alert in new_alerts:
                f.write(json.dumps(alert) + "\n")
