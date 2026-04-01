# Layer 2: Cash Flow Statement Classification

You are given the extracted JSON output from Layer 1, containing all line items and their dollar values from a company's cash flow statement. Your task is to classify each line item into the firm's standardized cash flow statement template.

## Input

**Layer 1 Extracted Data:**
```json
{layer1_output}
```

## Reasoning Traces

For every populated field in the output, include a corresponding entry in a `"REASONING"` key in the output JSON. Each entry must explain which source line item(s) were mapped to this field and why.

## Calculated Fields — Do Not Populate

The following field is computed by the system after classification. Do NOT populate it — leave it as `0` in the output.

- Operating Cash Flow

However, if Operating Cash Flow is explicitly reported in the source document as a single line, record the source-reported value in the REASONING entry under the key `"source_reported_value"`. This is used for cross-checking only.

## Template Structure

```json
{
  "Operating Cash Flow (Working Capital)": null,
  "Operating Cash Flow (Non-Working Capital)": null,
  "Operating Cash Flow": 0,
  "Investing Cash Flow": null,
  "Financing Cash Flow": null,
  "CAPEX": null
}
```

All fields default to `null`. Only populate a field if the source data supports it. `null` means unmapped/not reported. `0` means the source explicitly reported zero.

## Classification Rules

### Operating Cash Flow (Working Capital)
Changes in working capital items within cash from operations. Includes changes in accounts receivable, inventory, accounts payable, accrued liabilities, deferred revenue, and other working capital items. If the source breaks out working capital changes separately, sum them here.

### Operating Cash Flow (Non-Working Capital)
Non-cash and non-working-capital adjustments within cash from operations. Includes depreciation & amortization (add-back), amortization of debt issuance costs, stock-based compensation, deferred taxes, gain/loss on asset sales, and other non-cash items. If the source reports these separately, sum them here.

### Operating Cash Flow
Leave as `0` — system calculates as Working Capital + Non-Working Capital. If the source reports a single "Net cash provided by operating activities" (or equivalent) without breaking it into sub-components, populate both sub-components as `null` and record the source-reported value in REASONING under `"source_reported_value"`.

### Investing Cash Flow
Net cash used in or provided by investing activities. Typically negative (cash outflow). Includes purchases of property/equipment, acquisitions, proceeds from asset sales, and other investing activities. Use the net total, not individual line items.

### Financing Cash Flow
Net cash used in or provided by financing activities. Includes debt issuance/repayment, equity raises, dividends, share repurchases. Use the net total.

### CAPEX
Capital expenditures — purchases of property, plant, and equipment. Often embedded in investing activities. If the source reports CAPEX separately, use that figure. Typically reported as a negative value (cash outflow). If CAPEX is already included in Investing Cash Flow and not broken out separately, leave as `null`.

## Handling Uncertainty

If a line item cannot be confidently classified, assign it to the most likely field and append `"__FLAGGED"` to the field name in the output JSON.

## Company-Specific Classification Rules

{company_context}

If the section above contains rules, apply them when relevant. If empty, ignore this section.

## Output Format

Return a single JSON object with the following top-level keys:

1. **Statement data**: The populated template structure shown above with values (numbers or null). `Operating Cash Flow` must be `0`.
2. **`"REASONING"`**: A dictionary mapping each populated field name to its reasoning trace string. For `Operating Cash Flow`, include `"source_reported_value"` if the source reports it directly.
