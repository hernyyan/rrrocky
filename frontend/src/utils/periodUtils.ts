/**
 * Shared utilities for parsing financial reporting period strings.
 *
 * Reporting periods are free-form "Month Year" strings (e.g. "December 2024",
 * "Dec 2024", "Dec-2024"). Two hooks previously had independent implementations
 * that had already diverged (different separator handling, different month maps).
 * This module is the single source of truth.
 */

export type ParsedPeriod = { year: number; month: number; key: string }

const MONTH_LOOKUP: Record<string, number> = {
  // Full names (1-indexed)
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  // Common abbreviations
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * Parse a reporting period string into year, month (1-indexed), and a
 * zero-padded sort key ("YYYY-MM").
 *
 * Handles separators: space, hyphen, underscore (e.g. "Dec 2024", "Dec-2024").
 * Returns null if the string cannot be parsed.
 */
export function parseReportingPeriod(period: string): ParsedPeriod | null {
  const parts = period.trim().split(/[\s\-_]+/)
  if (parts.length < 2) return null

  let month: number | undefined
  let year: number | undefined

  for (const part of parts) {
    const asNum = parseInt(part)
    if (!isNaN(asNum) && asNum > 1900) {
      year = asNum
      continue
    }
    const m = MONTH_LOOKUP[part.toLowerCase()]
    if (m) {
      month = m
      continue
    }
  }

  if (!month || !year) return null
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
}

/**
 * Convert a reporting period string to a numeric sort key.
 * Returns -Infinity for null / unparseable strings so they sort last.
 */
export function periodToSortKey(period: string | null | undefined): number {
  if (!period) return -Infinity
  const parsed = parseReportingPeriod(period)
  if (!parsed) return -Infinity
  return parsed.year * 12 + parsed.month
}
