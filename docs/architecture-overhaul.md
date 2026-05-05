# Architecture Overhaul — Action Plan

**Status tracking:** Each item has a status marker.
- `[ ]` — not started
- `[~]` — in progress
- `[x]` — complete

**Vocabulary:** See [CONTEXT.md](../CONTEXT.md) for domain terms. Architecture terms (module, interface, seam, depth, leverage, locality) follow [the project's architecture language](../.claude/skills/improve-codebase-architecture/LANGUAGE.md).

---

## Overview

This plan addresses 12 architectural issues found in a full codebase review. Issues are grouped by effort tier and ordered within each tier by dependency (items that unblock others come first).

| ID | Issue | Tier | Status |
|----|-------|------|--------|
| A1 | Extract `Layer2ResponseParser` module | Quick win | `[x]` |
| A2 | Word count utility — eliminate 3-way duplication | Quick win | `[x]` |
| A3 | Fix silent DB persistence failures in L1/L2 routes | Quick win | `[x]` |
| A4 | Add Correction tag validation on backend | Quick win | `[x]` |
| A5 | Fix type gaps for session continuity and finalization | Quick win | `[x]` |
| B1 | Split `admin.py` monolith into focused routers | Medium | `[x]` |
| B2 | Consolidate Template structure — CSV as single source of truth | Medium | `[x]` |
| B3 | Remove `recalculate.ts` — route all recalculation through backend | Medium | `[ ]` |
| B4 | Extract Correction-recalculation pattern in Step2Classify | Medium | `[ ]` |
| B5 | Unify "final values assembly" in Step2 and Step3 | Medium | `[ ]` |
| C1 | Extract `CorrectionPipeline` module | Refactor | `[ ]` |
| C2 | Document `camelCase ↔ snake_case` impedance seam | Documentation | `[ ]` |

---

## Tier A — Quick Wins

These are contained changes with high leverage and low risk. Do these first.

---

### A1 — Extract `Layer2ResponseParser` module

**Status:** `[ ]`

**Files touched:**
- `backend/app/services/layer2_service.py` — extract `_split_response`
- `backend/app/services/layer2_response_parser.py` — new file

**Problem:**
`_split_response` in `layer2_service.py` is a ~80-line private function that parses Claude's raw text response into structured data. Its real contract is undocumented: which keys are guaranteed, what happens if a section is missing, how nested vs. flat JSON is handled. If the L2 prompt format changes, the parser breaks silently. The function is untestable without invoking the full L2 service.

**What to build:**
- New module `layer2_response_parser.py` with a single public function:
  ```python
  def parse_layer2_response(raw_text: str) -> Layer2ParsedResponse
  ```
- `Layer2ParsedResponse` is a dataclass with typed fields:
  ```python
  @dataclass
  class Layer2ParsedResponse:
      values: Dict[str, Optional[float]]
      reasoning: Dict[str, str]
      validation_checks: List[Dict]
      source_labels: Dict[str, List[str]]
  ```
- The function raises `Layer2ParseError` (a new exception) if the response is malformed — no silent empty returns.
- `layer2_service.py` imports and calls `parse_layer2_response`; `_split_response` is deleted.

**Tests to write:**
- Fixture: valid flat response → correct fields populated
- Fixture: valid nested response → correctly flattened
- Fixture: missing VALUES section → `Layer2ParseError` raised
- Fixture: partial SOURCE_LABELS → partial dict returned, no crash

**Leverage gained:** Prompt format contract is now testable without Claude. `layer2_service.py` shrinks to orchestration only.

---

### A2 — Word count utility — eliminate 3-way duplication

**Status:** `[ ]`

**Files touched:**
- `backend/app/services/company_context_service.py` — remove inline word count
- `backend/app/routes/companies.py` — remove inline word count
- `backend/app/routes/admin.py` — remove inline word count
- `backend/app/utils/text_utils.py` — new file (or add to existing utils if one exists)

**Problem:**
Word count logic (`len(content.split())`) appears in three places with slightly different surrounding logic. If the 5000-word limit changes, or if the definition of "word" changes (e.g., to exclude code blocks), three files need updates.

**What to build:**
```python
# backend/app/utils/text_utils.py
COMPANY_CONTEXT_WORD_LIMIT = 5000

def word_count(text: str) -> int:
    return len(text.split())

def context_exceeds_limit(text: str) -> bool:
    return word_count(text) > COMPANY_CONTEXT_WORD_LIMIT
```
Replace all three occurrences with calls to `word_count()` / `context_exceeds_limit()`. Move the `5000` magic number here too (currently hardcoded inline in all three places).

**Leverage gained:** One address for the word limit policy. One test to write.

---

### A3 — Fix silent DB persistence failures in L1 and L2 routes

**Status:** `[ ]`

**Files touched:**
- `backend/app/routes/layer1.py` (lines ~91–111)
- `backend/app/routes/layer2.py` (lines ~59–80)

**Problem:**
Both routes wrap DB persistence in a bare `try/except` that silently swallows failures. If the DB write fails, the API response still returns 200 with valid data — but the session state is not persisted. The frontend has no way to detect this. On page reload or session resume, data is gone.

**What to change:**
- Remove the silent `except` block from DB persistence in both routes.
- If DB persistence is genuinely optional (e.g., for stateless local dev), make that explicit: log at `WARNING` level and add a comment explaining the intent.
- If persistence is required (the normal case), let the exception propagate — FastAPI will return a 500 that the frontend can surface.
- Add a structured log line: `logger.warning("DB persistence failed for session %s: %s", session_id, exc)` before any intentional swallow.

**Consistency fix:** Both routes use `json.loads(raw)` to deserialize stored JSON but don't guard against `raw` already being a dict (Postgres JSONB returns dicts, not strings). Apply the `isinstance(raw, dict)` guard consistently everywhere — this was partially applied in the previous session but should be audited across all routes that read JSON columns.

---

### A4 — Add Correction tag validation on backend

**Status:** `[ ]`

**Files touched:**
- `backend/app/models/schemas.py`
- `backend/app/routes/corrections.py`
- `backend/app/services/correction_router.py`

**Problem:**
The frontend can send any string as a correction tag. The backend routes on tag value (`if tag == 'company_specific'`) but never validates the tag against the allowed set. An unknown tag silently falls through all branches with no side effects and no error — the correction is saved but never processed.

**What to add:**
```python
# In schemas.py
from enum import Enum

class CorrectionTag(str, Enum):
    one_off_error = "one_off_error"
    general_fix = "general_fix"
    company_specific = "company_specific"
```
Update `CorrectionRequest` to use `tag: CorrectionTag` instead of `tag: str`. FastAPI will reject invalid tags with a 422. Update `correction_router.py` to use `CorrectionTag` enum comparisons.

---

### A5 — Fix type gaps for session continuity and finalization

**Status:** `[ ]`

**Files touched:**
- `frontend/src/types/index.ts`
- `frontend/src/api/client.ts`

**Problem:**
`checkExistingReview` returns an inline type. `continuePreviousReview` returns `unknown` for `layer1_data` and `layer2_data`. `StatementTabConfig` is defined in `client.ts` rather than `types/index.ts`, which is where all other shared types live. `FinalizeRequest` / `FinalizeResponse` are referenced in `client.ts` but their shape is not exported as a type.

**What to add to `types/index.ts`:**
```typescript
export interface ExistingReviewCheck {
  exists: boolean
  session_id: string | null
  finalized_at: string | null
}

export interface ContinuedReview {
  session_id: string
  layer1_data: Record<string, Layer1Result>
  layer2_data: Record<string, Layer2Result>
  reporting_period: string
  company_name: string
}

export interface StatementTabConfig {
  tabs: string[]
  fieldAssignments: Record<string, string>
}
```
- Remove inline type from `client.ts`; import from `types/index.ts`.
- Remove `StatementTabConfig` export from `client.ts`; move to `types/index.ts` and re-export or import from there everywhere it's used (`fuzzyMatch.ts`, `CompanyDetail.tsx`, `Step1Upload.tsx`).
- Add `FinalizeResponse` type matching the backend schema response.

---

## Tier B — Medium Refactors

These require more careful file surgery but are self-contained. No inter-dependencies except B4 → B5 (do B4 first).

---

### B1 — Split `admin.py` monolith into focused routers

**Status:** `[x]`

**Files touched:**
- `backend/app/routes/admin.py` — split into 4 files, then delete or reduce to re-exports
- `backend/app/routes/admin_companies.py` — new
- `backend/app/routes/admin_context.py` — new
- `backend/app/routes/admin_alerts.py` — new
- `backend/app/routes/admin_reviews.py` — new
- `backend/app/main.py` — register new routers

**Problem:**
`admin.py` is 831 lines with 15 endpoints spanning 5 unrelated concerns. Its interface is "all admin operations." No locality — a bug in the AI rule-writing pipeline is 700 lines away from company renaming. Hard to navigate, hard to test per-concern.

**Split plan:**

| New file | Endpoints | LOC estimate |
|----------|-----------|--------------|
| `admin_companies.py` | list companies, get context, update context, rename company, reprocess corrections, list corrections | ~200 |
| `admin_context.py` | get context status, write rule, get rules, delete rule, get template fields | ~180 |
| `admin_alerts.py` | list alerts, mark alert read, list changelog | ~120 |
| `admin_reviews.py` | list reviews, get review detail, export review CSV, delete review | ~180 |

**Shared helpers** (currently inline in admin.py): `format_val`, `get_context_word_count` (use A2's utility), `get_company_markdown_path` — move to `backend/app/utils/admin_utils.py`.

**Registration in `main.py`:**
```python
app.include_router(admin_companies_router, prefix="/admin", tags=["admin-companies"])
app.include_router(admin_context_router, prefix="/admin", tags=["admin-context"])
app.include_router(admin_alerts_router, prefix="/admin", tags=["admin-alerts"])
app.include_router(admin_reviews_router, prefix="/admin", tags=["admin-reviews"])
```
URL paths stay identical — no API contract change.

**Note:** Requires A2 to be done first (word count utility must exist before admin files are split, to avoid copying the duplication into new files).

---

### B2 — Consolidate Template structure — CSV as single source of truth

**Status:** `[x]`

**Files touched:**
- `backend/templates/loader_template.csv` — add new columns
- `backend/app/services/template_service.py` — remove `IS_SECTION_MAP`, drive everything from CSV
- `backend/app/routes/export.py` — remove `BLANK_ROW_BEFORE` hardcoding
- `backend/app/routes/admin.py` (or its split successors) — remove duplicate `BLANK_ROW_BEFORE`

**Problem:**
Template structure is split across three places: the CSV drives field ordering and BS sections; `IS_SECTION_MAP` in `template_service.py` hardcodes IS section names; `BLANK_ROW_BEFORE` appears in `export.py` and `admin.py`. Changing the template requires touching all three.

**What to change:**

Add two columns to `loader_template.csv`:
- `section` — the section header name for this field (e.g., `"Revenue"`, `"Operating Expenses"`, blank for continuation)
- `blank_row_before` — `"1"` if a blank row should precede this field in exports, else blank

Update `template_service.py`:
- Remove `IS_SECTION_MAP`
- Parse `section` and `blank_row_before` from CSV into `TemplateField` dataclass
- `TemplateField` becomes:
  ```python
  @dataclass
  class TemplateField:
      name: str
      statement_type: str
      section: Optional[str]
      blank_row_before: bool
      bold: bool
      indent_level: int
  ```

Update `export.py` and `admin.py` to read `blank_row_before` from the parsed `TemplateField` rather than from a hardcoded set.

**Leverage gained:** Adding a field or changing section membership = edit the CSV. `template_service.py` becomes the single parser; all callers get typed `TemplateField` objects.

---

### B3 — Remove `recalculate.ts` — route all recalculation through backend

**Status:** `[ ]`

**Files touched:**
- `frontend/src/utils/recalculate.ts` — delete
- `frontend/src/components/wizard/Step2Classify.tsx` — remove import, call backend `/recalculate` for all recalc
- `backend/app/routes/recalculate.py` — verify endpoint handles all three statement types correctly
- `backend/app/services/recalculate_service.py` — no changes needed

**Problem:**
`recalculate.ts` (126 lines) is a TypeScript mirror of `recalculate_service.py` (281 lines). Both implement identical formulas. When a formula changes, it must be changed in two files. Formula drift has already occurred silently. This is a two-address problem — one address must win.

**What to change:**
- `POST /recalculate` already exists and handles all three statement types.
- `Step2Classify.tsx` currently calls `recalculate.ts` functions directly for live-edit preview (the "pending value" flow).
- Replace those calls with calls to the `/recalculate` endpoint. If latency is a concern for live edits, debounce by 300ms.
- Delete `recalculate.ts`.

**Risk:** Live edit in Step 2 currently recalculates synchronously in-browser. Moving to a backend call adds ~50–150ms latency per edit. Accept this — formula correctness > perceived speed. Add a debounce if the UX is noticeably sluggish.

**Note:** This is a prerequisite for B4 — the extraction of the correction-recalculation hook should happen after B3, so the hook calls the backend endpoint rather than the local function.

---

### B4 — Extract Correction-recalculation pattern in Step2Classify

**Status:** `[ ]` *(depends on B3)*

**Files touched:**
- `frontend/src/components/wizard/Step2Classify.tsx`
- `frontend/src/hooks/useCorrections.ts` — new file

**Problem:**
The "apply correction → merge with L2 values → recalculate" pattern appears three times in `Step2Classify.tsx`:
1. After saving a correction (lines ~395–402)
2. After removing a correction (lines ~477–484)
3. During a live edit (lines ~503–525)

All three paths manually merge corrections on top of layer2 values before triggering recalculation. The merging logic is duplicated. If the merge order changes (or a new edge case appears), all three paths need updating.

**What to build:**
```typescript
// frontend/src/hooks/useCorrections.ts
export function useCorrections(sessionId: string, statementType: string) {
  // Returns:
  // - corrections: Correction[]
  // - saveCorrection(data) → triggers merge + recalc + state update
  // - removeCorrection(fieldName) → triggers merge + recalc + state update
  // - pendingValues: Record<string, number>  (live edits not yet saved)
  // - setPendingValue(field, value) → debounced recalc call
  // - finalValues: Record<string, number | null>  (L2 + corrections + recalc)
}
```

`Step2Classify.tsx` becomes a consumer of `useCorrections` — it renders the values, but all the merge/recalc logic lives in the hook.

**Leverage gained:** One function owns "what are the final values for this statement given current corrections." The merge and recalc logic has one test surface.

---

### B5 — Unify "final values assembly" in Step2 and Step3

**Status:** `[ ]` *(depends on B4)*

**Files touched:**
- `frontend/src/components/wizard/Step2Classify.tsx`
- `frontend/src/components/wizard/Step3Finalize.tsx`

**Problem:**
Both Step2 and Step3 independently compute "what are the final values to display" by applying corrections on top of L2 values. Step2 does it inline (lines ~378–402), Step3 does it inline (lines ~83–100). They must agree — if they don't, the value shown in Step 2 differs from what the user sees finalized in Step 3.

**What to change:**
After B4, `useCorrections` already owns the final value computation. Step3 should import and call `useCorrections` (or a lighter read-only variant) rather than re-implementing the assembly. Alternatively, expose `finalValues` from WizardState if they need to survive step transitions.

The simpler fix: extract a pure function `assembleValues(layer2Result, corrections) → Record<string, number | null>` into `frontend/src/utils/assembleValues.ts`, and have both Step2 and Step3 call it. This function is easy to unit test.

---

## Tier C — Architectural Refactors

These are higher-effort, higher-impact changes. Approach each one as its own mini-project.

---

### C1 — Extract `CorrectionPipeline` module

**Status:** `[ ]`

**Files touched:**
- `backend/app/services/correction_router.py` — reduce to tag dispatch only
- `backend/app/services/company_context_service.py` — reduce to Layer A/B execution only
- `backend/app/services/correction_pipeline.py` — new file

**Problem:**
The `company_specific` correction path is a 9-step pipeline spread across two service files with no declared interface between them. `correction_router.py` calls into `company_context_service.py` mid-function. The 9 steps are: queue → load correction → Layer A → Layer B → write markdown → log changelog → emit alert → mark processed. Callers can't reason about the pipeline without reading both files. There's no way to test a partial pipeline failure.

**What to build:**
```python
# backend/app/services/correction_pipeline.py

@dataclass
class PipelineResult:
    success: bool
    action: str          # "append", "edit", "discard", "error"
    word_count: int
    alert_emitted: bool
    error: Optional[str]

class CorrectionPipeline:
    def process(self, company_id: int, correction_ids: List[int]) -> List[PipelineResult]:
        ...
```

The pipeline class owns all 9 steps. `correction_router.py` becomes:
```python
def route_correction(correction, db):
    if correction.tag == CorrectionTag.one_off_error:
        return  # no side effects
    elif correction.tag == CorrectionTag.general_fix:
        append_to_general_fixes(correction)
    elif correction.tag == CorrectionTag.company_specific:
        queue_in_db(correction, db)

def process_queued(company_id, db):
    pipeline = CorrectionPipeline(claude_service, company_context_dir)
    return pipeline.process(company_id, get_queued_ids(company_id, db))
```

`company_context_service.py` is reduced to `run_layer_a(instructions, claude_service)` and `run_layer_b(markdown, instruction, claude_service)` — pure functions with no side effects, testable in isolation.

**Tests to write:**
- Pipeline with Layer B returning "discard" → no markdown change, no alert
- Pipeline where Layer B output exceeds word limit → alert emitted, markdown still written
- Pipeline where Layer A fails (Claude error) → `PipelineResult(success=False, error=...)`

---

### C2 — Document the `camelCase ↔ snake_case` impedance seam

**Status:** `[ ]`

**Files touched:**
- `docs/adr/ADR-0001-camelcase-snakecase-seam.md` — new ADR

**Problem:**
The frontend uses camelCase throughout (`sessionId`, `fieldName`, `statementType`). The backend uses snake_case throughout (`session_id`, `field_name`, `statement_type`). `client.ts` handles the conversion implicitly through JSON serialization — FastAPI's `response_model` generates snake_case JSON by default, and the frontend types match that snake_case in API payloads but use camelCase in state.

This creates confusion in two places:
1. `Layer2Request` sent from frontend uses snake_case keys (matches backend Pydantic model)
2. `Layer1Result` stored in WizardState uses camelCase keys (transformed from backend response)

The conversion is handled by `handleResponse` in `client.ts` implicitly (no explicit transformation — JSON parsing just maps keys as-is), meaning the frontend types must match the backend's snake_case field names exactly when in API payloads, but the state types use camelCase.

**What to document:**
This is not a bug — it's a deliberate seam. The ADR records why it exists and where the seam lives so future changes don't accidentally break the mapping:

```markdown
# ADR-0001: camelCase / snake_case seam lives in API client

## Decision
Frontend state uses camelCase. API payloads use snake_case.
The seam is `frontend/src/api/client.ts` — all key name mapping happens there.
Do not introduce explicit transformation middleware; rely on JSON natural mapping.

## Consequences
Frontend types for API payloads must use snake_case field names.
Frontend types for WizardState must use camelCase field names.
New API functions added to client.ts inherit this convention.
```

---

## Additional Issues Found (not in original 6)

These were surfaced by deeper exploration and should be addressed during the above work or as follow-on items.

---

### X1 — Statement type inference in Step2 is fragile

**Status:** `[ ]`

**File:** `frontend/src/components/wizard/Step2Classify.tsx` (lines ~316–324)

The current code infers which statement a selected field belongs to by scanning all three statement types and checking if the field name appears in the L2 result keys. This breaks if the same field name appears in two statements. There is no explicit mapping from `fieldName → statementType`.

**Fix:** Add a `fieldStatementMap: Record<string, StatementType>` to either the template response payload or compute it once from the template fields array. Pass it as a stable reference rather than re-inferring on every cell selection.

---

### X2 — `isOverride` is frontend-only — never sent to backend

**Status:** `[ ]`

**Files:** `frontend/src/types/index.ts` (Correction.isOverride), `frontend/src/components/wizard/Step2Classify.tsx` (line ~391)

The `isOverride` flag on `Correction` is computed client-side (true when `CALCULATED_FIELDS.has(fieldName)`) and drives some UI behavior, but is never sent to the backend. The backend doesn't know whether a correction is overriding a computed field. This is fine today, but if the backend ever needs to distinguish override corrections from regular ones, there's no path for that data to flow.

**Fix:** Either remove `isOverride` from the `Correction` type (compute it on the fly from `CALCULATED_FIELDS` set where needed) or add it to `CorrectionRequest` and persist it on the backend. Decision depends on whether backend needs it.

---

### X3 — Session resumption returns untyped layer data

**Status:** `[ ]` *(overlaps with A5)*

**File:** `frontend/src/api/client.ts` — `continuePreviousReview`

`continuePreviousReview` returns `layer1_data: unknown` and `layer2_data: unknown`. These are immediately cast and used to populate WizardState. If the stored JSON shape diverges from the current type definitions (e.g., after a schema change), the app silently loads corrupt state.

**Fix:** Type the return value as `ContinuedReview` (per A5). Add a runtime validation step (or at minimum, a type assertion with a comment) when populating WizardState from the resumed session. Log a warning if expected keys are missing.

---

## Sequencing Recommendation

```
Week 1: A1, A2, A3, A4, A5    (all quick wins — no dependencies between them, do in parallel)
Week 2: B1 (requires A2), B2  (independent)
Week 3: B3, then B4 (depends on B3), then B5 (depends on B4)
Week 4: X1, X2, X3            (fix peripheral issues while doing B3-B5)
Week 5+: C1                    (correction pipeline — larger refactor, schedule standalone)
         C2                    (ADR — can be done any time, low effort)
```

---

## Files to Create (Summary)

| File | Purpose |
|------|---------|
| `CONTEXT.md` | Domain glossary ✅ (already created) |
| `docs/architecture-overhaul.md` | This document ✅ |
| `docs/adr/ADR-0001-camelcase-snakecase-seam.md` | Record the camelCase/snake_case seam decision |
| `backend/app/services/layer2_response_parser.py` | Deep Layer2 response parsing module (A1) |
| `backend/app/utils/text_utils.py` | Word count utility (A2) |
| `backend/app/routes/admin_companies.py` | Split from admin.py (B1) |
| `backend/app/routes/admin_context.py` | Split from admin.py (B1) |
| `backend/app/routes/admin_alerts.py` | Split from admin.py (B1) |
| `backend/app/routes/admin_reviews.py` | Split from admin.py (B1) |
| `backend/app/utils/admin_utils.py` | Shared admin helpers (B1) |
| `backend/app/services/correction_pipeline.py` | Deep CorrectionPipeline module (C1) |
| `frontend/src/hooks/useCorrections.ts` | Correction + recalc hook (B4) |
| `frontend/src/utils/assembleValues.ts` | Final value assembly pure function (B5) |

## Files to Delete (Summary)

| File | Why |
|------|-----|
| `frontend/src/utils/recalculate.ts` | Replaced by backend `/recalculate` endpoint (B3) |
| `backend/app/routes/admin.py` | Replaced by 4 focused routers (B1) — or reduce to re-exports |
