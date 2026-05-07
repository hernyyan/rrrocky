# Layer 1: Column Identifier (Step B)

You are given the first rows of a financial statement spreadsheet (tab-separated) and a target reporting period. Identify the exact column that contains data for that period.

## Input

**Reporting Period:** {reporting_period}

**Header rows (tab-separated, columns are 1-indexed left to right):**
```
{header_rows}
```

## Instructions

### Step 1 — Parse the reporting period

Extract the **month** and **year** from the reporting period. Examples:
- "October 2024" → month=10, year=2024
- "March 2025" → month=3, year=2025
- "September 2024" → month=9, year=2024

### Step 2 — Find the exact column

Scan every column header for a match to **that specific month and year**. Common formats:
- Full: "October 2024", "October 31, 2024", "10/31/2024"
- Short: "Oct-24", "Oct 24", "10/24", "Oct 2024"
- Numeric: "10/2024", "2024-10"
- Multi-row: year in one row ("2024"), month in the row below ("October" or "Oct")

**Exact month match is mandatory.** If the target is October (month=10), do NOT select September (month=9) or November (month=11). If you are uncertain between two adjacent months, choose the one that matches the target month exactly.

### Step 3 — Prefer Actuals/Consolidated

If multiple columns match the same period (e.g., "Actuals" and "Budget"), pick the Actuals or Consolidated column.

### Step 4 — Exclude non-period columns

Do NOT select TTM, LTM, PYE, YTD, Budget, Variance, or Prior Year columns.

### Step 5 — Detect scaling

Look for unit indicators such as "Amount in 000's", "(in thousands)", "$ in 000s", "(in millions)". If none found, assume actual dollars.

### Step 6 — Count skip_rows

Count how many rows are pure header rows before actual line-item data begins (typically 1–5). This is used to skip them during data extraction.

### Step 7 — Confirm your answer

Before returning, re-read the header of your chosen column and confirm it matches the target month ({reporting_period}). If it does not, try again.

## Output

Return a JSON object only — no explanation, no markdown fences:

```json
{
  "column_index": 4,
  "column_letter": "D",
  "source_scaling": "thousands",
  "skip_rows": 3,
  "period_matched": "Oct-24"
}
```

`source_scaling` must be one of: `"thousands"`, `"millions"`, `"actual_dollars"`.
`column_index` is 1-based (column A = 1, B = 2, etc.).
