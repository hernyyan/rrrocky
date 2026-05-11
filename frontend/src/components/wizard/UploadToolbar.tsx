import { CheckCircle2, FileSpreadsheet, Loader2, Upload, X, ArrowRight } from 'lucide-react'
import CompanyCombobox from '../shared/CompanyCombobox'
import type { Company, CompanyContextStatus } from '../../types'

interface UploadToolbarProps {
  // Company combobox
  comboRef: React.RefObject<HTMLDivElement>
  comboOpen: boolean
  comboSearch: string
  companiesLoading: boolean
  creatingCompany: boolean
  filteredCompanies: Company[]
  fuzzyMatches: Company[]
  hasExactMatch: boolean
  setComboOpen: (open: boolean) => void
  onSearchChange: (value: string) => void
  onSelectCompany: (company: Company) => void
  onCreateCompany: () => void

  // Reporting period
  reportingPeriod: string
  onReportingPeriodChange: (value: string) => void

  // File upload
  fileInputRef: React.RefObject<HTMLInputElement>
  uploading: boolean
  hasUpload: boolean
  uploadedFileName: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReupload: () => void
  onClearUpload: () => void

  // Company context toggle
  useCompanyContext: boolean
  contextLoading: boolean
  contextStatus: CompanyContextStatus | null
  onToggleContext: () => void

  // Approve
  canApprove: boolean
  onApprove: () => void
}

export default function UploadToolbar({
  comboRef,
  comboOpen,
  comboSearch,
  companiesLoading,
  creatingCompany,
  filteredCompanies,
  fuzzyMatches,
  hasExactMatch,
  setComboOpen,
  onSearchChange,
  onSelectCompany,
  onCreateCompany,
  reportingPeriod,
  onReportingPeriodChange,
  fileInputRef,
  uploading,
  hasUpload,
  uploadedFileName,
  onFileChange,
  onReupload,
  onClearUpload,
  useCompanyContext,
  contextLoading,
  contextStatus,
  onToggleContext,
  canApprove,
  onApprove,
}: UploadToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-gray-50/80 shrink-0 flex-wrap">
      {/* Company dropdown */}
      <CompanyCombobox
        comboRef={comboRef}
        comboOpen={comboOpen}
        comboSearch={comboSearch}
        companiesLoading={companiesLoading}
        creatingCompany={creatingCompany}
        filteredCompanies={filteredCompanies}
        fuzzyMatches={fuzzyMatches}
        hasExactMatch={hasExactMatch}
        setComboOpen={setComboOpen}
        onSearchChange={onSearchChange}
        onSelectCompany={onSelectCompany}
        onCreateCompany={onCreateCompany}
      />

      {/* Reporting Period */}
      <input
        className="bg-white border border-border rounded-lg px-3 py-1.5 text-[13px] w-[280px] hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-muted-foreground"
        placeholder="Reporting period, e.g. February 2026"
        value={reportingPeriod}
        onChange={(e) => onReportingPeriodChange(e.target.value)}
      />

      {/* File upload input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.pdf"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Upload / Re-upload button */}
      {!hasUpload ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#030213', color: 'white', fontWeight: 500 }}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReupload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            style={{ fontWeight: 500 }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {uploadedFileName ?? 'Uploaded file'}
          </button>
          <button
            onClick={onClearUpload}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
            title="Clear upload"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Company context toggle */}
      {hasUpload && (
        <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg border border-border bg-white">
          <button
            onClick={onToggleContext}
            className={`relative w-8 h-[18px] rounded-full transition-colors ${
              useCompanyContext ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                useCompanyContext ? 'left-[17px]' : 'left-[2px]'
              }`}
            />
          </button>
          <div className="text-[12px]">
            <span style={{ fontWeight: 500 }}>Company Context</span>
            {contextLoading ? (
              <span className="text-muted-foreground ml-1.5">checking...</span>
            ) : contextStatus ? (
              contextStatus.has_rules ? (
                <span className="text-emerald-600 ml-1.5" style={{ fontWeight: 500 }}>
                  {contextStatus.rule_count} rule{contextStatus.rule_count !== 1 ? 's' : ''} ·{' '}
                  {contextStatus.word_count} words
                </span>
              ) : (
                <span className="text-muted-foreground ml-1.5">No rules yet</span>
              )
            ) : null}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Approve button */}
      {canApprove && (
        <button
          onClick={onApprove}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-[13px] hover:bg-emerald-700 transition-colors"
          style={{ fontWeight: 500 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve Extraction
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
