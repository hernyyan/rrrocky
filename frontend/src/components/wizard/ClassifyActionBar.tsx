/**
 * ClassifyActionBar — toolbar strip for Step2Classify.
 *
 * Owns the back-confirm dialog state internally so the parent only provides
 * callbacks and result counters. Renders: back button + confirm dialog,
 * validation summary badges (pass/fail/flagged/corrections), retry, approve.
 */
import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  XCircle,
  Edit3,
  ArrowRight,
  Flag,
} from 'lucide-react'

interface ClassifyActionBarProps {
  hasAnyResults: boolean
  isClassifying: boolean
  hasAnyError: boolean
  approvingStep2: boolean
  passCount: number
  failCount: number
  flaggedCount: number
  correctionCount: number
  onBack: () => void
  onRetry: () => void
  onApprove: () => void
}

export default function ClassifyActionBar({
  hasAnyResults,
  isClassifying,
  hasAnyError,
  approvingStep2,
  passCount,
  failCount,
  flaggedCount,
  correctionCount,
  onBack,
  onRetry,
  onApprove,
}: ClassifyActionBarProps) {
  const [showBackConfirm, setShowBackConfirm] = useState(false)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-gray-50/80 shrink-0">
      <button
        onClick={() => setShowBackConfirm(true)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Extraction
      </button>

      {showBackConfirm && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <span className="text-[12px] text-red-700" style={{ fontWeight: 500 }}>
            Discard all classification results and corrections?
          </span>
          <button
            onClick={() => { setShowBackConfirm(false); onBack() }}
            className="text-[12px] bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700"
          >
            Yes, go back
          </button>
          <button
            onClick={() => setShowBackConfirm(false)}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1" />

      {hasAnyResults && !isClassifying && !showBackConfirm && (
        <div className="flex items-center gap-3 text-[11px]">
          {passCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#d1fae5]" style={{ color: '#065f46', fontWeight: 600 }}>
              <CheckCircle2 className="w-3 h-3" />
              {passCount} passed
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fee2e2]" style={{ color: '#991b1b', fontWeight: 600 }}>
              <XCircle className="w-3 h-3" />
              {failCount} failed
            </span>
          )}
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fef3c7]" style={{ color: '#92400e', fontWeight: 600 }}>
              <Flag className="w-3 h-3" />
              {flaggedCount} flagged
            </span>
          )}
          {correctionCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#ede9fe]" style={{ color: '#5b21b6', fontWeight: 600 }}>
              <Edit3 className="w-3 h-3" />
              {correctionCount} correction{correctionCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {hasAnyError && (
        <button
          onClick={onRetry}
          className="text-[12px] border border-[#e2e8f0] px-3 py-1.5 transition-colors hover:bg-[#f8fafc]"
          style={{ color: '#1a1f35', borderRadius: '4px', fontWeight: 500 }}
        >
          Retry
        </button>
      )}
      <button
        onClick={onApprove}
        disabled={isClassifying || !hasAnyResults || approvingStep2}
        className="flex items-center gap-2 px-4 py-1.5 text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ fontWeight: 600, backgroundColor: '#065f46', color: '#ffffff', borderRadius: '4px' }}
      >
        {approvingStep2 ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        {approvingStep2 ? 'Processing...' : 'Approve Classification'}
        {!approvingStep2 && <ArrowRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
