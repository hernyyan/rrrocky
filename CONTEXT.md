# Domain Glossary

This file is the canonical reference for domain vocabulary used throughout this codebase. All architecture reviews, ADRs, and documentation should use these terms exactly.

---

## Core Pipeline Concepts

**Session**
A UUID-keyed workflow instance. Created on file upload, accumulates Layer 1 and Layer 2 results, corrections, and final output. One upload = one session. Sessions can be resumed mid-workflow. Stored in the `reviews` table.

**Extraction**
The Layer 1 pipeline: upload a file → convert to CSV → Claude reads rows and identifies line items → returns a `Layer1Result` per statement type. Extraction is per-sheet (Excel) or per-page-range (PDF).

**Classification**
The Layer 2 pipeline: takes `Layer1Result` line items → Claude maps each line item to the firm's canonical template fields → returns `Layer2Result` with values, reasoning, validation flags, and source labels. Classification is per-statement-type.

**Finalization**
The final merge step: apply corrections on top of Layer 2 values, order by template field sequence, persist as `final_output` on the session record. Produces the downloadable CSV.

**Recalculation**
Deterministic Python override of computed fields (Gross Profit, EBITDA, Net Income, Total Assets, etc.) after Classification or any Correction. Uses `$1.00` rounding tolerance. The only authoritative source for computed values — AI-matched values for these fields are stored separately but never used as final output.

---

## AI Pipeline Layers

**Layer 1 (L1)**
First AI pass. Reads raw Excel/PDF source data and extracts named line items with numeric values. Output: `{ lineItems: Record<string, number>, sourceScaling, columnIdentified, sourceSheet }`.

**Layer 2 (L2)**
Second AI pass. Maps L1 line items to the firm's canonical template fields. Output: `{ values, reasoning, validationChecks, sourceLabels }`. Runs Recalculation after completion to override computed fields.

**Layer A**
First step of the Company Context AI pipeline. Converts raw analyst corrections into clean, actionable instructions. Input: a batch of company_specific corrections. Output: a structured instruction string.

**Layer B**
Second step of the Company Context AI pipeline. Takes a Layer A instruction and integrates it into the Company Context markdown file — either appending, editing, or discarding. Enforces the 5000-word context limit. Logs all changes to the Changelog.

---

## Data Concepts

**Template Fields**
The firm's canonical output schema defined in `backend/templates/loader_template.csv`. Defines all financial fields, their ordering, section membership, and bold/indent formatting rules. The single source of truth for what fields exist and how they appear in exports.

**Statement Type**
One of three values: `income_statement`, `balance_sheet`, `cash_flow_statement`. Used as the primary key for associating extractions, classifications, and corrections with a specific financial statement.

**Source Scaling**
The detected unit of numeric values in the source document (e.g., `thousands`, `millions`, `actuals`). Detected during Layer 1 and stored on the `Layer1Result`.

**Tab Config**
A per-company, per-statement-type saved mapping of Excel sheet tabs used during multi-tab extraction. Stored in `statement_tab_configs` table. Auto-loaded on the next upload for the same company, with fuzzy tab name matching.

---

## Correction Concepts

**Correction**
An analyst override of an AI-classified value for a specific template field. Has a tag that determines how it is routed. Stored on the session and optionally persisted to company-level data.

**Correction Tag**
One of three values that determines routing behavior:
- `one_off_error` — no side effects; applies to this session only
- `general_fix` — appended to `general_fixes.csv`; applied to future sessions company-wide
- `company_specific` — queued in DB; triggers the Layer A → Layer B AI pipeline to update Company Context

**Correction Pipeline**
The full processing path for `company_specific` corrections: queue → Layer A → Layer B → write Company Context → log Changelog → emit Alert if context exceeds word limit → mark processed.

**Pending Value**
A live-edited field value in the UI that has not yet been saved as a Correction. Transient frontend state only. Not persisted.

---

## Company Context

**Company Context**
A per-company markdown file (`backend/company_context/{company}.md`) containing AI-generated rules, observations, and instructions that improve future Classification accuracy for that company. Updated by the Layer A → Layer B pipeline after `company_specific` corrections are processed.

**Changelog**
A per-company JSONL log (`backend/data/changelog/{company}.jsonl`) recording every Layer B operation (append, edit, discard) with timestamps. Used in the Admin portal.

**Alert**
A JSONL record emitted when the Company Context exceeds the 5000-word limit after a Layer B operation. Shown in the Admin portal.

---

## Admin Concepts

**Correction Processing**
The batch operation that routes all queued corrections by tag, triggers the Company Context pipeline for `company_specific` ones, and marks them as processed. Triggered from the Admin portal or automatically on Step 2 approval.

**Company Dataset**
A per-company accumulating Excel file (`backend/company_datasets/{company}/`) that aggregates Layer 1 extraction results across all periods. Appended to on Step 1 approval.

---

## Frontend Concepts

**Wizard**
The three-step frontend workflow: Step 1 (Upload + Extract) → Step 2 (Classify + Correct) → Step 3 (Finalize + Export). State is held in `WizardState` via React Context.

**Wizard State**
The single source of truth for the entire frontend workflow session. Managed by `useWizardState` hook. Cleared on `resetWizard()` or `backToStep1()`.

**Assignment**
The user's manual mapping of Excel sheet tabs to statement types before running Extraction. Stored in local component state in Step 1. Saved as Tab Config after Extraction if multi-tab.
