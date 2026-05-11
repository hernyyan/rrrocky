"""
Database connection and setup using SQLAlchemy.
Supports PostgreSQL (primary) and SQLite (fallback for local testing).

Postgres auth modes (controlled by DB_AUTH_MODE):
  - "password": credentials baked into DATABASE_URL (default; used locally)
  - "entra":    fresh Microsoft Entra access token injected per new connection
                using DefaultAzureCredential. Pool is tuned to recycle
                connections before the 1-hour token TTL expires.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, Session
from app.config import DATABASE_URL, DB_AUTH_MODE

_IS_SQLITE = DATABASE_URL.startswith("sqlite")
_USE_ENTRA = (not _IS_SQLITE) and DB_AUTH_MODE == "entra"

# Azure Database for PostgreSQL Entra token audience.
_ENTRA_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"

connect_args = {}
if _IS_SQLITE:
    connect_args["check_same_thread"] = False

if _USE_ENTRA:
    # Strip any embedded password from the URL — the token listener supplies it.
    _url = make_url(DATABASE_URL).set(password=None)
    engine = create_engine(
        _url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,  # rotate connections well before the ~1h token TTL
    )

    # Lazy import so non-Azure environments don't need azure-identity installed.
    from azure.identity import DefaultAzureCredential

    _credential = DefaultAzureCredential()

    @event.listens_for(engine, "do_connect")
    def _inject_entra_token(dialect, conn_rec, cargs, cparams):
        cparams["password"] = _credential.get_token(_ENTRA_SCOPE).token
else:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── SQLite CREATE TABLE statements ────────────────────────────────────────────

_SQLITE_CREATE_REVIEWS = """
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    company_name TEXT NOT NULL,
    reporting_period TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP,
    status TEXT DEFAULT 'in_progress',
    layer1_data JSON,
    layer2_data JSON,
    final_output JSON,
    corrections JSON
);
"""

_SQLITE_CREATE_COMPANIES = """
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context TEXT DEFAULT ''
);
"""

_SQLITE_CREATE_CORRECTIONS = """
CREATE TABLE IF NOT EXISTS company_specific_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    period TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    layer2_value REAL,
    layer2_reasoning TEXT,
    layer2_validation TEXT,
    corrected_value REAL NOT NULL,
    analyst_reasoning TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
"""

_SQLITE_CREATE_LAYER1_TEMPLATES = """
CREATE TABLE IF NOT EXISTS layer1_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    statement_type TEXT NOT NULL,
    template JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, statement_type)
);
"""

_SQLITE_CREATE_CORRECTION_CHANGELOG = """
CREATE TABLE IF NOT EXISTS correction_changelog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    company_id INTEGER,
    company_name TEXT,
    correction_id INTEGER,
    field_name TEXT,
    statement_type TEXT,
    layer_a_instruction TEXT,
    layer_a_referenced_fields TEXT,
    layer_b_action TEXT,
    layer_b_detail TEXT,
    markdown_section_affected TEXT,
    source TEXT DEFAULT 'pipeline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

_SQLITE_CREATE_CONTEXT_ALERTS = """
CREATE TABLE IF NOT EXISTS context_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    company_id INTEGER,
    company_name TEXT,
    word_count INTEGER,
    message TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


# ── PostgreSQL CREATE TABLE statements ────────────────────────────────────────

_PG_CREATE_REVIEWS = """
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE,
    company_name TEXT NOT NULL,
    reporting_period TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    finalized_at TIMESTAMP,
    status TEXT DEFAULT 'in_progress',
    layer1_data JSONB,
    layer2_data JSONB,
    final_output JSONB,
    corrections JSONB
);
"""

_PG_CREATE_COMPANIES = """
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    context TEXT DEFAULT ''
);
"""

_PG_CREATE_CORRECTIONS = """
CREATE TABLE IF NOT EXISTS company_specific_corrections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    period TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    layer2_value REAL,
    layer2_reasoning TEXT,
    layer2_validation TEXT,
    corrected_value REAL NOT NULL,
    analyst_reasoning TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
"""

_PG_CREATE_LAYER1_TEMPLATES = """
CREATE TABLE IF NOT EXISTS layer1_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    statement_type TEXT NOT NULL,
    template JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, statement_type)
);
"""

_PG_CREATE_CORRECTION_CHANGELOG = """
CREATE TABLE IF NOT EXISTS correction_changelog (
    id SERIAL PRIMARY KEY,
    timestamp TEXT NOT NULL,
    company_id INTEGER,
    company_name TEXT,
    correction_id INTEGER,
    field_name TEXT,
    statement_type TEXT,
    layer_a_instruction TEXT,
    layer_a_referenced_fields TEXT,
    layer_b_action TEXT,
    layer_b_detail TEXT,
    markdown_section_affected TEXT,
    source TEXT DEFAULT 'pipeline',
    created_at TIMESTAMP DEFAULT NOW()
);
"""

_PG_CREATE_CONTEXT_ALERTS = """
CREATE TABLE IF NOT EXISTS context_alerts (
    id SERIAL PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    company_id INTEGER,
    company_name TEXT,
    word_count INTEGER,
    message TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);
"""

# ── Idempotent migrations for pre-existing databases ─────────────────────────

_MIGRATIONS = [
    "ALTER TABLE reviews ADD COLUMN session_id TEXT UNIQUE;",
    "ALTER TABLE reviews ADD COLUMN finalized_at TIMESTAMP;",
    "ALTER TABLE reviews ADD COLUMN company_id INTEGER;",
    "ALTER TABLE companies ADD COLUMN context TEXT DEFAULT '';",
]


def _exec_safe(ddl: str) -> None:
    """
    Execute a single DDL statement in its own transaction.

    Each statement gets an isolated connection so that a failure (e.g. a
    migration ALTER TABLE whose column already exists) cannot abort the
    transaction that contains unrelated CREATE TABLE statements.
    """
    with engine.connect() as conn:
        try:
            conn.execute(text(ddl))
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def init_db() -> None:
    """Create database tables if they do not exist. Also runs safe migrations."""
    if _IS_SQLITE:
        ddl_statements = [
            _SQLITE_CREATE_REVIEWS,
            _SQLITE_CREATE_COMPANIES,
            _SQLITE_CREATE_CORRECTIONS,
            _SQLITE_CREATE_LAYER1_TEMPLATES,
            _SQLITE_CREATE_CORRECTION_CHANGELOG,
            _SQLITE_CREATE_CONTEXT_ALERTS,
        ]
    else:
        ddl_statements = [
            _PG_CREATE_REVIEWS,
            _PG_CREATE_COMPANIES,
            _PG_CREATE_CORRECTIONS,
            _PG_CREATE_LAYER1_TEMPLATES,
            _PG_CREATE_CORRECTION_CHANGELOG,
            _PG_CREATE_CONTEXT_ALERTS,
        ]

    # Each CREATE TABLE runs in its own transaction so a failed migration
    # on the same connection cannot roll it back.
    for ddl in ddl_statements:
        _exec_safe(ddl)

    # Migrations are best-effort: failure means the column already exists.
    for migration in _MIGRATIONS:
        try:
            _exec_safe(migration)
        except Exception:
            pass  # Column already exists — safe to ignore

    # One-time migration: import existing JSONL audit data into DB tables.
    _migrate_jsonl_to_db()


def _migrate_jsonl_to_db() -> None:
    """
    Import existing JSONL audit files into the new DB tables on first startup.
    No-op if the tables already contain rows (migration already ran) or if the
    JSONL files don't exist (fresh deployment).
    """
    import json
    from app.config import DATA_DIR

    changelog_path = DATA_DIR / "company_context_changelog.jsonl"
    alerts_path = DATA_DIR / "alerts.jsonl"

    with engine.connect() as conn:
        # Changelog migration
        if changelog_path.exists():
            count = conn.execute(text("SELECT COUNT(*) FROM correction_changelog")).scalar()
            if count == 0:
                try:
                    lines = [l.strip() for l in changelog_path.read_text(encoding="utf-8").splitlines() if l.strip()]
                    for line in lines:
                        try:
                            e = json.loads(line)
                            conn.execute(text("""
                                INSERT INTO correction_changelog
                                    (timestamp, company_id, company_name, correction_id,
                                     field_name, statement_type, layer_a_instruction,
                                     layer_a_referenced_fields, layer_b_action, layer_b_detail,
                                     markdown_section_affected, source)
                                VALUES
                                    (:ts, :cid, :cn, :corr_id, :fn, :st, :la_instr,
                                     :la_refs, :lb_action, :lb_detail, :section, :source)
                            """), {
                                "ts": e.get("timestamp", ""),
                                "cid": e.get("company_id"),
                                "cn": e.get("company_name"),
                                "corr_id": e.get("correction_id"),
                                "fn": e.get("field_name"),
                                "st": e.get("statement_type"),
                                "la_instr": e.get("layer_a_instruction"),
                                "la_refs": json.dumps(e.get("layer_a_referenced_fields") or []),
                                "lb_action": e.get("layer_b_action"),
                                "lb_detail": e.get("layer_b_detail"),
                                "section": e.get("markdown_section_affected"),
                                "source": e.get("source", "pipeline"),
                            })
                        except Exception:
                            continue
                    conn.commit()
                except Exception:
                    conn.rollback()

        # Alerts migration
        if alerts_path.exists():
            count = conn.execute(text("SELECT COUNT(*) FROM context_alerts")).scalar()
            if count == 0:
                try:
                    lines = [l.strip() for l in alerts_path.read_text(encoding="utf-8").splitlines() if l.strip()]
                    for line in lines:
                        try:
                            e = json.loads(line)
                            status = e.get("status", "open")
                            if "resolved" in e and "status" not in e:
                                status = "resolved" if e["resolved"] else "open"
                            conn.execute(text("""
                                INSERT INTO context_alerts
                                    (timestamp, type, company_id, company_name,
                                     word_count, message, status)
                                VALUES
                                    (:ts, :type, :cid, :cn, :wc, :msg, :status)
                            """), {
                                "ts": e.get("timestamp", ""),
                                "type": e.get("type", "unknown"),
                                "cid": e.get("company_id"),
                                "cn": e.get("company_name"),
                                "wc": e.get("word_count"),
                                "msg": e.get("message"),
                                "status": status,
                            })
                        except Exception:
                            continue
                    conn.commit()
                except Exception:
                    conn.rollback()


def get_db():
    """FastAPI dependency that yields a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
