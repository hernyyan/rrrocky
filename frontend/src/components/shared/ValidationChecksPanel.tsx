/**
 * ValidationChecksPanel — collapsible list of per-field validation check results.
 *
 * Owns its own open/close state, defaulting open when any check is failing.
 * Since SidePanel is keyed by fieldName (remounts on field change), state
 * correctly resets on each new field selection.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { ValidationCheck } from '../../types'

interface Props {
  checks: [string, ValidationCheck][]
  passCount: number
}

export default function ValidationChecksPanel({ checks, passCount }: Props) {
  const hasFailure = checks.some(([, c]) => c.status === 'FAIL')
  const [isOpen, setIsOpen] = useState(hasFailure)

  if (checks.length === 0) return null

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <span className="text-[12px]" style={{ fontWeight: 500 }}>
          Validation Checks ({passCount}/{checks.length} passed)
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 space-y-2">
          {checks.map(([checkName, check]) => (
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
                  {checkName}
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
  )
}
