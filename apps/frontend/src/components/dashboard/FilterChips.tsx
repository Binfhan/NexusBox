import { FileText, Image, CheckCircle2, Clock } from 'lucide-react'

export type FilterType = 'all' | 'pdf' | 'image' | 'verified' | 'pending'

interface FilterChipsProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}

const filters: Array<{ id: FilterType; label: string; icon?: React.ReactNode }> = [
  { id: 'all',      label: 'All' },
  { id: 'pdf',      label: 'PDF',      icon: <FileText className="h-3 w-3" /> },
  { id: 'image',    label: 'Image',    icon: <Image className="h-3 w-3" /> },
  { id: 'verified', label: 'Verified', icon: <CheckCircle2 className="h-3 w-3" /> },
  { id: 'pending',  label: 'Pending',  icon: <Clock className="h-3 w-3" /> },
]

export function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors
            ${activeFilter === f.id
              ? 'bg-amber-500 border-amber-500 text-zinc-950'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
        >
          {f.icon}
          {f.label}
        </button>
      ))}
    </div>
  )
}