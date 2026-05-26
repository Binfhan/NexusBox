import { Eye, Share2, Trash2, FileText, Link } from 'lucide-react'
import { FilterType } from './FilterChips'

// Khớp với interface Document trong dashboard gốc của bạn
interface Document {
  id: string
  title: string
  cid: string
  ai_summary: string
  tags: string[]
  is_ai_verified: boolean
  is_onchain: boolean
  status: string
  created_at: string
}

interface DocumentsTableProps {
  documents: Document[]
  filter: FilterType
  selectedId: string | null
  onSelect: (doc: Document) => void
  onDelete: (id: string) => void
  onStoreOnChain: (doc: Document) => void
}

function getStatusBadge(doc: Document) {
  if (doc.is_onchain) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
        ✓ On-Chain
      </span>
    )
  }
  if (doc.is_ai_verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
        ✓ AI Verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      ⏳ Pending
    </span>
  )
}

function getDocType(title: string): 'pdf' | 'image' | 'doc' {
  if (title.match(/\.(pdf)$/i))              return 'pdf'
  if (title.match(/\.(png|jpg|jpeg|gif)$/i)) return 'image'
  return 'doc'
}

export function DocumentsTable({
  documents,
  filter,
  selectedId,
  onSelect,
  onDelete,
  onStoreOnChain,
}: DocumentsTableProps) {
  const filtered = documents.filter((doc) => {
    if (filter === 'all')      return true
    if (filter === 'pdf')      return getDocType(doc.title) === 'pdf'
    if (filter === 'image')    return getDocType(doc.title) === 'image'
    if (filter === 'verified') return doc.is_ai_verified
    if (filter === 'pending')  return !doc.is_ai_verified
    return true
  })

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-72">
                Document Name
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                  No documents match the selected filter
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className={`border-b border-zinc-800/60 cursor-pointer transition-colors
                    ${selectedId === doc.id
                      ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
                      : 'hover:bg-zinc-800/50'
                    }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[220px]">
                        {doc.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground capitalize">
                      {getDocType(doc.title)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(doc)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!doc.is_onchain && (
                        <button
                          title="Store On-Chain"
                          onClick={() => onStoreOnChain(doc)}
                          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-amber-500/10 text-amber-500 transition-colors"
                        >
                          <Link className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="View"
                        onClick={() => onSelect(doc)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-700 text-muted-foreground transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Share"
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-700 text-muted-foreground transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => onDelete(doc.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}