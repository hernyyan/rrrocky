/**
 * useGeneralFixesList — owns data loading, filtering, and sorting for the General Fixes admin view.
 *
 * Hides:
 *   - entries / total / loading / companyFilter / stmtFilter / fieldFilter state
 *   - sortField / sortDir / expandedCell state
 *   - fetch effect (refetches when companyFilter changes)
 *   - handleSort — toggles direction on same field, resets to sensible default on new field
 *   - filtered derivation — client-side filter by stmtFilter/fieldFilter + sort
 *   - columns derivation — Object.keys of first entry
 */
import { useState } from 'react'
import { adminGetGeneralFixes } from '../api/client'
import { useTableSort } from './useTableSort'
import { compareValues } from '../utils/sortUtils'
import { useFetchData } from './useFetchData'

export type SortField = 'timestamp' | 'period' | 'statement_type' | 'field_name' | 'company'

export function useGeneralFixesList() {
  const [companyFilter, setCompanyFilter] = useState('')
  const [stmtFilter, setStmtFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const { sortField, sortDir, handleSort } = useTableSort<SortField>('timestamp', 'desc', ['timestamp'])
  const [expandedCell, setExpandedCell] = useState<{ column: string; value: string } | null>(null)

  const { data, loading } = useFetchData(
    () => adminGetGeneralFixes({ company: companyFilter || undefined, limit: 500 }),
    [companyFilter],
  )

  const entries = data?.entries ?? []
  const total = data?.total_entries ?? 0

  const filtered = entries
    .filter((r) => {
      if (stmtFilter && r['statement_type'] !== stmtFilter) return false
      if (fieldFilter && !(r['field_name'] ?? '').toLowerCase().includes(fieldFilter.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const av = (a[sortField] ?? '').toLowerCase()
      const bv = (b[sortField] ?? '').toLowerCase()
      return compareValues(av, bv, sortDir)
    })

  const columns = entries.length > 0 ? Object.keys(entries[0]) : []

  return {
    total,
    loading,
    companyFilter,
    setCompanyFilter,
    stmtFilter,
    setStmtFilter,
    fieldFilter,
    setFieldFilter,
    sortField,
    sortDir,
    expandedCell,
    setExpandedCell,
    handleSort,
    filtered,
    columns,
  }
}
