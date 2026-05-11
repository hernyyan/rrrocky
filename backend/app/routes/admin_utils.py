"""
Shared helpers for admin route modules.
"""
import json
from typing import List

from app.config import DATA_DIR

GENERAL_FIXES_PATH = DATA_DIR / "general_fixes.csv"


def read_jsonl(path) -> List[dict]:
    """Read a JSONL file and return a list of parsed objects, skipping bad lines."""
    if not path.exists():
        return []
    entries = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return []
    return entries
