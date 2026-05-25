import { FileText, CheckCircle2, HardDrive, Crown } from 'lucide-react'

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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold text-zinc-100">
          {value}
        </p>
        {sublabel && (
          <p className="mt-1 text-[10px] text-zinc-600">{sublabel}</p>
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
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        label="Total Documents"
        value={totalDocs}
        color="blue"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Verified by AI"
        value={verifiedDocs}
        color="green"
      />
      <StatCard
        icon={<HardDrive className="h-5 w-5" />}
        label="Storage Used"
        value={storageUsed}
        sublabel={storageLimit ? `Limit: ${storageLimit}` : undefined}
        color="amber"
      />
      <StatCard
        icon={<Crown className="h-5 w-5" />}
        label="Plan"
        value={planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : 'Free'}
        color="amber"
      />
    </div>
  )
}
