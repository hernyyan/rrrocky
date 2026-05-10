interface DuplicateCheckModalProps {
  companyName: string
  reportingPeriod: string
  finalizedAt: string | null
  onContinue: () => void
  onOverwrite: () => void
  onCancel: () => void
}

export default function DuplicateCheckModal({
  companyName,
  reportingPeriod,
  finalizedAt,
  onContinue,
  onOverwrite,
  onCancel,
}: DuplicateCheckModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-[15px] mb-2" style={{ fontWeight: 600 }}>
          Existing Data Found
        </h3>
        <p className="text-[13px] text-muted-foreground mb-5">
          <span style={{ fontWeight: 500 }}>{companyName}</span> — {reportingPeriod} was already
          loaded and finalized
          {finalizedAt ? ` on ${new Date(finalizedAt).toLocaleDateString()}` : ''}.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onContinue}
            className="w-full py-2 rounded-lg text-[13px] bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Continue with Previous
          </button>
          <button
            onClick={onOverwrite}
            className="w-full py-2 rounded-lg text-[13px] border border-border text-foreground hover:bg-gray-50 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Upload New &amp; Overwrite
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
