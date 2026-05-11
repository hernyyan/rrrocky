import { ChevronDown, Loader2, Plus, Search } from 'lucide-react'
import type { Company } from '../../types'

interface CompanyComboboxProps {
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
}

export default function CompanyCombobox({
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
}: CompanyComboboxProps) {
  return (
    <div className="relative" ref={comboRef}>
      <div
        className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 cursor-pointer hover:border-gray-300 min-w-[220px]"
        onClick={() => setComboOpen(!comboOpen)}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          className="bg-transparent outline-none text-[13px] flex-1 min-w-0 disabled:cursor-not-allowed"
          placeholder={companiesLoading ? 'Loading...' : 'Select company...'}
          value={comboSearch}
          disabled={creatingCompany}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setComboOpen(true)}
        />
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </div>

      {comboOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-50 max-h-[calc(100vh-120px)] overflow-auto">
          {filteredCompanies.length === 0 && !comboSearch.trim() && (
            <p className="px-3 py-2 text-[12px] text-muted-foreground italic">
              No companies yet. Type a name to add one.
            </p>
          )}
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="px-3 py-2 text-[13px] hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectCompany(company)}
            >
              {company.name}
            </div>
          ))}
          {fuzzyMatches.length > 0 && (
            <div className="border-t border-border">
              <p className="text-[11px] text-muted-foreground italic px-3 py-1">Did you mean?</p>
              {fuzzyMatches.map((company) => (
                <div
                  key={company.id}
                  className="px-3 py-2 text-[13px] hover:bg-amber-50 cursor-pointer flex items-center gap-2 border-l-2 border-amber-400"
                  onClick={() => onSelectCompany(company)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {company.name}
                </div>
              ))}
            </div>
          )}
          {comboSearch.trim() && !hasExactMatch && (
            <div
              className="px-3 py-2 text-[13px] text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1.5 border-t border-border"
              onClick={onCreateCompany}
            >
              {creatingCompany ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {creatingCompany ? 'Creating...' : `Add "${comboSearch.trim()}" as new company`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
