import { PiggyBank } from 'lucide-react'

export default function AdminHeader() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-[#e2e8f0] bg-white shrink-0">
      <PiggyBank className="w-4 h-4 text-[#1a1f35]" />
      <span
        className="text-[11px] uppercase tracking-[1px] text-[#1a1f35]"
        style={{ fontWeight: 600 }}
      >
        Henry Admin
      </span>
    </div>
  )
}
