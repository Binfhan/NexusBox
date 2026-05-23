import { X, FileText, Image as ImageIcon, HardDrive, Calendar, Tag, Shield, Link2, FolderOpen, ChevronRight, Trash2 } from 'lucide-react'

interface Document {
  id: string
  title: string
  cid: string
  ai_summary: string
  tags: string[]
  is_ai_verified: boolean
  is_onchain: boolean
  status: string
  file_size?: number
  mime_type?: string
  relative_path?: string
  content_text?: string
  created_at: string
  shared_by?: string
  permission?: string
}

interface FilePreviewModalProps {
  doc: Document
  allDocs?: Document[]
  onClose: () => void
  onDelete?: (doc: Document) => void
}

function formatStorage(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

function FolderTree({ docs, currentPath }: { docs: Document[]; currentPath: string }) {
  const prefix = currentPath ? currentPath + '/' : ''
  const directChildren = docs.filter(d => d.relative_path && d.relative_path.startsWith(prefix) && d.relative_path !== currentPath)
  const subfolders = new Set<string>()

  directChildren.forEach(d => {
    const rest = d.relative_path!.slice(prefix.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx > -1) subfolders.add(rest.slice(0, slashIdx))
  })

  const filesHere = currentPath
    ? directChildren.filter(d => d.relative_path === prefix.slice(0, -1))
    : docs.filter(d => !d.relative_path)

  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set())

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  return (
    <div className="space-y-0.5">
      {filesHere.map(f => (
        <div key={f.id} className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-xs text-zinc-300">
          {f.mime_type?.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5 text-blue-400" /> : <FileText className="h-3.5 w-3.5 text-amber-400" />}
          <span className="truncate flex-1">{f.title}</span>
          <span className="text-zinc-600">{f.file_size ? formatStorage(f.file_size) : ''}</span>
        </div>
      ))}
      {Array.from(subfolders).sort().map(folderName => (
        <div key={folderName}>
          <button
            onClick={() => toggleFolder(folderName)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${openFolders.has(folderName) ? 'rotate-90' : ''}`} />
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            {folderName}
          </button>
          {openFolders.has(folderName) && (
            <div className="ml-4 border-l border-zinc-800 pl-3">
              <FolderTree docs={docs} currentPath={prefix + folderName} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

import React from 'react'

export function FilePreviewModal({ doc, allDocs = [], onClose, onDelete }: FilePreviewModalProps) {
  const folderDocs = allDocs.filter(d =>
    d.folder_group && d.folder_group === doc.folder_group &&
    d.relative_path && d.relative_path.length > 0
  )

  const base64Data = doc.content_text || ''
  const isImage = doc.mime_type?.startsWith('image/')
  const isPdf = doc.mime_type === 'application/pdf'
  const isFolder = doc.folder_group && folderDocs.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
            ) : isPdf ? (
              <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-amber-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-100">{doc.title}</h2>
              {doc.relative_path && (
                <p className="truncate text-[10px] text-zinc-600">{doc.relative_path}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={() => { onDelete(doc); onClose() }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Xóa tài liệu">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview area */}
          {isImage && base64Data ? (
            <div className="mb-6 flex items-center justify-center rounded-xl bg-zinc-950 p-4">
              <img
                src={`data:${doc.mime_type};base64,${base64Data}`}
                alt={doc.title}
                className="max-h-[50vh] max-w-full rounded-lg object-contain"
              />
            </div>
          ) : isPdf && base64Data ? (
            <div className="mb-6 rounded-xl bg-zinc-950 overflow-hidden" style={{ height: '50vh' }}>
              <embed
                src={`data:application/pdf;base64,${base64Data}`}
                type="application/pdf"
                className="h-full w-full"
              />
            </div>
          ) : isFolder ? (
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Folder contents</p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 max-h-[40vh] overflow-y-auto">
                <FolderTree docs={allDocs} currentPath={doc.relative_path || ''} />
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center justify-center rounded-xl bg-zinc-950 p-12">
              <div className="text-center">
                <FileText className="mx-auto mb-3 h-12 w-12 text-zinc-700" />
                <p className="text-sm text-zinc-500">Không có bản xem trước cho loại tệp này</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin tệp</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-zinc-600">Loại</p>
                <p className="text-xs text-zinc-300">{doc.mime_type || 'Không xác định'}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600">Kích thước</p>
                <p className="text-xs text-zinc-300">{doc.file_size ? formatStorage(doc.file_size) : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600">Ngày tạo</p>
                <p className="text-xs text-zinc-300">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600">CID</p>
                <p className="truncate font-mono text-[10px] text-zinc-400">{doc.cid}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {doc.is_ai_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-400">
                  <Shield className="h-3 w-3" /> AI Verified
                </span>
              )}
              {doc.is_onchain && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                  <Link2 className="h-3 w-3" /> On-Chain
                </span>
              )}
              {doc.shared_by && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                  Shared by {doc.shared_by.slice(0, 6)}...{doc.shared_by.slice(-4)}
                </span>
              )}
            </div>

            {doc.ai_summary && (
              <div className="pt-2">
                <p className="text-[10px] text-zinc-600 mb-1">AI Summary</p>
                <p className="text-xs leading-relaxed text-zinc-400">{doc.ai_summary}</p>
              </div>
            )}

            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {doc.tags.map((t, i) => (
                  <span key={i} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
