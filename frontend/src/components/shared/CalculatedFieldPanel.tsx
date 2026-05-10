import { useState, useEffect } from 'react'
import type { CalculationMeta, Correction } from '../../types'
import { CALCULATED_FIELDS, READONLY_FIELDS } from '../../utils/templateStyling'
import { AlertTriangle, CheckCircle2, RotateCcw, Save, Trash2 } from 'lucide-react'

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value < 0 ? `(${s})` : s
}

interface CalculatedFieldPanelProps {
  fieldName: string
  meta: CalculationMeta | undefined
  existingCorrection?: Correction
  isReadonly: boolean
  onSaveOverride: (value: number, reasoning: string) => void
  onClearOverride: () => void
  onLiveEdit?: (value: number | null) => void
}

export default function CalculatedFieldPanel({
  fieldName,
  meta,
  existingCorrection,
  isReadonly,
  onSaveOverride,
  onClearOverride,
  onLiveEdit,
}: CalculatedFieldPanelProps) {
  const [overrideValue, setOverrideValue] = useState('')
  const [overrideReasoning, setOverrideReasoning] = useState('')
  const [reasoningError, setReasoningError] = useState(false)

  useEffect(() => {
    if (fieldName && existingCorrection && CALCULATED_FIELDS.has(fieldName)) {
      setOverrideValue(String(existingCorrection.correctedValue))
      setOverrideReasoning(existingCorrection.reasoning ?? '')
    } else {
      setOverrideValue('')
      setOverrideReasoning('')
    }
    setReasoningError(false)
  }, [fieldName, existingCorrection])

  const pythonResult = meta?.python_result
  const aiVal = meta?.ai_matched_value
  const matchStatus = meta?.match_status
  const overrideActive =
    meta?.type === 'overridden' ||
    (existingCorrection != null && fieldName != null && CALCULATED_FIELDS.has(fieldName))
  const mathOk = meta?.math_ok ?? true

  function handleSave() {
    const parsed = parseFloat(overrideValue)
    if (isNaN(parsed)) return
    if (!overrideReasoning.trim()) {
      setReasoningError(true)
      return
    }
    setReasoningError(false)
    onSaveOverride(parsed, overrideReasoning)
  }

  // Source-matched fallback (e.g. Adjusted EBITDA - Standard when EBITDA Adjustments null)
  if (meta?.type === 'source_matched_fallback') {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
          <p className="text-[11px] text-blue-700" style={{ fontWeight: 600 }}>
            ℹ Source-matched (formula unavailable)
          </p>
          <p className="text-[11px] text-blue-600 mt-1">{meta.reason}</p>
          {meta.ai_matched_value !== null && meta.ai_matched_value !== undefined && (
            <p className="text-[12px] text-blue-800 mt-1.5 font-mono" style={{ fontWeight: 500 }}>
              Source value: {fmt(meta.ai_matched_value)}
            </p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          To change this value, use the matched field correction form — treat it as a direct source
          match.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Formula block */}
      {meta?.formula && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
          <p
            className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1"
            style={{ fontWeight: 600 }}
          >
            Formula
          </p>
          <p className="text-[12px] text-foreground font-mono">{meta.formula}</p>
        </div>
      )}

      {/* Inputs table */}
      {meta?.inputs && Object.keys(meta.inputs).length > 0 && (
        <div className="space-y-1">
          <p
            className="text-[10px] text-muted-foreground uppercase tracking-wide"
            style={{ fontWeight: 600 }}
          >
            Inputs Used
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {Object.entries(meta.inputs).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center px-3 py-1.5 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-[11px] text-muted-foreground">{k}</span>
                <span className="text-[12px] font-mono text-foreground">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-1.5 bg-gray-50">
              <span className="text-[11px]" style={{ fontWeight: 600 }}>
                Calculated Result
              </span>
              <span className="text-[13px] font-mono" style={{ fontWeight: 600 }}>
                {fmt(pythonResult)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy detail block */}
      {matchStatus === 'discrepancy' && aiVal !== null && aiVal !== undefined && (
        <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] text-amber-700">
          <p className="flex items-center gap-1" style={{ fontWeight: 600 }}>
            <AlertTriangle className="w-3 h-3 shrink-0" /> Source reports differently
          </p>
          <div className="mt-1 space-y-0.5">
            <div className="flex justify-between">
              <span>AI found in source:</span>
              <span className="font-mono">{fmt(aiVal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Calculated result:</span>
              <span className="font-mono">{fmt(pythonResult)}</span>
            </div>
            <div className="flex justify-between">
              <span>Difference:</span>
              <span className="font-mono">{fmt(Math.abs((pythonResult ?? 0) - aiVal))}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI source match */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <span className="text-[11px] text-muted-foreground">AI Source Match</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-mono">{fmt(aiVal)}</span>
          {matchStatus === 'match' && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Match
            </span>
          )}
          {matchStatus === 'discrepancy' && (
            <span className="text-[10px] text-amber-600">
              <AlertTriangle className="w-3 h-3 inline" />
            </span>
          )}
          {matchStatus === 'not_found_in_source' && (
            <span className="text-[10px] text-muted-foreground">(not in source)</span>
          )}
        </div>
      </div>

      {/* Override status */}
      {overrideActive && !mathOk && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1">
          <p
            className="text-[11px] text-amber-700 flex items-center gap-1"
            style={{ fontWeight: 600 }}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Override active — math check failed
          </p>
          <div className="text-[11px] text-amber-700 space-y-0.5">
            <div className="flex justify-between">
              <span>Your value:</span>
              <span className="font-mono">{fmt(existingCorrection?.correctedValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Calculated result:</span>
              <span className="font-mono">{fmt(pythonResult)}</span>
            </div>
            <div className="flex justify-between">
              <span>Difference:</span>
              <span className="font-mono">
                {fmt(Math.abs((existingCorrection?.correctedValue ?? 0) - (pythonResult ?? 0)))}
              </span>
            </div>
          </div>
          <button
            onClick={onClearOverride}
            className="mt-1 text-[11px] text-amber-700 hover:text-amber-900 flex items-center gap-1 underline"
          >
            <RotateCcw className="w-3 h-3" /> Clear Override
          </button>
        </div>
      )}

      {/* Check field — read-only, no override */}
      {isReadonly && (
        <div
          className={`rounded-lg px-3 py-2.5 border ${
            pythonResult !== null && pythonResult !== undefined && Math.abs(pythonResult) > 1
              ? 'bg-red-50 border-red-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          {pythonResult !== null && pythonResult !== undefined && Math.abs(pythonResult) > 1 ? (
            <p className="text-[11px] text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Balance sheet does not balance — check
              classified values.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Balance sheet balances.
            </p>
          )}
        </div>
      )}

      {/* Override input — not shown for readonly fields */}
      {!isReadonly && (
        <div className="space-y-3 pt-1 border-t border-border">
          <h4 className="text-[12px]" style={{ fontWeight: 500 }}>
            Override Value <span className="text-muted-foreground font-normal">(optional)</span>
          </h4>

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Override Value</label>
            <input
              type="number"
              step="any"
              value={overrideValue}
              onChange={(e) => {
                setOverrideValue(e.target.value)
                const parsed = parseFloat(e.target.value)
                onLiveEdit?.(isNaN(parsed) ? null : parsed)
              }}
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter override value"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Reasoning <span className="text-red-500">*</span>
            </label>
            <textarea
              value={overrideReasoning}
              onChange={(e) => {
                setOverrideReasoning(e.target.value)
                if (e.target.value.trim()) setReasoningError(false)
              }}
              rows={3}
              className={`w-full bg-white border rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                reasoningError ? 'border-red-400' : 'border-border'
              }`}
              placeholder="Why are you overriding this calculated value?"
            />
            {reasoningError && (
              <p className="text-[10px] text-red-500 mt-1">Reasoning is required.</p>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-primary text-white py-2 rounded-lg text-[13px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            style={{ fontWeight: 500 }}
          >
            <Save className="w-3.5 h-3.5" />
            Save Override
          </button>

          {existingCorrection != null && fieldName != null && CALCULATED_FIELDS.has(fieldName) && (
            <button
              onClick={onClearOverride}
              className="w-full text-red-600 hover:text-red-700 py-1.5 text-[12px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Remove Override
            </button>
          )}
        </div>
      )}
    </div>
  )
}
