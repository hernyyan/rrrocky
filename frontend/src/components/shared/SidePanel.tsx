import { useState, useEffect } from 'react'
import type { Layer2Result, Correction, ValidationCheck, CalculationMeta } from '../../types'
import { formatFieldValue } from '../../utils/formatters'
import { CALCULATED_FIELDS, READONLY_FIELDS } from '../../utils/templateStyling'
import {
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Trash2,
  RotateCcw,
} from 'lucide-react'

interface SidePanelProps {
  isOpen: boolean
  fieldName: string | null
  statementType: 'income_statement' | 'balance_sheet' | 'cash_flow_statement' | null
  layer2Result: Layer2Result | null
  existingCorrection?: Correction
  onClose: () => void
  onSaveCorrection: (correction: Omit<Correction, 'timestamp'>) => void
  onRemoveCorrection: (fieldName: string) => void
  onLiveEdit?: (fieldName: string, value: number | null, isOverride: boolean) => void
  sourceSheet?: string | null
}

const TAG_OPTIONS: { value: Correction['tag']; label: string; description: string }[] = [
  { value: 'one_off_error', label: 'One-off Error', description: 'Isolated mistake, no further action' },
  { value: 'company_specific', label: 'Company-specific', description: 'Pattern unique to this company, saved for future' },
  { value: 'general_fix', label: 'General Fix', description: 'Systematic issue, logged for review' },
]

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value < 0 ? `(${s})` : s
}

function highlightDollarAmounts(text: string): React.ReactNode {
  const parts = text.split(/(\(\$[\d,]+(?:\.\d{1,2})?\)|\$[\d,]+(?:\.\d{1,2})?)/g)
  return parts.map((part, i) => {
    if (/^\$[\d,]/.test(part) || /^\(\$[\d,]/.test(part)) {
      return (
        <span key={i} className="text-primary bg-blue-50 px-0.5 rounded" style={{ fontWeight: 600 }}>
          {part}
        </span>
      )
    }
    return part
  })
}

function statementLabel(type: string | null): string {
  if (type === 'income_statement') return 'Income Statement'
  if (type === 'balance_sheet') return 'Balance Sheet'
  if (type === 'cash_flow_statement') return 'Cash Flow Statement'
  return ''
}

// ─── Calculated Field Panel ────────────────────────────────────────────────────

function CalculatedFieldPanel({
  fieldName,
  meta,
  existingCorrection,
  isReadonly,
  onSaveOverride,
  onClearOverride,
  onLiveEdit,
}: {
  fieldName: string
  meta: CalculationMeta | undefined
  existingCorrection?: Correction
  isReadonly: boolean
  onSaveOverride: (value: number, reasoning: string) => void
  onClearOverride: () => void
  onLiveEdit?: (value: number | null) => void
}) {
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
  const overrideActive = meta?.type === 'overridden' || (existingCorrection != null && fieldName != null && CALCULATED_FIELDS.has(fieldName))
  const mathOk = meta?.math_ok ?? true

  function handleSave() {
    const parsed = parseFloat(overrideValue)
    if (isNaN(parsed)) return
    if (!overrideReasoning.trim()) { setReasoningError(true); return }
    setReasoningError(false)
    onSaveOverride(parsed, overrideReasoning)
  }

  // Source-matched fallback (Adjusted EBITDA - Standard when EBITDA Adjustments null)
  if (meta?.type === 'source_matched_fallback') {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
          <p className="text-[11px] text-blue-700" style={{ fontWeight: 600 }}>ℹ Source-matched (formula unavailable)</p>
          <p className="text-[11px] text-blue-600 mt-1">{meta.reason}</p>
          {meta.ai_matched_value !== null && meta.ai_matched_value !== undefined && (
            <p className="text-[12px] text-blue-800 mt-1.5 font-mono" style={{ fontWeight: 500 }}>
              Source value: {fmt(meta.ai_matched_value)}
            </p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">To change this value, use the matched field correction form — treat it as a direct source match.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Formula block */}
      {meta?.formula && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1" style={{ fontWeight: 600 }}>Formula</p>
          <p className="text-[12px] text-foreground font-mono">{meta.formula}</p>
        </div>
      )}

      {/* Inputs table */}
      {meta?.inputs && Object.keys(meta.inputs).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide" style={{ fontWeight: 600 }}>Inputs Used</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {Object.entries(meta.inputs).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center px-3 py-1.5 border-b border-gray-100 last:border-b-0">
                <span className="text-[11px] text-muted-foreground">{k}</span>
                <span className="text-[12px] font-mono text-foreground">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-1.5 bg-gray-50">
              <span className="text-[11px]" style={{ fontWeight: 600 }}>Calculated Result</span>
              <span className="text-[13px] font-mono" style={{ fontWeight: 600 }}>{fmt(pythonResult)}</span>
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
            <div className="flex justify-between"><span>AI found in source:</span><span className="font-mono">{fmt(aiVal)}</span></div>
            <div className="flex justify-between"><span>Calculated result:</span><span className="font-mono">{fmt(pythonResult)}</span></div>
            <div className="flex justify-between"><span>Difference:</span><span className="font-mono">{fmt(Math.abs((pythonResult ?? 0) - aiVal))}</span></div>
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
            <span className="text-[10px] text-amber-600"><AlertTriangle className="w-3 h-3 inline" /></span>
          )}
          {matchStatus === 'not_found_in_source' && (
            <span className="text-[10px] text-muted-foreground">(not in source)</span>
          )}
        </div>
      </div>

      {/* Override status */}
      {overrideActive && !mathOk && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1">
          <p className="text-[11px] text-amber-700 flex items-center gap-1" style={{ fontWeight: 600 }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Override active — math check failed
          </p>
          <div className="text-[11px] text-amber-700 space-y-0.5">
            <div className="flex justify-between"><span>Your value:</span><span className="font-mono">{fmt(existingCorrection?.correctedValue)}</span></div>
            <div className="flex justify-between"><span>Calculated result:</span><span className="font-mono">{fmt(pythonResult)}</span></div>
            <div className="flex justify-between"><span>Difference:</span><span className="font-mono">{fmt(Math.abs((existingCorrection?.correctedValue ?? 0) - (pythonResult ?? 0)))}</span></div>
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
        <div className={`rounded-lg px-3 py-2.5 border ${pythonResult !== null && pythonResult !== undefined && Math.abs(pythonResult) > 1 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          {pythonResult !== null && pythonResult !== undefined && Math.abs(pythonResult) > 1 ? (
            <p className="text-[11px] text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Balance sheet does not balance — check classified values.
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
          <h4 className="text-[12px]" style={{ fontWeight: 500 }}>Override Value <span className="text-muted-foreground font-normal">(optional)</span></h4>

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
              className={`w-full bg-white border rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${reasoningError ? 'border-red-400' : 'border-border'}`}
              placeholder="Why are you overriding this calculated value?"
            />
            {reasoningError && <p className="text-[10px] text-red-500 mt-1">Reasoning is required.</p>}
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

// ─── Main SidePanel ────────────────────────────────────────────────────────────

export default function SidePanel({
  isOpen,
  fieldName,
  statementType,
  layer2Result,
  existingCorrection,
  sourceSheet,
  onClose,
  onSaveCorrection,
  onRemoveCorrection,
  onLiveEdit,
}: SidePanelProps) {
  const isCalculated = fieldName ? CALCULATED_FIELDS.has(fieldName) : false
  const isReadonly = fieldName ? READONLY_FIELDS.has(fieldName) : false

  const currentValue =
    fieldName && layer2Result ? (layer2Result.values[fieldName] ?? null) : null

  const reasoning =
    fieldName && layer2Result ? (layer2Result.reasoning[fieldName] ?? null) : null

  const meta: CalculationMeta | undefined =
    fieldName && layer2Result?.calculationMeta
      ? layer2Result.calculationMeta[fieldName]
      : undefined

  const relevantCheckNames: string[] =
    fieldName && layer2Result?.fieldValidations
      ? (layer2Result.fieldValidations[fieldName] ?? [])
      : []

  const relevantChecks: [string, ValidationCheck][] = relevantCheckNames
    .map((name): [string, ValidationCheck | undefined] => [name, layer2Result?.validation[name]])
    .filter((pair): pair is [string, ValidationCheck] => pair[1] !== undefined)

  const hasFailure = relevantChecks.some(([, check]) => check.status === 'FAIL')
  const passCount = relevantChecks.filter(([, c]) => c.status === 'PASS').length

  // Matched field form state
  const [correctedValue, setCorrectedValue] = useState<string>('')
  const [correctionReasoning, setCorrectionReasoning] = useState('')
  const [tag, setTag] = useState<Correction['tag']>('one_off_error')
  const [reasoningError, setReasoningError] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(true)
  const [validationOpen, setValidationOpen] = useState(false)

  useEffect(() => {
    if (!isCalculated) {
      if (existingCorrection) {
        setCorrectedValue(String(existingCorrection.correctedValue))
        setCorrectionReasoning(existingCorrection.reasoning ?? '')
        setTag(existingCorrection.tag)
      } else if (currentValue !== null && currentValue !== undefined) {
        setCorrectedValue(String(currentValue))
        setCorrectionReasoning('')
        setTag('one_off_error')
      } else {
        setCorrectedValue('')
        setCorrectionReasoning('')
        setTag('one_off_error')
      }
    }
    setReasoningOpen(true)
    setValidationOpen(hasFailure)
    setReasoningError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, currentValue, existingCorrection, isCalculated])

  function handleSave() {
    if (!fieldName) return
    const parsed = parseFloat(correctedValue)
    if (isNaN(parsed)) return
    if (!correctionReasoning.trim()) { setReasoningError(true); return }
    setReasoningError(false)
    onSaveCorrection({ fieldName, originalValue: currentValue ?? 0, correctedValue: parsed, reasoning: correctionReasoning, tag })
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
  }

  function handleSaveOverride(value: number, reasoning: string) {
    if (!fieldName) return
    onSaveCorrection({
      fieldName,
      originalValue: currentValue ?? 0,
      correctedValue: value,
      reasoning,
      tag: 'one_off_error',
    })
  }

  function handleClearOverride() {
    if (!fieldName) return
    onRemoveCorrection(fieldName)
  }

  if (!isOpen || !fieldName) return null

  return (
    <div
      key={fieldName}
      className="w-[400px] border-l border-border bg-white flex flex-col shrink-0 overflow-hidden animate-fadeIn"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          {statementType && (
            <p className="text-[11px] text-muted-foreground mb-0.5">{statementLabel(statementType)}</p>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-[14px]" style={{ fontWeight: 600 }}>{fieldName}</h3>
            {isCalculated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" style={{ fontWeight: 500 }}>
                Calculated
              </span>
            )}
          </div>
          {sourceSheet && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Source: {sourceSheet}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Current value */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground mb-1">
            {isCalculated ? 'Calculated Value' : 'Classified Value'}
          </p>
          {existingCorrection ? (
            <div>
              <p className="text-[20px] font-mono line-through text-muted-foreground" style={{ fontWeight: 600 }}>
                {formatFieldValue(fieldName, currentValue)}
              </p>
              <p className="text-[12px] text-amber-600 mt-1" style={{ fontWeight: 500 }}>
                {fieldName && CALCULATED_FIELDS.has(fieldName) ? 'Overridden to:' : 'Corrected to:'}{' '}
                {formatFieldValue(fieldName, existingCorrection.correctedValue)}
              </p>
            </div>
          ) : (
            <p
              className={`text-[20px] font-mono ${currentValue !== null && currentValue < 0 ? 'text-red-600' : 'text-foreground'}`}
              style={{ fontWeight: 600 }}
            >
              {formatFieldValue(fieldName, currentValue)}
            </p>
          )}
        </div>

        {/* Calculated field panel */}
        {isCalculated ? (
          <CalculatedFieldPanel
            fieldName={fieldName}
            meta={meta}
            existingCorrection={existingCorrection}
            isReadonly={isReadonly}
            onSaveOverride={handleSaveOverride}
            onClearOverride={handleClearOverride}
            onLiveEdit={onLiveEdit ? (v) => onLiveEdit(fieldName, v, true) : undefined}
          />
        ) : (
          <>
            {/* AI Reasoning — collapsible */}
            <div className="border-b border-border">
              <button
                onClick={() => setReasoningOpen((o) => !o)}
                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-[12px]" style={{ fontWeight: 500 }}>AI Reasoning</span>
                {reasoningOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              {reasoningOpen && (
                <div className="px-4 pb-3 text-[12px] text-muted-foreground leading-relaxed">
                  {reasoning ? (
                    <p className="whitespace-pre-wrap">{highlightDollarAmounts(reasoning)}</p>
                  ) : (
                    <p className="italic">No source data mapped to this field.</p>
                  )}
                </div>
              )}
            </div>

            {/* Validation Checks — collapsible */}
            {relevantChecks.length > 0 && (
              <div className="border-b border-border">
                <button
                  onClick={() => setValidationOpen((o) => !o)}
                  className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[12px]" style={{ fontWeight: 500 }}>
                    Validation Checks ({passCount}/{relevantChecks.length} passed)
                  </span>
                  {validationOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                {validationOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {relevantChecks.map(([checkName, check]) => (
                      <div
                        key={checkName}
                        className={`rounded-lg px-3 py-2 text-[11px] ${check.status === 'PASS' ? 'bg-emerald-50' : 'bg-red-50'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {check.status === 'PASS' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                          )}
                          <span
                            style={{ fontWeight: 500 }}
                            className={check.status === 'PASS' ? 'text-emerald-700' : 'text-red-700'}
                          >
                            {check.checkName}
                          </span>
                        </div>
                        <p className={`ml-[18px] ${check.status === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {check.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Correction form */}
            <div className="px-4 py-3 space-y-3">
              <h4 className="text-[12px]" style={{ fontWeight: 500 }}>Submit Correction</h4>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Corrected Value</label>
                <input
                  type="number"
                  step="any"
                  value={correctedValue}
                  onChange={(e) => {
                    setCorrectedValue(e.target.value)
                    const parsed = parseFloat(e.target.value)
                    onLiveEdit?.(fieldName, isNaN(parsed) ? null : parsed, false)
                  }}
                  onKeyDown={handleInputKeyDown}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter corrected value"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Reasoning <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctionReasoning}
                  onChange={(e) => {
                    setCorrectionReasoning(e.target.value)
                    if (e.target.value.trim()) setReasoningError(false)
                  }}
                  rows={3}
                  className={`w-full bg-white border rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${reasoningError ? 'border-red-400' : 'border-border'}`}
                  placeholder="Explain why this value should be corrected..."
                />
                {reasoningError && (
                  <p className="text-[10px] text-red-500 mt-1">Reasoning is required for all corrections.</p>
                )}
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-2">Correction Type</label>
                <div className="space-y-2">
                  {TAG_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        tag === opt.value ? 'border-primary bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correction-tag"
                        value={opt.value}
                        checked={tag === opt.value}
                        onChange={() => setTag(opt.value)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-[12px]" style={{ fontWeight: 500 }}>{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-primary text-white py-2 rounded-lg text-[13px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                style={{ fontWeight: 500 }}
              >
                <Save className="w-3.5 h-3.5" />
                Save Correction
              </button>

              {existingCorrection && !(fieldName && CALCULATED_FIELDS.has(fieldName)) && (
                <button
                  onClick={() => onRemoveCorrection(fieldName)}
                  className="w-full text-red-600 hover:text-red-700 py-1.5 text-[12px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Correction
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
