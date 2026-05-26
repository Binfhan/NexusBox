import { FileText, Image, CheckCircle2, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export type FilterType = 'all' | 'pdf' | 'image' | 'verified' | 'pending'

interface FilterChipsProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}

const filterIds: Array<{ id: FilterType; key: string; icon?: React.ReactNode }> = [
  { id: 'all',      key: 'filter.all' },
  { id: 'pdf',      key: 'filter.pdf',      icon: <FileText className="h-3 w-3" /> },
  { id: 'image',    key: 'filter.image',    icon: <Image className="h-3 w-3" /> },
  { id: 'verified', key: 'filter.verified', icon: <CheckCircle2 className="h-3 w-3" /> },
  { id: 'pending',  key: 'filter.pending',  icon: <Clock className="h-3 w-3" /> },
]

export function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap gap-2">
      {filterIds.map((f) => (
        <button
          key={f.id}
          onClick={() => onFilterChange(f.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors
            ${activeFilter === f.id
              ? 'bg-amber-500 border-amber-500 text-zinc-950'
              : 'bg-card border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground'
            }`}
        >
          {f.icon}
          {t(f.key)}
        </button>
      ))}
    </div>
  )
}