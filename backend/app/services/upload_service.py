"""
UploadService — process an uploaded file and initialize a review session.

Deep interface: callers provide raw bytes + filename + metadata;
all session ID generation, directory creation, file type dispatch,
PDF page counting, Excel CSV conversion, and DB record insertion
are hidden behind a single process_upload() call.
"""
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import UPLOADS_DIR, PROCESSED_DIR
from app.services.excel_processor import convert_to_csvs, _safe_filename

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@dataclass
class UploadResult:
    session_id: str
    file_type: str          # 'excel' | 'pdf'
    sheet_names: list       # Excel only
    workbook_url: str       # Excel only
    pdf_page_count: int     # PDF only
    pdf_url: str            # PDF only


class UploadService:
    def __init__(self, uploads_dir: Path = UPLOADS_DIR, processed_dir: Path = PROCESSED_DIR):
        self._uploads_dir = uploads_dir
        self._processed_dir = processed_dir

    # ── Public interface ────────────────────────────────────────────────────────

    def process_upload(
        self,
        content: bytes,
        filename: str,
        company_name: str,
        reporting_period: str,
        db: Session,
    ) -> UploadResult:
        """
        Validate, save, and process an uploaded file. Creates a review session.

        Raises ValueError for invalid inputs (bad file type, file too large, no sheets).
        Raises RuntimeError for processing failures (pypdf error, openpyxl error).
        The DB record is inserted non-fatally — failure is logged but does not raise.
        """
        filename = filename or ""
        is_pdf = filename.lower().endswith(".pdf")
        is_excel = filename.lower().endswith((".xlsx", ".xls"))

        if not is_pdf and not is_excel:
            raise ValueError("Only .xlsx, .xls, and .pdf files are accepted.")

        if len(content) > MAX_FILE_SIZE:
            raise ValueError("File too large. Maximum allowed size is 50 MB.")

        session_id = str(uuid.uuid4())
        upload_session_dir = self._uploads_dir / session_id
        upload_session_dir.mkdir(parents=True, exist_ok=True)
        processed_session_dir = self._processed_dir / session_id
        processed_session_dir.mkdir(parents=True, exist_ok=True)

        if is_pdf:
            result = self._process_pdf(content, session_id, upload_session_dir)
        else:
            result = self._process_excel(content, session_id, upload_session_dir, processed_session_dir)

        self._save_db_record(db, session_id, company_name, reporting_period)
        return result

    # ── File type processors ────────────────────────────────────────────────────

    def _process_pdf(
        self,
        content: bytes,
        session_id: str,
        upload_dir: Path,
    ) -> UploadResult:
        upload_path = upload_dir / "original.pdf"
        upload_path.write_bytes(content)

        try:
            from pypdf import PdfReader
            reader = PdfReader(str(upload_path))
            page_count = len(reader.pages)
        except Exception as e:
            raise RuntimeError(f"Failed to read PDF: {e}") from e

        return UploadResult(
            session_id=session_id,
            file_type="pdf",
            sheet_names=[],
            workbook_url="",
            pdf_page_count=page_count,
            pdf_url=f"/files/{session_id}/pdf",
        )

    def _process_excel(
        self,
        content: bytes,
        session_id: str,
        upload_dir: Path,
        processed_dir: Path,
    ) -> UploadResult:
        upload_path = upload_dir / "original.xlsx"
        upload_path.write_bytes(content)

        try:
            csv_contents = convert_to_csvs(str(upload_path))
        except Exception as e:
            raise RuntimeError(f"Failed to read sheet data: {e}") from e

        if not csv_contents:
            raise ValueError("No visible, non-empty sheets found in the workbook.")

        for sheet_name, csv_text in csv_contents.items():
            safe_name = _safe_filename(sheet_name)
            csv_path = processed_dir / f"{safe_name}.csv"
            csv_path.write_text(csv_text, encoding="utf-8")

        return UploadResult(
            session_id=session_id,
            file_type="excel",
            sheet_names=list(csv_contents.keys()),
            workbook_url=f"/files/{session_id}/workbook",
            pdf_page_count=0,
            pdf_url="",
        )

    # ── DB record (non-fatal) ───────────────────────────────────────────────────

    def _save_db_record(
        self,
        db: Session,
        session_id: str,
        company_name: str,
        reporting_period: str,
    ) -> None:
        """Insert a review row. Non-fatal — failure is swallowed so the upload still succeeds."""
        try:
            db.execute(
                text(
                    "INSERT INTO reviews (session_id, company_name, reporting_period, status) "
                    "VALUES (:sid, :cn, :rp, 'in_progress')"
                ),
                {"sid": session_id, "cn": company_name, "rp": reporting_period},
            )
            db.commit()
        except Exception:
            db.rollback()


# ── Factory ─────────────────────────────────────────────────────────────────────

_instance: Optional[UploadService] = None


def get_upload_service() -> UploadService:
    global _instance
    if _instance is None:
        _instance = UploadService()
    return _instance
