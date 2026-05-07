# Layer 1: Column Identifier (Step B)

You are given the first rows of a financial statement spreadsheet (tab-separated, with 1-based row numbers prepended) and a target reporting period. Identify the exact column and section row range for the requested statement type.

## Input

**Reporting Period:** {reporting_period}

**Statement Type:** {statement_type}

**Sheet rows (format: `[row_num]\tcol1\tcol2\t...`):**
```
{header_rows}
```

## Instructions

### Step 1 — Parse the reporting period

Extract the **month** and **year** from the reporting period. Examples:
- "October 2024" → month=10, year=2024
- "March 2025" → month=3, year=2025
- "September 2024" → month=9, year=2024

### Step 2 — Find the statement section

Look for a section header row that matches the requested `statement_type`:

| statement_type | Look for |
|---|---|
| `income_statement` | "Income Statement", "P&L", "Profit and Loss", "Statement of Operations", "Statement of Income" |
| `balance_sheet` | "Balance Sheet", "Statement of Financial Position" |
| `cash_flow_statement` | "Cash Flow Statement", "Cash Flows", "Statement of Cash Flows" |

**If the sheet contains multiple statements stacked vertically**, each statement starts with its own bold section heading. Identify which block belongs to the requested `statement_type`.

**If the sheet contains only one statement**, the section spans the entire sheet.

Record the **section_start_row**: the first row that contains actual line-item data for this statement (after the section heading and any column-header rows within the section).

Record the **section_end_row**: the last row of this statement's data — either the row just before the next section heading, or the last non-empty row in the sheet, whichever comes first.

### Step 3 — Find the exact period column

Within the section you identified, scan every column header for a match to **that specific month and year**. Common formats:
- Full: "October 2024", "October 31, 2024", "10/31/2024"
- Short: "Oct-24", "Oct 24", "10/24", "Oct 2024"
- Numeric: "10/2024", "2024-10"
- Multi-row: year in one row ("2024"), month in the row below ("October" or "Oct")

**Exact month match is mandatory.** If the target is October (month=10), do NOT select September (month=9) or November (month=11). If you are uncertain between two adjacent months, choose the one that matches the target month exactly.

### Step 4 — Prefer Actuals/Consolidated

If multiple columns match the same period (e.g., "Actuals" and "Budget"), pick the Actuals or Consolidated column.

### Step 5 — Exclude non-period columns

Do NOT select TTM, LTM, PYE, YTD, Budget, Variance, or Prior Year columns.

### Step 6 — Detect scaling

Look for unit indicators such as "Amount in 000's", "(in thousands)", "$ in 000s", "(in millions)". If none found, assume actual dollars.

### Step 7 — Count skip_rows (legacy)

Set `skip_rows` to 0 — this field is unused when `section_start_row` is provided.

### Step 8 — Confirm your answer

Before returning:
1. Re-read the header of your chosen column and confirm it matches the target month ({reporting_period}).
2. Confirm that `section_start_row` points to the first data row of the `{statement_type}` section (not a heading or blank row).
3. Confirm that `section_end_row` is the last data row of the `{statement_type}` section.

If any check fails, correct the value before returning.

## Output

Return a JSON object only — no explanation, no markdown fences:

```json
{
  "column_index": 4,
  "column_letter": "D",
  "source_scaling": "thousands",
  "skip_rows": 0,
  "period_matched": "Oct-24",
  "section_start_row": 5,
  "section_end_row": 47
}
```

`source_scaling` must be one of: `"thousands"`, `"millions"`, `"actual_dollars"`.
`column_index` is 1-based (column A = 1, B = 2, etc.).
`section_start_row` and `section_end_row` are 1-based absolute sheet row numbers.
`section_end_row` must be greater than `section_start_row`.
