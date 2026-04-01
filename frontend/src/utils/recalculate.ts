/**
 * Client-side mirror of backend/app/services/recalculate_service.py.
 * Same formulas, same field names, same $1 tolerance.
 * Called on every keystroke in the side panel for live preview.
 */

const TOLERANCE = 1.0

type Values = Record<string, number | null>
type Overrides = Record<string, number>

function get(v: Values, field: string): number {
  return v[field] ?? 0
}

export function recalculateIS(values: Values, overrides: Overrides): Values {
  const v: Values = { ...values }

  // Gross Profit
  const gpResult = get(v, 'Total Revenue') - get(v, 'COGS')
  const gp = applyCalc(v, overrides, 'Gross Profit', gpResult)

  // EBITDA - Standard
  const ebitdaResult = gp - get(v, 'Total Operating Expenses')
  const ebitda = applyCalc(v, overrides, 'EBITDA - Standard', ebitdaResult)

  // Adjusted EBITDA - Standard
  const adjRaw = values['EBITDA Adjustments']
  if (adjRaw !== null && adjRaw !== undefined) {
    applyCalc(v, overrides, 'Adjusted EBITDA - Standard', ebitda + adjRaw)
  } else {
    // Fallback: leave v['Adjusted EBITDA - Standard'] as-is from the input
    // so the source_matched_fallback value from backend is preserved through recalcs
  }

  // Net Income (Loss)
  const netResult = ebitda
    - get(v, 'Depreciation & Amortization')
    - get(v, 'Interest Expense/(Income)')
    - get(v, 'Other Expense / (Income)')
    - get(v, 'Taxes')
  applyCalc(v, overrides, 'Net Income (Loss)', netResult)

  // Adjusted EBITDA - Including Cures
  const ltm = v['LTM - Adj EBITDA items']
  const cure = v['Equity Cure']
  const adjStd = v['Adjusted EBITDA - Standard']
  if ((ltm !== null && ltm !== undefined) || (cure !== null && cure !== undefined)) {
    if (adjStd !== null && adjStd !== undefined) {
      applyCalc(v, overrides, 'Adjusted EBITDA - Including Cures',
        adjStd + (ltm ?? 0) + (cure ?? 0))
    }
  }

  return v
}

export function recalculateBS(values: Values, overrides: Overrides): Values {
  const v: Values = { ...values }

  // Total Current Assets
  const tca = applyCalc(v, overrides, 'Total Current Assets',
    get(v, 'Cash & Cash Equivalents') + get(v, 'Accounts Receivable')
    + get(v, 'Inventory') + get(v, 'Prepaid Expenses') + get(v, 'Other Current Assets'))

  // Total Non-Current Assets
  const tnca = applyCalc(v, overrides, 'Total Non-Current Assets',
    get(v, 'Property, Plant & Equipment') + get(v, 'Accumulated Depreciation')
    + get(v, 'Goodwill & Intangibles') + get(v, 'Other non-current assets'))

  // Total Assets
  const ta = applyCalc(v, overrides, 'Total Assets', tca + tnca)

  // Total Current Liabilities
  const tcl = applyCalc(v, overrides, 'Total Current Liabilities',
    get(v, 'Accounts Payable') + get(v, 'Accrued Liabilities') + get(v, 'Deferred Revenue')
    + get(v, 'Revolver - Balance Sheet') + get(v, 'Current Maturities') + get(v, 'Other Current Liabilities'))

  // Total Non-Current Liabilities
  const tncl = applyCalc(v, overrides, 'Total Non-Current Liabilities',
    get(v, 'Long Term Loans') + get(v, 'Long Term Leases') + get(v, 'Other Non-Current Liabilities'))

  // Total Liabilities
  const tl = applyCalc(v, overrides, 'Total Liabilities', tcl + tncl)

  // Total Equity
  const te = applyCalc(v, overrides, 'Total Equity',
    get(v, 'Paid in Capital') + get(v, 'Retained Earnings') + get(v, 'Other Equity'))

  // Total Liabilities and Equity
  const tle = applyCalc(v, overrides, 'Total Liabilities and Equity', tl + te)

  // Check — always formula, never overridden
  v['Check'] = round2(ta - tle)

  return v
}

export function recalculateCFS(values: Values, overrides: Overrides): Values {
  const v: Values = { ...values }

  applyCalc(v, overrides, 'Operating Cash Flow',
    get(v, 'Operating Cash Flow (Working Capital)')
    + get(v, 'Operating Cash Flow (Non-Working Capital)'))

  return v
}

/** Apply a calculated field: use override if present, else formula result. */
function applyCalc(v: Values, overrides: Overrides, field: string, formulaResult: number): number {
  const rounded = round2(formulaResult)
  if (field in overrides) {
    const override = overrides[field]
    v[field] = override
    return override
  }
  v[field] = rounded
  return rounded
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export { TOLERANCE }
