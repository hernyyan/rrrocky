# Layer 1: Structured Extractor (Step D)

You are given a CSV of financial statement rows with formatting metadata extracted from an Excel sheet. Your task is to classify each row and produce a nested template structure.

## Input

**Statement type:** {statement_type}

**Reporting period:** {reporting_period}

**Rows CSV (columns: row_index, label, value, bold, italic, indent):**
```
{rows_csv}
```

## Critical Rule: Preserve Labels Exactly

**DO NOT rename, shorten, paraphrase, or reformat any label.** Copy the label text from the CSV verbatim — including capitalisation, punctuation, abbreviations, and spacing. For example, "Warehouse Fulfillment" must stay "Warehouse Fulfillment", never "Fulfillment" or "Warehouse Fulfillment Expense".

## Row Types

There are exactly **two** row types you will emit:

| Type | Description |
|---|---|
| `individual` | A single line item that rolls up into a parent sum. No children. |
| `sum` | A subtotal or total. Bold or computationally derived. May have children. |

**Do NOT emit:**
- Percentage/margin/ratio rows (labels containing `%`, `Margin`, `% of`, or italic-only rows with no dollar value). Skip these entirely — do not include them in output.
- Title/header rows (section headers with no numeric value). The Python extractor has already removed genuinely blank rows, but if any slip through that look like pure section headers with no meaningful value, skip them.

## Nesting Rules

- **Sum nodes are parents.** If a sum row is a direct total of the individual rows above it (same section, higher indent → lower indent for the sum), those individuals are its `children[]`.
- **Cross-section sums** (e.g., EBITDA = Gross Profit − SG&A) have no children in the tree. Use `computed_as` to record the formula as `"row_id OP row_id"` (e.g., `"10 - 20"`).
- **Indent level** is a strong signal: higher indent = child of the next lower-indent sum below it. Bold = likely a sum.
- Assign each row a unique integer `id` starting from 10, incrementing by 1.

## Arithmetic Verification

For every `sum` node:
- Verify the value matches the sum of its children (if it has children) or the cross-section formula (if `computed_as` is set).
- Set `"validated": true` if the arithmetic checks out, `"validated": false` if not.
- Add a `"validation_note"` string explaining any discrepancy.

## Waterfall (Income Statement only)

If `statement_type` is `income_statement`, produce a top-level `waterfall` array. This is an ordered list of **major P&L milestone sums only**. Each entry has:
- `row_id`: the id of the sum row
- `label`: the label (verbatim from the row)
- `operator`: `null` (first/base row), `"+"`, `"-"`, or `"="`

**Which sums belong in the waterfall:**
- ONLY include sums that represent a major P&L milestone: top-line revenue, COGS/cost of sales, gross profit, operating expenses, EBITDA, net income, etc.
- DO NOT include sub-totals within a section (e.g. "Total Gross Sales", "Total Product Revenue") — these are components *within* the revenue section, not milestones in the P&L chain.
- A sum belongs in the waterfall only if it is a direct input or output of a cross-section equation (e.g. Gross Profit = Revenue − COGS). If a sum is purely a total of its own children and does not feed into another waterfall item, leave it out.
- **Exclude LTM and TTM rows from the waterfall.**

The waterfall represents the shortest chain that explains the IS: e.g. Net Revenue − COGS = Gross Profit − OpEx = EBITDA − Interest = EBT − Taxes = Net Income.

For non-IS statements, omit the `waterfall` key entirely.

## Validation Flags

Produce a top-level `validation_flags` array of objects `{"row_id": N, "issue": "..."}` for any rows where:
- The sum value does not match the sum of its children
- A cross-section formula seems inconsistent

## Output Format

Return a single JSON object — no markdown fences, no explanation:

```json
{
  "rows": [
    {
      "id": 10,
      "type": "sum",
      "label": "Net Revenue",
      "value": 5000000,
      "bold": true,
      "italic": false,
      "indent": 0,
      "validated": true,
      "children": [
        {
          "id": 11,
          "type": "individual",
          "label": "Product Revenue",
          "value": 3000000,
          "bold": false,
          "italic": false,
          "indent": 1,
          "children": []
        },
        {
          "id": 12,
          "type": "individual",
          "label": "Service Revenue",
          "value": 2000000,
          "bold": false,
          "italic": false,
          "indent": 1,
          "children": []
        }
      ]
    },
    {
      "id": 20,
      "type": "sum",
      "label": "Gross Profit",
      "value": 2000000,
      "bold": true,
      "italic": false,
      "indent": 0,
      "computed_as": "10 - 15",
      "validated": true,
      "children": []
    }
  ],
  "waterfall": [
    {"row_id": 10, "label": "Net Revenue", "operator": null},
    {"row_id": 15, "label": "COGS", "operator": "-"},
    {"row_id": 20, "label": "Gross Profit", "operator": "="}
  ],
  "validation_flags": []
}
```

All monetary values in the `rows` are already normalised to actual dollars by the Python extractor — do not rescale them.
