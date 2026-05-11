"""
Canonical statement-type constants for backend Python code.

Mirrors the frontend statementMeta.ts. Import from here instead of
hardcoding label/key mappings inline across routes and services.

STATEMENT_TYPES  — ordered list of (key, display_label) pairs
STATEMENT_KEY_TO_LABEL — "income_statement" → "Income Statement"
STATEMENT_LABEL_TO_KEY — "Income Statement" → "income_statement"
STATEMENT_LABELS_SET   — frozenset of display labels (for O(1) membership tests)
"""
from __future__ import annotations

STATEMENT_TYPES: list[tuple[str, str]] = [
    ("income_statement", "Income Statement"),
    ("balance_sheet", "Balance Sheet"),
    ("cash_flow_statement", "Cash Flow Statement"),
]

STATEMENT_KEY_TO_LABEL: dict[str, str] = {k: label for k, label in STATEMENT_TYPES}
STATEMENT_LABEL_TO_KEY: dict[str, str] = {label: k for k, label in STATEMENT_TYPES}
STATEMENT_LABELS_SET: frozenset[str] = frozenset(label for _, label in STATEMENT_TYPES)
STATEMENT_KEYS: list[str] = [k for k, _ in STATEMENT_TYPES]
STATEMENT_KEYS_SET: frozenset[str] = frozenset(STATEMENT_KEYS)


def normalize_statement_type(raw: str) -> str:
    """
    Normalise a free-form statement type string to its canonical snake_case key.

    Handles user-supplied labels ("Income Statement"), route params that may
    include spaces or mixed case, and keys that are already normalised.

    Examples:
      "Income Statement" -> "income_statement"
      "Balance Sheet"    -> "balance_sheet"
      "income_statement" -> "income_statement"  (idempotent)
    """
    return raw.strip().lower().replace(" ", "_")
