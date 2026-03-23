"""
One-time seed script to populate the companies table with portfolio companies.

Run from project root:   python -m backend.scripts.seed_companies
Run from backend/:        python scripts/seed_companies.py
"""
import os
import re
import sys
from pathlib import Path

# Allow running from either project root or backend/
_here = Path(__file__).resolve().parent.parent  # backend/
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))
# Also allow project root (for -m backend.scripts.seed_companies)
_project_root = _here.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://henry:henry@localhost:5432/henry_db")
COMPANY_CONTEXT_DIR = _here / os.getenv("COMPANY_CONTEXT_DIR", "company_context")

PORTFOLIO_COMPANIES = [
    "48forty",
    "Acara Home Health",
    "AlphaSix",
    "Already Autism Health",
    "Ambient Enterprises",
    "Apple Montessori Schools",
    "Best Friends Pet Hotel",
    "Boston Barricade",
    "BWG Strategy",
    "Caregility",
    "Channel Factory",
    "Chicken Soup For The Soul",
    "Clearview Systems (Rip-It)",
    "Consulting Solutions International",
    "COOP Home Goods",
    "CorTech",
    "Crafty Apes II",
    "Destinations by Design",
    "Douglas Products and Packaging",
    "Erie Strayer",
    "Federal Hearings and Appeals Services",
    "Five Iron Golf",
    "Fremont-Wright",
    "GridSource",
    "HighStar Traffic",
    "Integrated Pain Associates",
    "Japonesque",
    "Jefferson Consulting",
    "Kassel Mechanical",
    "Kelso Industries",
    "Klein Hersh",
    "Linden Research",
    "Masterwork Electronics",
    "MechanAir",
    "Microf",
    "Mission",
    "National Mitigation and Restoration",
    "New Wave Entertainment",
    "NSC Technologies",
    "Nurses 24/7",
    "PadSquad",
    "PQT Ayaquhs",
    "Preferred Care Home Health",
    "Proactive Dealer Solutions",
    "PureCars",
    "Qualified Digital",
    "Quest Events",
    "RadX",
    "Radius GMR",
    "ReachMobi",
    "Revcontent",
    "SkyBell Technologies",
    "Southern Ag",
    "Stonewall",
    "Stryker Electric",
    "Swyft Filings",
    "Texas Contract Manufacturing Group",
    "Town & Country",
    "Trailer Park Group",
    "Uncle John's Pride",
    "USBid",
    "Versar",
    "Vertical Mechanical Group",
    "WatchMojo",
]

# Companies to delete (test data / duplicates)
DELETE_PATTERNS = [
    ("name ILIKE :v", {"v": "%Acme%"}),
    ("name = :v", {"v": "Business Enterprise Company"}),
    ("name = :v", {"v": "usbid"}),
    ("name = :v", {"v": "US Bid"}),
]


def _derive_markdown_filename(company_name: str) -> str:
    lower = company_name.lower()
    underscored = lower.replace(" ", "_")
    cleaned = re.sub(r"[^a-z0-9_]", "", underscored)
    return f"{cleaned}.md"


def main() -> None:
    is_sqlite = DATABASE_URL.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

    created = 0
    skipped = 0
    deleted = 0

    with engine.connect() as conn:
        # ── 1. Delete test/duplicate companies ────────────────────────────────
        for where_clause, params in DELETE_PATTERNS:
            rows = conn.execute(
                text(f"SELECT id, name, markdown_filename FROM companies WHERE {where_clause}"),
                params,
            ).fetchall()
            for row in rows:
                company_id, name, md_filename = row[0], row[1], row[2]

                # Delete related corrections
                conn.execute(
                    text("DELETE FROM company_specific_corrections WHERE company_id = :id"),
                    {"id": company_id},
                )

                # Delete the company row
                conn.execute(
                    text("DELETE FROM companies WHERE id = :id"),
                    {"id": company_id},
                )

                # Delete the markdown file if it exists
                if md_filename:
                    md_path = COMPANY_CONTEXT_DIR / md_filename
                    if md_path.exists():
                        md_path.unlink()
                        print(f"  Deleted file: {md_filename}")

                print(f"  Deleted company: '{name}' (id={company_id})")
                deleted += 1

        conn.commit()

        # ── 2. Fetch existing company names (for case-insensitive dedup) ──────
        existing_rows = conn.execute(
            text("SELECT name FROM companies")
        ).fetchall()
        existing_lower = {row[0].lower() for row in existing_rows}

        # ── 3. Insert missing companies ───────────────────────────────────────
        for company_name in PORTFOLIO_COMPANIES:
            if company_name.lower() in existing_lower:
                print(f"  Skipped (exists): '{company_name}'")
                skipped += 1
                continue

            md_filename = _derive_markdown_filename(company_name)

            if is_sqlite:
                result = conn.execute(
                    text(
                        "INSERT INTO companies (name, markdown_filename) "
                        "VALUES (:name, :filename)"
                    ),
                    {"name": company_name, "filename": md_filename},
                )
            else:
                result = conn.execute(
                    text(
                        "INSERT INTO companies (name, markdown_filename) "
                        "VALUES (:name, :filename) RETURNING id"
                    ),
                    {"name": company_name, "filename": md_filename},
                )

            # Create blank markdown file
            md_path = COMPANY_CONTEXT_DIR / md_filename
            if not md_path.exists():
                md_path.write_text(
                    f"# {company_name} — Classification Context\n\n",
                    encoding="utf-8",
                )

            print(f"  Created: '{company_name}'")
            created += 1
            existing_lower.add(company_name.lower())

        conn.commit()

    print()
    print(f"Done. Created: {created}  Skipped: {skipped}  Deleted: {deleted}")


if __name__ == "__main__":
    main()
