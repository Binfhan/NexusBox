import { FileText, CheckCircle2, HardDrive, Crown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  color?: 'amber' | 'green' | 'blue'
}

function StatCard({ icon, label, value, sublabel, color = 'amber' }: StatCardProps) {
  const iconBg = {
    amber: 'bg-amber-500/10 text-amber-500',
    green:  'bg-emerald-500/10 text-emerald-400',
    blue:   'bg-blue-500/10 text-blue-400',
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold text-foreground">
          {value}
        </p>
        {sublabel && (
          <p className="mt-1 text-[10px] text-muted-foreground">{sublabel}</p>
        )}
      </div>
      <div className={`rounded-lg p-2.5 ${iconBg[color]}`}>
        {icon}
      </div>
    </div>
  )
}

interface StatsCardsProps {
  totalDocs: number
  verifiedDocs: number
  storageUsed: string
  storageLimit?: string
  planName?: string
}

export function StatsCards({ totalDocs, verifiedDocs, storageUsed, storageLimit, planName }: StatsCardsProps) {
  const { t } = useLanguage()
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label={t('stats.total_documents')}
        value={totalDocs}
        color="blue"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label={t('stats.verified_by_ai')}
        value={verifiedDocs}
        color="green"
      />
      <StatCard
        icon={<HardDrive className="h-5 w-5" />}
        label={t('stats.storage_used')}
        value={storageUsed}
        sublabel={storageLimit ? `${t('stats.storage_limit')} ${storageLimit}` : undefined}
        color="amber"
      />
      <StatCard
        icon={<Crown className="h-5 w-5" />}
        label={t('stats.plan')}
        value={planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : t('stats.plan_free')}
        color="amber"
      />
    </div>
  )
}
