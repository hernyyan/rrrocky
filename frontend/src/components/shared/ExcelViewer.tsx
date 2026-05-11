import ExcelJS from 'exceljs'
import LoadingSpinner from './LoadingSpinner'
import { useExcelViewer } from '../../hooks/useExcelViewer'

interface ExcelViewerProps {
  workbookUrl: string | null
  activeSheet: string
}

function formatCellValue(cell: ExcelJS.Cell): string {
  if (!cell || cell.type === ExcelJS.ValueType.Null) return ''
  return cell.text ?? String(cell.value ?? '')
}

export default function ExcelViewer({ workbookUrl, activeSheet }: ExcelViewerProps) {
  const { loading, error, sheet, tableData } = useExcelViewer({ workbookUrl, activeSheet })

  // ── Loading / error / empty states ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="Loading workbook preview..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (!workbookUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No file uploaded yet
      </div>
    )
  }

  if (!sheet || !tableData) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Sheet is empty or unavailable.
      </div>
    )
  }

  const { top, left, numRows, numCols, renderRows, renderCols, mergeMap, skipped, frozenRows } = tableData

  const isTruncated = numRows > renderRows || numCols > renderCols

  // ── Table rendering ─────────────────────────────────────────────────────────

  function renderRow(r: number, isHeader: boolean): React.ReactElement {
    const absRow = r + top   // 1-indexed ExcelJS row
    const rowObj = sheet!.getRow(absRow)
    const rowHpt = rowObj.height

    const cells: React.ReactElement[] = []
    for (let c = 0; c < renderCols; c++) {
      const absCol = c + left  // 1-indexed ExcelJS col
      const cellKey = `${absRow - 1},${absCol - 1}`  // 0-indexed for maps
      if (skipped.has(cellKey)) continue

      const cell = sheet!.getCell(absRow, absCol)
      const text = formatCellValue(cell)
      const isNum = cell.type === ExcelJS.ValueType.Number
      const isBold = (cell.font as ExcelJS.Font | undefined)?.bold ?? false

      const merge = mergeMap.get(cellKey)
      const colObj = sheet!.getColumn(absCol)
      const colWch = colObj.width

      cells.push(
        <td
          key={c}
          rowSpan={merge?.rowSpan}
          colSpan={merge?.colSpan}
          style={{
            height: rowHpt ? `${rowHpt * 1.25}px` : undefined,
            minWidth: colWch ? `${Math.max(colWch * 7, 40)}px` : '48px',
            textAlign: isNum ? 'right' : 'left',
            fontWeight: isBold ? 'bold' : undefined,
          }}
          className={`px-2 border-r border-b border-gray-200 overflow-hidden whitespace-nowrap ${
            isHeader ? 'bg-gray-100' : ''
          } ${text === '' ? 'text-transparent select-none' : ''}`}
        >
          {text || '\u00A0'}
        </td>,
      )
    }

    return (
      <tr key={r} className={isHeader ? '' : 'hover:bg-blue-50/30'}>
        {cells}
      </tr>
    )
  }

  const headerRows = Array.from({ length: Math.min(frozenRows, renderRows) }, (_, i) =>
    renderRow(i, true),
  )
  const bodyRows = Array.from({ length: renderRows - frozenRows }, (_, i) =>
    renderRow(i + frozenRows, false),
  )

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace", fontSize: '12px' }}
    >
      {isTruncated && (
        <div className="px-3 py-1 bg-blue-50 border-b border-blue-200 text-[11px] text-blue-600 sticky top-0 z-20">
          Preview showing {renderRows} of {numRows} rows, {renderCols} of {numCols} columns. Full data is used for extraction.
        </div>
      )}
      <table
        className="border-collapse border-l border-t border-gray-200"
        style={{ tableLayout: 'auto', borderSpacing: 0 }}
      >
        {frozenRows > 0 && (
          <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
            {headerRows}
          </thead>
        )}
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  )
}
