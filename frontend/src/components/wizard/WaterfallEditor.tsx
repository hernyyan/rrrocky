/**
 * WaterfallEditor — IS waterfall steps panel for TemplateTreeEditor.
 *
 * Owns reorder, operator-cycle, remove, and add-to-waterfall logic.
 * Only rendered for income_statement where waterfall !== null.
 */
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import type { Layer1TemplateRow, WaterfallStep } from '../../types'

interface WaterfallEditorProps {
  waterfall: WaterfallStep[]
  rows: Layer1TemplateRow[]
  onChange: (waterfall: WaterfallStep[]) => void
}

function buildMap(rows: Layer1TemplateRow[]): Map<number, Layer1TemplateRow> {
  const map = new Map<number, Layer1TemplateRow>()
  function walk(rs: Layer1TemplateRow[]) {
    for (const r of rs) { map.set(r.id, r); walk(r.children) }
  }
  walk(rows)
  return map
}

function collectSumIds(rows: Layer1TemplateRow[]): number[] {
  const ids: number[] = []
  function walk(rs: Layer1TemplateRow[]) {
    for (const r of rs) {
      if (r.type === 'sum') ids.push(r.id)
      walk(r.children)
    }
  }
  walk(rows)
  return ids
}

export default function WaterfallEditor({ waterfall, rows, onChange }: WaterfallEditorProps) {
  const nodeMap = buildMap(rows)
  const inWaterfallIds = new Set(waterfall.map((w) => w.row_id))
  const addableSums = collectSumIds(rows).filter((id) => !inWaterfallIds.has(id))

  function moveWaterfall(index: number, dir: -1 | 1) {
    const next = [...waterfall]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function removeWaterfall(index: number) {
    onChange(waterfall.filter((_, i) => i !== index))
  }

  function cycleOperator(index: number) {
    if (index === 0) return
    const ops: WaterfallStep['operator'][] = ['+', '-', '=']
    const cur = waterfall[index].operator
    const curIdx = ops.indexOf(cur as '+' | '-' | '=')
    const next = ops[(curIdx + 1) % ops.length]
    onChange(waterfall.map((w, i) => (i === index ? { ...w, operator: next } : w)))
  }

  function addToWaterfall(rowId: number, label: string) {
    if (waterfall.some((w) => w.row_id === rowId)) return
    onChange([...waterfall, { row_id: rowId, label, operator: '+' }])
  }

  return (
    <div className="shrink-0 border-t border-border bg-gray-50">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 600 }}>
          IS Waterfall
        </span>
        {addableSums.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Add sum:</span>
            <select
              className="text-[11px] border border-border rounded px-1 py-0.5 bg-white"
              defaultValue=""
              onChange={(e) => {
                const id = parseInt(e.target.value)
                const row = nodeMap.get(id)
                if (row) addToWaterfall(id, row.label)
                e.target.value = ''
              }}
            >
              <option value="" disabled>pick…</option>
              {addableSums.map((id) => (
                <option key={id} value={id}>{nodeMap.get(id)?.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
        {waterfall.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No waterfall steps defined.</p>
        )}
        {waterfall.map((step, i) => (
          <div key={step.row_id} className="flex items-center gap-2 text-[12px]">
            {i === 0 ? (
              <span
                className="w-6 h-6 flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-[9px] text-muted-foreground shrink-0 select-none"
                title="Base value (start of waterfall)"
              >
                base
              </span>
            ) : (
              <button
                onClick={() => cycleOperator(i)}
                className="w-6 h-6 flex items-center justify-center rounded border border-border bg-white font-mono text-[13px] font-bold hover:bg-gray-100 shrink-0"
                title="Click to cycle operator (+  −  =)"
              >
                {step.operator}
              </button>
            )}
            <span className="flex-1 truncate" style={{ fontWeight: step.operator === '=' ? 600 : 400 }}>
              {step.label}
            </span>
            <button onClick={() => moveWaterfall(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => moveWaterfall(i, 1)} disabled={i === waterfall.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => removeWaterfall(i)} className="text-muted-foreground hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
