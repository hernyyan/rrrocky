"""
Layer 2 response parser.

Owns the contract for parsing Claude's raw Layer 2 JSON output into a typed,
validated structure. This is the single place where the L2 prompt format is
understood and enforced.

Raises Layer2ParseError on malformed input so callers get explicit failures
instead of silent empty results.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


class Layer2ParseError(ValueError):
    """Raised when the Layer 2 response cannot be parsed into a valid structure."""


@dataclass
class Layer2ParsedResponse:
    values: Dict[str, Optional[float]]
    reasoning: Dict[str, str]
    validation_raw: Dict[str, Any]          # structured validation checks
    flagged_fields: List[str]
    source_labels: Dict[str, List[str]]
    field_validations: Dict[str, List[str]]  # derived: field → [check_name, ...]


def parse_layer2_response(parsed: Any) -> Layer2ParsedResponse:
    """
    Parse a Layer 2 Claude JSON response into a typed Layer2ParsedResponse.

    Handles both response shapes:
      - Flat: {"Net Revenue": 3621577.27, "COGS": 432658.88, ...}
      - Nested: {"REVENUE": {"Net Revenue": 3621577.27}, "COGS_SECTION": {"COGS": ...}}

    Reserved top-level keys (REASONING, VALIDATION, SOURCE_LABELS) are always
    treated as metadata, never as field values.

    Raises:
        Layer2ParseError: if `parsed` is not a dict.
    """
    if not isinstance(parsed, dict):
        raise Layer2ParseError(
            f"Layer 2: expected a JSON object, got {type(parsed).__name__}."
        )

    reasoning: Dict[str, str] = {}
    validation_raw: Dict[str, Any] = {}
    source_labels: Dict[str, List[str]] = {}
    values: Dict[str, Optional[float]] = {}
    flagged_fields: List[str] = []

    for key, val in parsed.items():
        if key == "REASONING":
            if isinstance(val, dict):
                reasoning = {str(k): str(v) for k, v in val.items()}

        elif key == "SOURCE_LABELS":
            if isinstance(val, dict):
                source_labels = {
                    str(k): [str(lbl) for lbl in v] if isinstance(v, list) else [str(v)]
                    for k, v in val.items()
                }

        elif key == "VALIDATION":
            if isinstance(val, dict):
                validation_raw = _parse_validation_checks(val)

        elif isinstance(val, dict):
            # Nested section — flatten all entries into values
            for field_name, field_value in val.items():
                clean = str(field_name).replace("__FLAGGED", "").strip()
                values[clean] = _to_float(field_value)
                if "__FLAGGED" in str(field_name):
                    flagged_fields.append(clean)

        else:
            # Flat top-level field
            clean = str(key).replace("__FLAGGED", "").strip()
            values[clean] = _to_float(val)
            if "__FLAGGED" in key:
                flagged_fields.append(clean)

    field_validations = _map_validations_to_fields(validation_raw, values)

    return Layer2ParsedResponse(
        values=values,
        reasoning=reasoning,
        validation_raw=validation_raw,
        flagged_fields=flagged_fields,
        source_labels=source_labels,
        field_validations=field_validations,
    )


# ── Private helpers ───────────────────────────────────────────────────────────

def _to_float(val: Any) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _parse_validation_checks(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise the VALIDATION block into a consistent {checkName, status, details} shape."""
    structured: Dict[str, Any] = {}
    for check_name, check_data in raw.items():
        check_name_str = str(check_name)
        if isinstance(check_data, dict):
            structured[check_name_str] = {
                "checkName": check_name_str,
                "status": str(check_data.get("status", "UNKNOWN")),
                "details": str(check_data.get("details", "")),
            }
        elif isinstance(check_data, str):
            status = "PASS" if "PASS" in check_data.upper() else "FAIL"
            structured[check_name_str] = {
                "checkName": check_name_str,
                "status": status,
                "details": check_data,
            }
    return structured


def _map_validations_to_fields(
    validation: Dict[str, Any],
    values: Dict[str, Any],
) -> Dict[str, List[str]]:
    """
    For each template field, find which validation checks reference it by name.
    Searches both the check name and its details text.
    Returns: {field_name: [check_name, ...]}
    """
    field_validations: Dict[str, List[str]] = {}
    for check_name, check_result in validation.items():
        details = (
            check_result.get("details", "")
            if isinstance(check_result, dict)
            else str(check_result)
        )
        combined_text = (check_name + " " + details).lower()
        for field_name in values:
            if field_name.lower() in combined_text:
                field_validations.setdefault(field_name, []).append(check_name)
    return field_validations
