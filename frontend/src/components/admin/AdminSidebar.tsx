import { Building2, FileSpreadsheet, Wrench, History, AlertTriangle, ArrowLeft } from 'lucide-react'

export type AdminSection = 'companies' | 'reviews' | 'general-fixes' | 'changelog' | 'alerts'

const NAV_ITEMS: { id: AdminSection; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'companies',    label: 'Companies',    Icon: Building2 },
  { id: 'reviews',      label: 'Reviews',      Icon: FileSpreadsheet },
  { id: 'general-fixes',label: 'General Fixes',Icon: Wrench },
  { id: 'changelog',    label: 'Changelog',    Icon: History },
  { id: 'alerts',       label: 'Alerts',       Icon: AlertTriangle },
]

interface Props {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

export default function AdminSidebar({ active, onChange }: Props) {
  return (
    <div className="w-[180px] shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col h-full">
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-left transition-colors ${
              active === id
                ? 'bg-[#f8fafc] border-l-2 border-[#1a1f35] text-[#1a1f35]'
                : 'border-l-2 border-transparent text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1a1f35]'
            }`}
            style={{ fontWeight: active === id ? 600 : 400 }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[#e2e8f0]">
        <a
          href="/"
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.5px] text-[#94a3b8] hover:text-[#1a1f35] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </a>
      </div>
    </div>
  )
}
