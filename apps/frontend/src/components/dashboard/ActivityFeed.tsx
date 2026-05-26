import { Upload, Share2, CheckCircle2, Lock, FileText } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'upload' | 'share' | 'verify' | 'lock'
  title: string
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
}

// Nhận activities từ props — bạn có thể truyền từ real API
interface ActivityFeedProps {
  activities?: ActivityItem[]
}

const defaultActivities: ActivityItem[] = [
  { id: '1', type: 'verify', title: 'Document Verified',  description: 'contract-audit.pdf verified on-chain',    timestamp: new Date(Date.now() - 5 * 60000),          status: 'completed' },
  { id: '2', type: 'upload', title: 'Document Uploaded',  description: 'financial-report-2024.pdf stored',        timestamp: new Date(Date.now() - 2 * 3600000),         status: 'completed' },
  { id: '3', type: 'share',  title: 'Document Shared',    description: 'Shared with 0x1a2b...9f0e',               timestamp: new Date(Date.now() - 24 * 3600000),        status: 'completed' },
  { id: '4', type: 'lock',   title: 'Access Revoked',     description: 'Revoked access to meeting-notes.pdf',     timestamp: new Date(Date.now() - 2 * 24 * 3600000),    status: 'completed' },
]

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    upload: <Upload className="h-3.5 w-3.5" />,
    share:  <Share2 className="h-3.5 w-3.5" />,
    verify: <CheckCircle2 className="h-3.5 w-3.5" />,
    lock:   <Lock className="h-3.5 w-3.5" />,
  }
  return <>{icons[type] ?? <FileText className="h-3.5 w-3.5" />}</>
}

export function ActivityFeed({ activities = defaultActivities }: ActivityFeedProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <p className="text-xs text-muted-foreground">On-chain events</p>
      </div>

      <div className="space-y-1">
        {activities.map((item, index) => (
          <div key={item.id} className="flex gap-3">
            {/* Timeline line + icon */}
            <div className="relative flex flex-col items-center">
              <div className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted border border-border text-amber-500">
                <ActivityIcon type={item.type} />
              </div>
              {index < activities.length - 1 && (
                <div className="mt-1 h-6 w-px bg-muted" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 pt-0.5 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {getTimeAgo(item.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}