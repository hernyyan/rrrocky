"""
Statement tab config routes.

GET  /companies/{company_id}/statement-tab-configs
     Returns all saved tab configs for a company keyed by statement_type.
     e.g. { "income_statement": { "tab": "Income Statement" }, ... }

POST /companies/{company_id}/statement-tab-configs/{statement_type}
     Upserts the tab config for one statement type.
     Payload: { "tab": "Sheet Name" }
"""
from __future__ import annotations

import json
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db

router = APIRouter()


@router.get("/companies/{company_id}/statement-tab-configs")
def get_statement_tab_configs(
    company_id: int,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    rows = db.execute(
        text("SELECT statement_type, config FROM statement_tab_configs WHERE company_id = :cid"),
        {"cid": company_id},
    ).fetchall()

    result: Dict[str, Any] = {}
    for row in rows:
        stmt_type, config = row[0], row[1]
        if isinstance(config, str):
            config = json.loads(config)
        result[stmt_type] = config

    return result


@router.post("/companies/{company_id}/statement-tab-configs/{statement_type}")
def save_statement_tab_config(
    company_id: int,
    statement_type: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
) -> Dict[str, bool]:
    config_json = json.dumps(payload)

    updated = db.execute(
        text("""
            UPDATE statement_tab_configs
            SET config = :config, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :cid AND statement_type = :stmt
        """),
        {"config": config_json, "cid": company_id, "stmt": statement_type},
    )

    if updated.rowcount == 0:
        db.execute(
            text("""
                INSERT INTO statement_tab_configs (company_id, statement_type, config)
                VALUES (:cid, :stmt, :config)
            """),
            {"cid": company_id, "stmt": statement_type, "config": config_json},
        )

    db.commit()
    return {"success": True}
