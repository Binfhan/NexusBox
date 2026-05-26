import { useEffect, useState } from 'react'
import { FileUp, History, Wallet, X } from 'lucide-react'

interface CommandPaletteProps {
  onAction: (action: string) => void
}

const actions = [
  { id: 'upload', icon: <FileUp className="h-4 w-4" />,  label: 'Upload Document',  shortcut: 'U' },
  { id: 'recent', icon: <History className="h-4 w-4" />, label: 'View Recent',       shortcut: 'R' },
  { id: 'wallet', icon: <Wallet className="h-4 w-4" />,  label: 'Connect Wallet',    shortcut: 'W' },
]

export function CommandPalette({ onAction }: CommandPaletteProps) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-muted-foreground text-sm">⌘</span>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No actions found.</p>
          ) : (
            <div>
              <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </p>
              {filtered.map(action => (
                <button
                  key={action.id}
                  onClick={() => { onAction(action.id); setOpen(false); setQuery('') }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-amber-400 transition-colors"
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  {action.label}
                  <span className="ml-auto text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                    {action.shortcut}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}