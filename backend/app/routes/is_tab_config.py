"""
GET /companies/{company_id}/is-tab-config
POST /companies/{company_id}/is-tab-config
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db
from app.models.schemas import ISTabConfigRequest, ISTabConfigResponse

router = APIRouter()


@router.get("/companies/{company_id}/is-tab-config", response_model=ISTabConfigResponse)
def get_is_tab_config(company_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT config FROM is_tab_configs WHERE company_id = :cid"),
        {"cid": company_id},
    ).fetchone()

    if not row:
        return ISTabConfigResponse(
            company_id=company_id,
            config={"multiTab": False, "tabs": [], "fieldAssignments": {}},
        )

    return ISTabConfigResponse(
        company_id=company_id,
        config=json.loads(row[0]) if isinstance(row[0], str) else row[0],
    )


@router.post("/companies/{company_id}/is-tab-config", response_model=ISTabConfigResponse)
def save_is_tab_config(
    company_id: int,
    request: ISTabConfigRequest,
    db: Session = Depends(get_db),
):
    # Verify company exists
    company = db.execute(
        text("SELECT id FROM companies WHERE id = :cid"),
        {"cid": company_id},
    ).fetchone()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company {company_id} not found.")

    config_json = json.dumps(request.config)

    existing = db.execute(
        text("SELECT id FROM is_tab_configs WHERE company_id = :cid"),
        {"cid": company_id},
    ).fetchone()

    if existing:
        db.execute(
            text(
                "UPDATE is_tab_configs SET config = :cfg, updated_at = CURRENT_TIMESTAMP "
                "WHERE company_id = :cid"
            ),
            {"cfg": config_json, "cid": company_id},
        )
    else:
        db.execute(
            text(
                "INSERT INTO is_tab_configs (company_id, config) VALUES (:cid, :cfg)"
            ),
            {"cid": company_id, "cfg": config_json},
        )

    db.commit()

    return ISTabConfigResponse(company_id=company_id, config=request.config)
