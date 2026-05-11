import { ALL_STATEMENT_TYPES, STATEMENT_LABELS } from './statementMeta'
import type { Layer2Result } from '../types'

export const BOLD_FIELDS = new Set([
  // IS
  'Gross Profit',
  'Total Operating Expenses',
  'EBITDA - Standard',
  'Adjusted EBITDA - Standard',
  'Net Income (Loss)',
  'Adjusted EBITDA - Including Cures',
  // BS
  'Total Current Assets',
  'Total Non-Current Assets',
  'Total Assets',
  'Total Current Liabilities',
  'Total Non-Current Liabilities',
  'Total Liabilities',
  'Total Equity',
  'Total Liabilities and Equity',
  // CFS
  'Operating Cash Flow',
  'Investing Cash Flow',
  'Financing Cash Flow',
])

export const SECTION_HEADERS = new Set([
  'ASSETS',
  'LIABILITIES',
  'EQUITY',
  'LTM - Adj EBITDA items',
])

export const STATEMENT_HEADERS = new Set(ALL_STATEMENT_TYPES.map((t) => STATEMENT_LABELS[t]))

export const ITALIC_FIELDS = new Set(['Check'])

/** Fields whose displayed value is determined by Python formula, not direct AI match */
export const CALCULATED_FIELDS = new Set([
  // IS
  'Gross Profit',
  'EBITDA - Standard',
  'Adjusted EBITDA - Standard',
  'Net Income (Loss)',
  'Adjusted EBITDA - Including Cures',
  // BS
  'Total Current Assets',
  'Total Non-Current Assets',
  'Total Assets',
  'Total Current Liabilities',
  'Total Non-Current Liabilities',
  'Total Liabilities',
  'Total Equity',
  'Total Liabilities and Equity',
  'Check',
  // CFS
  'Operating Cash Flow',
])

/** Subset of CALCULATED_FIELDS that are not editable at all */
export const READONLY_FIELDS = new Set(['Check'])

/** Fields that are indented (not bold, not a section/statement header) */
export function isIndented(field: string): boolean {
  return (
    !BOLD_FIELDS.has(field) &&
    !SECTION_HEADERS.has(field) &&
    !STATEMENT_HEADERS.has(field)
  )
}

/**
 * Return the set of field names involved in at least one failing validation
 * check for the given Layer 2 result. Shared by Step 2 (per-field marker)
 * and Step 3 (pre-built set passed to row builder).
 */
export function getFailingFieldNames(layer2: Layer2Result | undefined): Set<string> {
  if (!layer2) return new Set()
  const failing = new Set<string>()
  for (const [checkName, check] of Object.entries(layer2.validation ?? {})) {
    if (check.status === 'FAIL') {
      for (const [field, checks] of Object.entries(layer2.fieldValidations ?? {})) {
        if ((checks as string[]).includes(checkName)) {
          failing.add(field)
        }
      }
    }
  }
  return failing
}
