"""
POST /datasets/append — Append Layer 1 raw extraction data to the company's
accumulating Excel dataset. All business logic lives in DatasetService.
"""
from fastapi import APIRouter, HTTPException

from app.models.schemas import DatasetAppendRequest
from app.services.dataset_service import get_dataset_service

router = APIRouter()


@router.post("/datasets/append")
def append_to_dataset(request: DatasetAppendRequest):
    """
    Append Layer 1 results for a reporting period to the company's
    yearly Excel dataset. Runs fuzzy matching on line item labels.
    """
    service = get_dataset_service()
    try:
        result = service.append_period(
            company_name=request.company_name,
            reporting_period=request.reporting_period,
            layer1_results=request.layer1_results,
        )
    except ValueError as e:
        status = 409 if "already exists" in str(e) else 400
        raise HTTPException(status_code=status, detail=str(e))

    return result.to_dict()
