"""
GET /export/{session_id}/csv — Generate a CSV export of the finalized output.
Returns the CSV as a string in JSON (frontend renders it as a table).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.schemas import ExportResponse
from app.services.review_service import get_export_data

router = APIRouter()


@router.get("/export/{session_id}/csv", response_model=ExportResponse)
def get_export(session_id: str, db: Session = Depends(get_db)):
    """
    Load the finalized record from the database and build a CSV matching the
    firm's template format: Field Name, Value, Status.
    Section headers appear as rows with blank value/status cells.
    """
    data = get_export_data(session_id, db)
    return ExportResponse(
        session_id=data["session_id"],
        csv_content=data["csv_content"],
        final_values=data["final_values"],
    )
