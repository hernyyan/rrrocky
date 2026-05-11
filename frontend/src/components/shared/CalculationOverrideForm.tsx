/**
 * CalculationOverrideForm — override input form for CalculatedFieldPanel.
 *
 * Owns the override value / reasoning state, useEffect sync from
 * existingCorrection, and save/clear actions. Mirrors the CorrectionForm
 * pattern for regular fields.
 */
import { useState, useEffect } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { CALCULATED_FIELDS } from '../../utils/templateStyling'
import type { Correction } from '../../types'

interface CalculationOverrideFormProps {
  fieldName: string
  existingCorrection?: Correction
  onSave: (value: number, reasoning: string) => void
  onClearOverride: () => void
  onLiveEdit?: (value: number | null) => void
}

export default function CalculationOverrideForm({
  fieldName,
  existingCorrection,
  onSave,
  onClearOverride,
  onLiveEdit,
}: CalculationOverrideFormProps) {
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

  function handleSave() {
    const parsed = parseFloat(overrideValue)
    if (isNaN(parsed)) return
    if (!overrideReasoning.trim()) {
      setReasoningError(true)
      return
    }
    setReasoningError(false)
    onSave(parsed, overrideReasoning)
  }

  return (
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
  )
}
