"""
Admin endpoints for company context management.

GET  /admin/company-context/{company_id} — Full context contents from DB
PUT  /admin/company-context/{company_id} — Overwrite the context in DB
POST /admin/write-rule                   — Submit a rule through Layer A → Layer B pipeline
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db
from app.models.schemas import AdminContextUpdateRequest, AdminWriteRuleRequest
from app.services.company_context_service import write_rule
from app.utils.text_utils import markdown_body_word_count

router = APIRouter(prefix="/admin")


@router.get("/company-context/{company_id}")
def admin_company_context(company_id: int, db: Session = Depends(get_db)):
    """Return the full contents of a company's context from DB."""
    row = db.execute(
        text("SELECT id, name, context FROM companies WHERE id = :id"),
        {"id": company_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Company {company_id} not found.")

    name = row[1]
    content = row[2] or ""
    word_count = markdown_body_word_count(content) if content.strip() else 0

    return {
        "id": company_id,
        "name": name,
        "word_count": word_count,
        "content": content,
    }


@router.put("/company-context/{company_id}")
def admin_update_company_context(
    company_id: int,
    request: AdminContextUpdateRequest,
    db: Session = Depends(get_db),
):
    """Directly overwrite the company's context in DB."""
    row = db.execute(
        text("SELECT id FROM companies WHERE id = :id"),
        {"id": company_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found.")

    db.execute(
        text("UPDATE companies SET context = :ctx WHERE id = :id"),
        {"ctx": request.content, "id": company_id},
    )
    db.commit()

    return {"success": True, "word_count": markdown_body_word_count(request.content)}


@router.post("/write-rule")
def admin_write_rule(
    request: AdminWriteRuleRequest,
    db: Session = Depends(get_db),
):
    """Submit a rule through Layer A → Layer B pipeline."""
    row = db.execute(
        text("SELECT id, name, context FROM companies WHERE id = :company_id"),
        {"company_id": request.company_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found.")

    company_id, company_name, current_context = row
    current_markdown = current_context or f"# {company_name} — Classification Context\n\n"

    return write_rule(
        company_id=company_id,
        company_name=company_name,
        current_markdown=current_markdown,
        field_name=request.field_name,
        statement_type=request.statement_type,
        rule_text=request.rule_text,
        db=db,
    )
