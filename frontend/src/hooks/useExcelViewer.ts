/**
 * useExcelViewer — owns workbook loading, parsing, and table-data derivation.
 *
 * Hides:
 *   - workbook / loading / error state
 *   - useEffect: fetch the workbook URL, parse the binary buffer via ExcelJS
 *   - sheet derivation (workbook.getWorksheet)
 *   - tableData useMemo: dimension clamping, merge-map construction (0-indexed
 *     coordinate Set + Map), frozen-row detection from sheet views
 *
 * The returned `sheet` reference and `tableData` fields are consumed directly
 * by ExcelViewer's `renderRow` function for cell-level access.
 */
import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import { API_BASE } from '../api/client'

const MAX_RENDER_ROWS = 300
const MAX_RENDER_COLS = 40

export interface ExcelTableData {
  top: number
  left: number
  numRows: number
  numCols: number
  renderRows: number
  renderCols: number
  mergeMap: Map<string, { rowSpan: number; colSpan: number }>
  skipped: Set<string>
  frozenRows: number
}

interface UseExcelViewerOptions {
  workbookUrl: string | null
  activeSheet: string
}

export function useExcelViewer({ workbookUrl, activeSheet }: UseExcelViewerOptions) {
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workbookUrl) {
      setWorkbook(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setWorkbook(null)

    fetch(`${API_BASE}${workbookUrl}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.arrayBuffer()
      })
      .then(async (buf) => {
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buf)
        setWorkbook(wb)
      })
      .catch(() => {
        setError('Unable to preview workbook. The file may be corrupted or in an unsupported format.')
      })
      .finally(() => setLoading(false))
  }, [workbookUrl])

  const sheet = workbook?.getWorksheet(activeSheet) ?? null

  const tableData = useMemo((): ExcelTableData | null => {
    if (!sheet) return null

    const dims = sheet.dimensions as { top: number; left: number; bottom: number; right: number } | null | undefined
    if (!dims || typeof dims.top !== 'number') return null

    const { top, left, bottom, right } = dims
    const numRows = bottom - top + 1
    const numCols = right - left + 1
    const renderRows = Math.min(numRows, MAX_RENDER_ROWS)
    const renderCols = Math.min(numCols, MAX_RENDER_COLS)

    // Merge map: "absRow,absCol" (0-indexed) → {rowSpan, colSpan}
    const mergeMap = new Map<string, { rowSpan: number; colSpan: number }>()
    const skipped = new Set<string>()
    const mergesRaw = (sheet as unknown as { model?: { merges?: string[] } }).model?.merges ?? []
    for (const mergeStr of mergesRaw) {
      const [startRef, endRef] = mergeStr.split(':')
      if (!startRef || !endRef) continue
      const startCell = sheet.getCell(startRef)
      const endCell = sheet.getCell(endRef)
      const r1 = Number(startCell.row) - 1
      const c1 = Number(startCell.col) - 1
      const r2 = Number(endCell.row) - 1
      const c2 = Number(endCell.col) - 1
      mergeMap.set(`${r1},${c1}`, { rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 })
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (r === r1 && c === c1) continue
          skipped.add(`${r},${c}`)
        }
      }
    }

    // Frozen rows from sheet views
    const views = sheet.views as ExcelJS.WorksheetView[]
    const frozenRows = views.find((v) => v.state === 'frozen')?.ySplit ?? 0

    return { top, left, numRows, numCols, renderRows, renderCols, mergeMap, skipped, frozenRows }
  }, [sheet])

  return { loading, error, sheet, tableData }
}
