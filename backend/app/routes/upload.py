"""
POST /upload             — Accept an Excel workbook or PDF, return session info.
GET  /files/{session_id}/workbook — Serve the original uploaded workbook for client-side preview.
GET  /files/{session_id}/pdf      — Serve the uploaded PDF for client-side preview.

All upload processing logic lives in UploadService.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import UPLOADS_DIR
from app.db.database import get_db
from app.models.schemas import UploadResponse
from app.services.upload_service import get_upload_service

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
def upload_file(
    file: UploadFile = File(...),
    company_name: str = Form(""),
    reporting_period: str = Form(""),
    db: Session = Depends(get_db),
):
    """
    Accept an Excel workbook or PDF upload.
    Returns sessionId, sheetNames/pdfPageCount, and preview URLs.
    """
    content = file.file.read()
    service = get_upload_service()

    try:
        result = service.process_upload(
            content=content,
            filename=file.filename or "",
            company_name=company_name,
            reporting_period=reporting_period,
            db=db,
        )
    except ValueError as e:
        status = 400
        raise HTTPException(status_code=status, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return UploadResponse(
        sessionId=result.session_id,
        sheetNames=result.sheet_names,
        workbookUrl=result.workbook_url,
        fileType=result.file_type,
        pdfPageCount=result.pdf_page_count or None,
        pdfUrl=result.pdf_url or None,
    )


@router.get("/files/{session_id}/workbook")
def serve_workbook(session_id: str):
    """Serve the original uploaded Excel file for client-side preview."""
    workbook_path = UPLOADS_DIR / session_id / "original.xlsx"
    if not workbook_path.exists():
        raise HTTPException(status_code=404, detail="Workbook not found.")
    return FileResponse(
        path=str(workbook_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="workbook.xlsx",
    )


@router.get("/files/{session_id}/pdf")
def serve_pdf(session_id: str):
    """Serve the uploaded PDF for client-side preview."""
    pdf_path = UPLOADS_DIR / session_id / "original.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="document.pdf",
    )
