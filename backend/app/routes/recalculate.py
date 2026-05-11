"""
POST /recalculate — Server-side recalculation of computed fields.
Called by frontend after any correction is saved to get authoritative values.
"""
from fastapi import APIRouter, HTTPException

from app.models.schemas import RecalculateRequest
from app.services.recalculate_service import RECALC_FN

router = APIRouter()


@router.post('/recalculate')
def recalculate(request: RecalculateRequest):
    normalized = request.statement_type.lower().replace(' ', '_')
    fn = RECALC_FN.get(normalized)
    if fn is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown statement_type '{request.statement_type}'.",
        )
    result = fn(
        values=request.values,
        ai_matched=request.values,  # use current values as ai_matched baseline
        overrides=request.overrides,
    )
    return {
        'values': result['values'],
        'calculationMeta': result['calculationMeta'],
        'flaggedFields': result['flaggedFields'],
    }
