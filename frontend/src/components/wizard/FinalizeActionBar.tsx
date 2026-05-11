/**
 * FinalizeActionBar — toolbar strip for Step3Finalize.
 *
 * Renders the back button and one of two action states:
 *   - Pre-finalize: Finalize & Save button
 *   - Post-finalize: Finalized badge + Download CSV + Start New Review
 */
import { ArrowLeft, CheckCircle2, Download, Loader2, RotateCcw } from 'lucide-react'

interface FinalizeActionBarProps {
  finalized: boolean
  saving: boolean
  exporting: boolean
  onBack: () => void
  onFinalize: () => void
  onExportCsv: () => void
  onReset: () => void
}

export default function FinalizeActionBar({
  finalized,
  saving,
  exporting,
  onBack,
  onFinalize,
  onExportCsv,
  onReset,
}: FinalizeActionBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-gray-50/80 shrink-0">
      <button
        onClick={onBack}
        disabled={finalized}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Review
      </button>

      <div className="flex-1" />

      {!finalized ? (
        <button
          onClick={onFinalize}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-[13px] hover:bg-emerald-700 transition-colors disabled:opacity-50"
          style={{ fontWeight: 500 }}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {saving ? 'Saving...' : 'Finalize & Save'}
        </button>
      ) : (
        <>
          <span
            className="flex items-center gap-1.5 text-[13px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"
            style={{ fontWeight: 500 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Finalized
          </span>
          <button
            onClick={onExportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-border text-[13px] hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ fontWeight: 500 }}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {exporting ? 'Exporting...' : 'Download CSV'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-lg text-[13px] hover:bg-primary/90 transition-colors"
            style={{ fontWeight: 500 }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start New Review
          </button>
        </>
      )}
    </div>
  )
}
