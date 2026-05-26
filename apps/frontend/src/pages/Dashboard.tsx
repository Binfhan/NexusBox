import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import { Link } from 'react-router-dom'
import {
  getDocuments,
  getSharedDocuments,
  uploadDocument,
  deleteDocument,
  chatWithDocument,
  compareDocuments,
  getClauses,
  getAIAnalysis,
  getEditSuggestions,
  getStorageInfo,
  getStarredDocuments,
  getRecentDocuments,
  getTrashDocuments,
  searchDocuments,
  toggleStar,
  restoreDocument,
  getFolders,
  createFolder,
  deleteFolder,
  getFolderBreadcrumb,
  verifySharePassword,
} from '../lib/api'

import { StatsCards } from '../components/dashboard/StatsCards'
import { FilterChips, FilterType } from '../components/dashboard/FilterChips'
import { UploadBox } from '../components/dashboard/UploadBox'
import { CommandPalette } from '../components/dashboard/CommandPalette'
import { ShareDialog } from '../components/dashboard/ShareDialog'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { FilePreviewModal } from '../components/dashboard/FilePreviewModal'

import {
  Scale, FileText, Share2, Brain,
  HardDrive, Menu, X, Link2, Key, Lock,
  Sparkles, CheckCircle,
  Users, FileSearch, Eye, Trash2, Upload,
  List, Grid3X3, FolderOpen, LayoutDashboard,
  User, Settings, ExternalLink, LogOut,
  Moon, Sun, Languages,
} from 'lucide-react'

import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'

const CONTRACT_ADDRESS =
  import.meta.env.VITE_DOCVAULT_STORAGE_ADDRESS ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const CONTRACT_ABI = [
  'function storeDocument(string cid, string offchainId, bool aiVerified, bool isPublic, uint8 docType) external',
]

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
  content_text?: string
  relative_path?: string
  folder_group?: string
  created_at: string
  shared_by?: string
  share_id?: string
  permission?: string
  shared_at?: string
  has_password?: boolean
  is_starred?: boolean
}

interface DashboardProps {
  token: string
  walletAddress: string
  avatarUrl?: string | null
  displayName?: string | null
  ensName?: string | null
  onNavigate?: (page: 'profile' | 'settings') => void
  onDisconnect?: () => void
}

type SidebarTab = 'dashboard' | 'my-documents' | 'ai'

function WalletAvatar({ avatarUrl, walletAddress, size = 'sm' }: {
  avatarUrl?: string | null
  walletAddress: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [imgError, setImgError] = useState(false)
  const sizeMap = { sm: 'w-10 h-10', md: 'w-10 h-10', lg: 'w-20 h-20' }
  const sizeClass = sizeMap[size]

  if (avatarUrl && !imgError) {
    return (
      <img
        key={avatarUrl}
        src={avatarUrl}
        alt="avatar"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-amber-500/30`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br
                     from-amber-400 to-orange-600 flex items-center
                     justify-center text-zinc-950 font-bold text-xs`}>
      {walletAddress.slice(2, 4).toUpperCase()}
    </div>
  )
}

export function Dashboard({
  token, walletAddress, avatarUrl, displayName, ensName, onNavigate, onDisconnect
}: DashboardProps) {

  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard')
  const [sidebarSubTab, setSidebarSubTab] = useState<'docs' | 'compare'>('docs')
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false)
  const sidebarMenuRef = useRef<HTMLDivElement>(null)

  const [documents, setDocuments] = useState<Document[]>([])
  const [sharedDocs, setSharedDocs] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

  const [compareId1, setCompareId1] = useState('')
  const [compareId2, setCompareId2] = useState('')
  const [compareResult, setCompareResult] = useState('')
  const [isComparing, setIsComparing] = useState(false)

  const [extractedClauses, setExtractedClauses] = useState<string[]>([])
  const [isLoadingClauses, setIsLoadingClauses] = useState(false)

  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)

  const [editSuggestions, setEditSuggestions] = useState<any>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  const [storageInfo, setStorageInfo] = useState<{ storage_limit: number; storage_used: number; storage_available: number; plan_name: string; plan_max_docs: number } | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const [shareDialogDoc, setShareDialogDoc] = useState<Document | null>(null)
  const [shareDialogResourceLabel, setShareDialogResourceLabel] = useState<string | undefined>(undefined)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [passwordVerificationShareId, setPasswordVerificationShareId] = useState<string | null>(null)
  const [passwordVerificationDoc, setPasswordVerificationDoc] = useState<Document | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [showFolderMenu, setShowFolderMenu] = useState(false)

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined)
  const [folders, setFolders] = useState<any[]>([])
  const [breadcrumb, setBreadcrumb] = useState<any[]>([])
  const [navMode, setNavMode] = useState<'all' | 'starred' | 'recent' | 'trash'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any } | null>(null)
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null)

  useEffect(() => { loadDocs(); loadSharedDocs(); loadStorageInfo(); loadFolders() }, [token])

  const loadFolders = async (parentId?: string) => {
    try {
      const data = await getFolders(token, parentId)
      setFolders(data)
    } catch (err) {
      console.error('Error loading folders:', err)
    }
  }

  const loadBreadcrumb = async (folderId: string) => {
    try {
      const data = await getFolderBreadcrumb(token, folderId)
      setBreadcrumb(data)
    } catch { setBreadcrumb([]) }
  }

  const navigateToFolder = async (folderId?: string) => {
    setCurrentFolderId(folderId)
    setNavMode('all')
    if (folderId) {
      await loadBreadcrumb(folderId)
    } else {
      setBreadcrumb([])
    }
    await loadDocs(folderId, 'all')
    await loadFolders(folderId)
  }

  const handleCreateFolder = async () => {
    const name = prompt('Nhập tên thư mục mới:')
    if (!name) return
    try {
      await createFolder(token, name, currentFolderId)
      await loadFolders(currentFolderId)
    } catch (err) {
      console.error('Create folder failed:', err)
      alert('Tạo thư mục thất bại!')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    try {
      const results = await searchDocuments(token, searchQuery)
      setSearchResults(results)
    } catch { setSearchResults([]) }
  }

  const loadDocs = async (folderId?: string, mode?: string) => {
    try {
      let data: any[]
      const m = mode || navMode
      if (m === 'starred') data = await getStarredDocuments(token)
      else if (m === 'recent') data = await getRecentDocuments(token)
      else if (m === 'trash') data = await getTrashDocuments(token)
      else data = await getDocuments(token, folderId ?? currentFolderId)
      setDocuments(data)
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const loadSharedDocs = async () => {
    try {
      const data = await getSharedDocuments(token)
      setSharedDocs(data)
    } catch (err) {
      console.error('Error loading shared documents:', err)
    }
  }

  const loadStorageInfo = async () => {
    try {
      const data = await getStorageInfo(token)
      setStorageInfo(data)
    } catch (err) {
      console.error('Error loading storage info:', err)
    }
  }

  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    try {
      const isFolder = files.some(f => (f as any).webkitRelativePath)
      const folderGroup = isFolder ? 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) : ''
      for (const file of files) {
        const relativePath = (file as any).webkitRelativePath || ''
        await uploadDocument(token, file, relativePath, folderGroup, currentFolderId)
      }
      await loadDocs()
      await loadStorageInfo()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Tải tài liệu lên thất bại!')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (doc: Document) => {
    if (!window.confirm(`Xóa tài liệu "${doc.title}"?`)) return
    try {
      await deleteDocument(token, doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      setSharedDocs(prev => prev.filter(d => d.id !== doc.id))
      if (selectedDoc?.id === doc.id) setSelectedDoc(null)
      if (previewDoc?.id === doc.id) setPreviewDoc(null)
      await loadStorageInfo()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Xóa tài liệu thất bại!')
    }
  }

  const handleDeleteFolder = async (folderGroup: string) => {
    const folderDocs = documents.filter(d => d.folder_group === folderGroup)
    if (!window.confirm(`Xóa thư mục "${folderDocs.find(d => d.relative_path)?.relative_path?.split('/')[0] || folderGroup}" và ${folderDocs.length} tài liệu?`)) return
    try {
      for (const doc of folderDocs) {
        await deleteDocument(token, doc.id)
      }
      setDocuments(prev => prev.filter(d => d.folder_group !== folderGroup))
      setSharedDocs(prev => prev.filter(d => d.folder_group !== folderGroup))
      if (selectedDoc?.folder_group === folderGroup) setSelectedDoc(null)
      if (previewDoc?.folder_group === folderGroup) setPreviewDoc(null)
      await loadStorageInfo()
    } catch (err) {
      console.error('Delete folder failed:', err)
      alert('Xóa thư mục thất bại!')
    }
  }

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoc || !chatMessage.trim()) return
    const userMsg = chatMessage
    setChatMessage('')
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setIsChatLoading(true)
    try {
      const answer = await chatWithDocument(token, selectedDoc.id, chatHistory, userMsg)
      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Lỗi khi gửi tin nhắn.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!compareId1 || !compareId2) return
    setIsComparing(true)
    setCompareResult('')
    try {
      const result = await compareDocuments(token, compareId1, compareId2)
      setCompareResult(result)
    } catch {
      setCompareResult('So sánh thất bại.')
    } finally {
      setIsComparing(false)
    }
  }

  const handleExtractClauses = async (docId: string) => {
    setIsLoadingClauses(true)
    setExtractedClauses([])
    try {
      const clauses = await getClauses(token, docId)
      setExtractedClauses(clauses)
    } catch {
      console.error('Failed to extract clauses')
    } finally {
      setIsLoadingClauses(false)
    }
  }

  const handleAIAnalysis = async (docId: string) => {
    setIsLoadingAnalysis(true)
    setAiAnalysis(null)
    try {
      const analysis = await getAIAnalysis(token, docId)
      setAiAnalysis(analysis)
    } catch {
      console.error('Failed to get AI analysis')
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  const handleEditSuggestions = async (docId: string) => {
    setIsLoadingSuggestions(true)
    setEditSuggestions(null)
    try {
      const suggestions = await getEditSuggestions(token, docId)
      setEditSuggestions(suggestions)
    } catch {
      console.error('Failed to get edit suggestions')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleStoreOnChain = async (doc: Document) => {
    if (!(window as any).ethereum) {
      alert('Vui lòng cài đặt ví Metamask!')
      return
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const tx = await contract.storeDocument(doc.cid, doc.id, doc.is_ai_verified, false, 0)
      await tx.wait()
      alert('Lưu trữ On-Chain thành công!')
      loadDocs()
    } catch (err: any) {
      alert(`Giao dịch thất bại: ${err?.message || err}`)
    }
  }

  const handleStoreFolderOnChain = async (folderGroup: string) => {
    const folderDocs = documents.filter(d => d.folder_group === folderGroup && !d.is_onchain)
    if (folderDocs.length === 0) {
      alert('Tất cả tài liệu trong thư mục đã được lưu On-Chain!')
      return
    }
    if (!window.confirm(`Lưu ${folderDocs.length} tài liệu trong thư mục lên On-Chain?`)) return
    if (!(window as any).ethereum) {
      alert('Vui lòng cài đặt ví Metamask!')
      return
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      for (const doc of folderDocs) {
        const tx = await contract.storeDocument(doc.cid, doc.id, doc.is_ai_verified, false, 0)
        await tx.wait()
      }
      alert(`Đã lưu ${folderDocs.length} tài liệu lên On-Chain thành công!`)
      loadDocs()
    } catch (err: any) {
      alert(`Giao dịch thất bại: ${err?.message || err}`)
    }
  }

  const openSharedDoc = (doc: Document) => {
    if (doc.has_password && doc.share_id) {
      setPasswordVerificationShareId(doc.share_id)
      setPasswordVerificationDoc(doc)
      setPasswordInput('')
      setPasswordError('')
    } else {
      setPreviewDoc(doc)
    }
  }

  const handleToggleStar = async (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation()
    try {
      await toggleStar(token, doc.id, !doc.is_starred)
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_starred: !d.is_starred } : d))
      setSharedDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_starred: !d.is_starred } : d))
    } catch (err) {
      console.error('Toggle star failed:', err)
    }
  }

  const handleToggleStarFolder = async (e: React.MouseEvent, docs: Document[]) => {
    e.stopPropagation()
    try {
      const newStarred = !docs[0].is_starred
      for (const doc of docs) {
        await toggleStar(token, doc.id, newStarred)
      }
      setDocuments(prev => prev.map(d =>
        docs.some(fd => fd.id === d.id) ? { ...d, is_starred: newStarred } : d
      ))
      setSharedDocs(prev => prev.map(d =>
        docs.some(fd => fd.id === d.id) ? { ...d, is_starred: newStarred } : d
      ))
    } catch (err) {
      console.error('Toggle star folder failed:', err)
    }
  }

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target as Node)) {
        setSidebarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const toggleFolderExpand = (key: string) => {
    setExpandedFolder(prev => prev === key ? null : key)
  }

  const handleCommandAction = (action: string) => {
    if (action === 'upload') { setActiveTab('dashboard'); setShowUpload(true) }
  }

  const selectDoc = (doc: Document) => {
    setSelectedDoc(doc)
    setChatHistory([])
    setExtractedClauses([])
    setAiAnalysis(null)
    setEditSuggestions(null)
  }

  const formatStorage = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  function getDisplayItems(docs: Document[], extraFolders: any[] = []) {
    const folderMap = new Map<string, Document[]>()
    const files: Document[] = []

    for (const doc of docs) {
      if (doc.folder_group) {
        const arr = folderMap.get(doc.folder_group) || []
        arr.push(doc)
        folderMap.set(doc.folder_group, arr)
      } else {
        files.push(doc)
      }
    }

    const items: Array<{
      type: 'file' | 'folder'
      key: string
      doc?: Document
      docs?: Document[]
      folderName?: string
      folderEntity?: any
    }> = []

    for (const folder of extraFolders) {
      items.push({
        type: 'folder',
        key: 'f_' + folder.id,
        folderName: folder.name,
        folderEntity: folder,
      })
    }

    for (const doc of files) {
      items.push({ type: 'file', key: doc.id, doc })
    }

    for (const [, docs] of folderMap) {
      const firstRelativePath = docs.find(d => d.relative_path)?.relative_path || ''
      const folderName = firstRelativePath ? firstRelativePath.split('/')[0] : docs[0].title
      items.push({ type: 'folder', key: 'vg_' + (docs[0].folder_group || docs[0].id), docs, folderName })
    }

    items.sort((a, b) => {
      const dateA = a.doc?.created_at || (a.docs && a.docs[0]?.created_at) || ''
      const dateB = b.doc?.created_at || (b.docs && b.docs[0]?.created_at) || ''
      return dateB.localeCompare(dateA)
    })

    return items
  }

  const totalDocs = documents.length
  const verifiedDocs = documents.filter(d => d.is_ai_verified).length
  const storagePct = storageInfo
    ? Math.min(100, Math.round((storageInfo.storage_used / storageInfo.storage_limit) * 100))
    : 0

  const sidebarItems: Array<{ id: SidebarTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'my-documents', label: t('sidebar.my_documents'), icon: <FolderOpen className="h-4 w-4" />, badge: documents.length },
    { id: 'ai', label: t('sidebar.ai_analysis'), icon: <Brain className="h-4 w-4" /> },
  ]

  const filteredDocs = documents.filter(doc => {
    if (filter === 'all') return true
    if (filter === 'pdf') return doc.title?.match(/\.(pdf)$/i)
    if (filter === 'image') return doc.title?.match(/\.(png|jpg|jpeg|gif)$/i)
    if (filter === 'verified') return doc.is_ai_verified
    if (filter === 'pending') return !doc.is_ai_verified
    return true
  })

  return (
    <div className="flex min-h-0 flex-1 bg-background text-foreground overflow-hidden">

      <CommandPalette onAction={handleCommandAction} />

      {shareDialogDoc && (
        <ShareDialog
          token={token}
          docId={shareDialogDoc.id}
          docTitle={shareDialogDoc.title}
          resourceLabel={shareDialogResourceLabel}
          onClose={() => { setShareDialogDoc(null); setShareDialogResourceLabel(undefined) }}
        />
      )}

      {passwordVerificationDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setPasswordVerificationDoc(null); setPasswordVerificationShareId(null) }}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-foreground">{t('dashboard.password_required')}</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('dashboard.password_protected_message')}
            </p>
            <input type="password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }}
              placeholder={t('dashboard.enter_password')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 transition-colors mb-3" />
            {passwordError && <p className="mb-3 text-xs text-red-400">{passwordError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setPasswordVerificationDoc(null); setPasswordVerificationShareId(null); setPasswordError(''); setPasswordInput('') }}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                {t('dashboard.cancel')}
              </button>
              <button onClick={async () => {
                if (!passwordInput) { setPasswordError(t('dashboard.password_required_error')); return }
                setIsVerifyingPassword(true)
                setPasswordError('')
                try {
                  await verifySharePassword(token, passwordVerificationShareId!, passwordInput)
                  setPreviewDoc(passwordVerificationDoc)
                  setPasswordVerificationDoc(null)
                  setPasswordVerificationShareId(null)
                  setPasswordInput('')
                } catch (err: any) {
                  setPasswordError(err.message || t('dashboard.wrong_password'))
                } finally {
                  setIsVerifyingPassword(false)
                }
              }} disabled={isVerifyingPassword}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors">
                {isVerifyingPassword ? t('dashboard.verifying') : t('dashboard.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <FilePreviewModal
          doc={previewDoc}
          allDocs={[...documents, ...sharedDocs]}
          onClose={() => setPreviewDoc(null)}
          onDelete={handleDeleteDoc}
        />
      )}

      {contextMenu && (
        <div
          className="fixed z-50 w-48 rounded-xl border border-border bg-card py-1.5 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.item.folderEntity && (
            <button onClick={() => { navigateToFolder(contextMenu.item.folderEntity.id); setContextMenu(null) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> {t('dashboard.open_folder')}
            </button>
          )}
          {contextMenu.item.doc && (
            <button onClick={() => { setPreviewDoc(contextMenu.item.doc); setContextMenu(null) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <Eye className="h-3.5 w-3.5" /> {t('dashboard.preview')}
            </button>
          )}
          {contextMenu.item.docs && !contextMenu.item.folderEntity && (
            <button onClick={() => { setPreviewDoc(contextMenu.item.docs![0]); setContextMenu(null) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <Eye className="h-3.5 w-3.5" /> {t('dashboard.preview')}
            </button>
          )}
          <div className="my-1 border-t border-border" />
          {(contextMenu.item.doc || contextMenu.item.docs) && (
            <button onClick={async () => {
              setContextMenu(null)
              if (contextMenu.item.doc) {
                await toggleStar(token, contextMenu.item.doc.id, !contextMenu.item.doc.is_starred)
                setDocuments(prev => prev.map(d => d.id === contextMenu.item.doc.id ? { ...d, is_starred: !d.is_starred } : d))
                setSharedDocs(prev => prev.map(d => d.id === contextMenu.item.doc.id ? { ...d, is_starred: !d.is_starred } : d))
              } else if (contextMenu.item.docs) {
                const docs = contextMenu.item.docs
                const newStarred = !docs[0].is_starred
                for (const d of docs) await toggleStar(token, d.id, newStarred)
                setDocuments(prev => prev.map(d => docs.some((fd: Document) => fd.id === d.id) ? { ...d, is_starred: newStarred } : d))
                setSharedDocs(prev => prev.map(d => docs.some((fd: Document) => fd.id === d.id) ? { ...d, is_starred: newStarred } : d))
              }
            }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {contextMenu.item.doc?.is_starred || contextMenu.item.docs?.[0]?.is_starred ? t('dashboard.unstar') : t('dashboard.star')}
            </button>
          )}
          {(contextMenu.item.doc || contextMenu.item.docs) && (
            <button onClick={() => {
              const doc = contextMenu.item.doc || contextMenu.item.docs![0]
              setContextMenu(null)
              setShareDialogDoc(doc)
              if (contextMenu.item.docs) setShareDialogResourceLabel(`📁 ${contextMenu.item.folderName}`)
            }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <Share2 className="h-3.5 w-3.5" /> {t('dashboard.share')}
            </button>
          )}
          {contextMenu.item.doc && !contextMenu.item.doc.is_onchain && (
            <button onClick={() => { setContextMenu(null); handleStoreOnChain(contextMenu.item.doc) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <Link2 className="h-3.5 w-3.5 text-amber-500" /> {t('dashboard.store_on_chain')}
            </button>
          )}
          {contextMenu.item.docs && !contextMenu.item.folderEntity && (
            <button onClick={() => { setContextMenu(null); handleStoreFolderOnChain(contextMenu.item.docs![0].folder_group!) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
              <Link2 className="h-3.5 w-3.5 text-amber-500" /> {t('dashboard.store_all_on_chain')}
            </button>
          )}
          <div className="my-1 border-t border-border" />
          {contextMenu.item.folderEntity && (
            <button onClick={async () => {
              const folder = contextMenu.item.folderEntity
              setContextMenu(null)
              if (!window.confirm(`Xóa thư mục "${folder.name}"?`)) return
              try {
                await deleteFolder(token, folder.id, true)
                setFolders(prev => prev.filter(f => f.id !== folder.id))
                if (currentFolderId === folder.id) {
                  setCurrentFolderId(undefined)
                  setBreadcrumb([])
                  await loadDocs(undefined, 'all')
                  await loadFolders(undefined)
                }
              } catch (err) {
                console.error('Delete folder failed:', err)
                alert('Xóa thư mục thất bại!')
              }
            }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-accent transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> {t('dashboard.delete')}
            </button>
          )}
          {contextMenu.item.doc && (
            <button onClick={() => { setContextMenu(null); handleDeleteDoc(contextMenu.item.doc) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-accent transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> {t('dashboard.delete')}
            </button>
          )}
          {contextMenu.item.docs && !contextMenu.item.folderEntity && (
            <button onClick={() => { setContextMenu(null); handleDeleteFolder(contextMenu.item.docs![0].folder_group!) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-accent transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> {t('dashboard.delete_folder')}
            </button>
          )}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-border bg-background transition-all duration-300 overflow-hidden`}>
        <div className="flex h-full flex-col">
          <Link to="/" className="flex h-14 items-center gap-2 border-b border-border px-4 hover:bg-accent/50 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
              <span className="text-[10px] font-bold text-zinc-950">DV</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{t('dashboard.docvault')}</span>
          </Link>

          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setNavMode('all'); setCurrentFolderId(undefined); setBreadcrumb([]); setShowUpload(false); if (item.id !== 'dashboard') { loadDocs(); loadFolders() } }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${activeTab === item.id
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                  }`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            <div className="my-3 border-t border-border" />

            <button onClick={() => { setNavMode('starred'); setActiveTab('my-documents'); loadDocs(undefined, 'starred') }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${navMode === 'starred' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'}`}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> {t('sidebar.favorites')}
            </button>
            <button onClick={() => { setNavMode('recent'); setActiveTab('my-documents'); loadDocs(undefined, 'recent') }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${navMode === 'recent' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/></svg> {t('sidebar.recent')}
            </button>
            <button onClick={() => { setNavMode('trash'); setActiveTab('my-documents'); loadDocs(undefined, 'trash') }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${navMode === 'trash' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'}`}>
              <Trash2 className="h-4 w-4" /> {t('sidebar.trash')}
            </button>

            <div className="my-3 border-t border-border" />

            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-muted-foreground">{t('sidebar.folders')}</span>
              <div className="relative">
                <button onClick={() => setShowFolderMenu(!showFolderMenu)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Tạo mới">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                {showFolderMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-xl">
                    <button onClick={() => { setShowFolderMenu(false); handleCreateFolder() }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                      <FolderOpen className="h-4 w-4 text-amber-500" />
                      {t('sidebar.new_folder')}
                    </button>
                    <button onClick={() => { setShowFolderMenu(false); setShowUpload(true); setActiveTab('my-documents') }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                      <Upload className="h-4 w-4 text-amber-500" />
                      {t('sidebar.upload_file')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentFolderId && (
              <button onClick={() => navigateToFolder(undefined)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-transparent">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('dashboard.back_to_root')}
              </button>
            )}

            {folders.map(f => (
              <button key={f.id} onClick={() => navigateToFolder(f.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${currentFolderId === f.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'}`}>
                <FolderOpen className="h-4 w-4 text-amber-500" />
                <span className="truncate flex-1 text-left">{f.name}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-border px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                <span>{t('sidebar.storage')}</span>
              </div>
              {storageInfo && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-400 uppercase">
                  {storageInfo.plan_name}
                </span>
              )}
            </div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {storageInfo ? `${formatStorage(storageInfo.storage_used)} / ${formatStorage(storageInfo.storage_limit)}` : '...'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {storageInfo ? `${documents.length} / ${storageInfo.plan_max_docs === -1 ? '∞' : storageInfo.plan_max_docs} docs` : ''}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePct > 90 ? 'bg-red-500' : storagePct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${storagePct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{storagePct}{t('dashboard.percent_used')}</p>
          </div>

          <div className="border-t border-border px-3 py-2 flex items-center gap-1 justify-center">
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1 rounded-lg border border-border
                         bg-card hover:bg-accent px-2.5 py-1.5 text-xs font-semibold
                         text-foreground transition-colors flex-1 justify-center"
              title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === 'vi' ? 'VI' : 'EN'}
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg border border-border
                         bg-card hover:bg-accent w-8 h-8 text-foreground transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="border-t border-border p-3">
            <div className="relative" ref={sidebarMenuRef}>
              <button
                onClick={() => setSidebarMenuOpen(o => !o)}
                className="flex items-center gap-3 w-full rounded-xl p-2.5
                           hover:bg-accent transition-colors group"
              >
                <WalletAvatar
                  avatarUrl={avatarUrl}
                  walletAddress={walletAddress}
                  size="md"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName || ensName || t('dashboard.anonymous')}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
                <svg className="w-4 h-4 text-muted-foreground flex-shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </button>

              {sidebarMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2
                                bg-card border border-border rounded-xl
                                shadow-xl overflow-hidden">
                  <div className="py-1">
                    <button onClick={() => { onNavigate?.('profile'); setSidebarMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-2.5
                                 text-sm text-foreground hover:bg-accent
                                 hover:text-amber-400 transition-colors">
                      <User className="h-4 w-4" />
                      {t('sidebar.profile')}
                    </button>
                    <button onClick={() => { onNavigate?.('settings'); setSidebarMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-2.5
                                 text-sm text-foreground hover:bg-accent
                                 transition-colors">
                      <Settings className="h-4 w-4" />
                      {t('sidebar.settings')}
                    </button>
                    <button
                      onClick={() => window.open(`https://etherscan.io/address/${walletAddress}`, '_blank')}
                      className="flex items-center gap-3 w-full px-4 py-2.5
                                 text-sm text-foreground hover:bg-accent
                                 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                      {t('sidebar.etherscan')}
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <button onClick={() => { onDisconnect?.(); setSidebarMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-2.5
                                 text-sm text-muted-foreground hover:bg-red-500/10
                                 hover:text-red-400 transition-colors">
                      <LogOut className="h-4 w-4" />
                      {t('sidebar.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <h1 className="text-sm font-semibold text-foreground">
              {activeTab === 'dashboard' && t('sidebar.dashboard')}
              {activeTab === 'my-documents' && t('sidebar.my_documents')}
              {activeTab === 'ai' && t('sidebar.ai_analysis')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
            {(activeTab === 'my-documents' || activeTab === 'ai') && selectedDoc && (
              <button
                onClick={() => setShareDialogDoc(selectedDoc)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                {t('dashboard.share')}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">

            {/* ══════════════════════════════════════════
                TAB: DASHBOARD (original UI, no AI)
            ══════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-foreground">{t('dashboard.dashboard_title')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('dashboard.dashboard_subtitle')}
                  </p>
                </div>

                <div className="mb-8">
                  <StatsCards
                    totalDocs={totalDocs}
                    verifiedDocs={verifiedDocs}
                    storageUsed={storageInfo ? formatStorage(storageInfo.storage_used) : '0 B'}
                    storageLimit={storageInfo ? formatStorage(storageInfo.storage_limit) : ''}
                    planName={storageInfo?.plan_name || ''}
                  />
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    <UploadBox onUpload={handleUpload} isUploading={isUploading} />
                    <FilterChips activeFilter={filter} onFilterChange={setFilter} />
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.document_name')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.type')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.status')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.date')}</th>
                            <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                                <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
                                {t('dashboard.no_documents')}
                              </td>
                            </tr>
                          ) : (
                            getDisplayItems(filteredDocs).map(item => {
                              if (item.type === 'folder') {
                                const latest = item.docs!.reduce((a, b) => a.created_at > b.created_at ? a : b)
                                return (
                                  <tr
                                    key={item.key}
                                    onClick={() => setPreviewDoc(item.docs![0])}
                                    onContextMenu={e => handleContextMenu(e, item)}
                                    className="border-b border-border/60 cursor-pointer hover:bg-accent/50 transition-colors"
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="truncate max-w-[240px] font-medium text-foreground">{item.folderName}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-xs text-muted-foreground">{t('dashboard.folder_label')}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-xs text-muted-foreground">{item.docs!.length} {t('dashboard.documents_count')}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                      {new Date(latest.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                        <button title="Preview" onClick={() => setPreviewDoc(item.docs![0])}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Store On-Chain" onClick={() => handleStoreFolderOnChain(item.docs![0].folder_group!)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors">
                                          <Link2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Add to Favorites" onClick={e => handleToggleStarFolder(e, item.docs!)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                          <svg className={`h-3.5 w-3.5 ${item.docs![0].is_starred ? 'text-amber-400 fill-amber-400' : ''}`} viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                          </svg>
                                        </button>
                                        <button title="Share" onClick={() => { setShareDialogResourceLabel(`📁 ${item.folderName}`); setShareDialogDoc(item.docs![0]) }}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                          <Share2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Delete" onClick={() => handleDeleteFolder(item.docs![0].folder_group!)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              }
                              const doc = item.doc!
                              return (
                                <tr
                                  key={doc.id}
                                  onClick={() => selectDoc(doc)}
                                  onContextMenu={e => handleContextMenu(e, item)}
                                  className={`border-b border-border/60 cursor-pointer transition-colors ${
                                    selectedDoc?.id === doc.id
                                      ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
                                      : doc.is_starred
                                        ? 'bg-amber-500/5'
                                        : 'hover:bg-accent/50'
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate max-w-[240px] font-medium text-foreground">{doc.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-muted-foreground capitalize">
{doc.mime_type?.split('/')[1] || doc.title?.split('.').pop() || t('dashboard.unknown_type')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {doc.is_onchain ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">✓ {t('dashboard.onchain_badge')}</span>
                                    ) : doc.is_ai_verified ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">✓ {t('dashboard.ai_verified_badge')}</span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">⏳ {t('dashboard.pending_badge')}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                      <button title="Preview" onClick={() => setPreviewDoc(doc)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      {!doc.is_onchain && (
                                        <button title="Store On-Chain" onClick={() => handleStoreOnChain(doc)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors">
                                          <Link2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <button title="Add to Favorites" onClick={e => handleToggleStar(e, doc)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <svg className={`h-3.5 w-3.5 ${doc.is_starred ? 'text-amber-400 fill-amber-400' : ''}`} viewBox="0 0 24 24">
                                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                      </button>
                                      <button title="Share" onClick={() => setShareDialogDoc(doc)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <Share2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button title="Delete" onClick={() => handleDeleteDoc(doc)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex flex-col gap-6">
                    {selectedDoc ? (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="border-b border-border px-5 py-4">
                          <h2 className="truncate text-sm font-semibold text-foreground">{selectedDoc.title}</h2>
                          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">CID: {selectedDoc.cid}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
                          {!selectedDoc.is_onchain ? (
                            <button onClick={() => handleStoreOnChain(selectedDoc)}
                              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors">
                              <Link2 className="h-3.5 w-3.5" />
                              {t('dashboard.save_proof_onchain')}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                              ✓ {t('dashboard.saved_onchain')}
                            </span>
                          )}
                          <button onClick={() => setShareDialogDoc(selectedDoc)}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-amber-500 hover:text-amber-400 transition-colors">
                            <Share2 className="h-3.5 w-3.5" />
                            {t('dashboard.share')}
                          </button>
                        </div>
                        {selectedDoc.ai_summary && (
                          <div className="px-5 py-4">
                            <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">{t('dashboard.ai_summary')}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{selectedDoc.ai_summary}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-card">
                        <p className="px-6 text-center text-xs text-muted-foreground">
                          {t('dashboard.select_doc_prompt_title')}<br />{t('dashboard.select_doc_prompt_subtitle')}
                        </p>
                      </div>
                    )}
                    <ActivityFeed />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB: MY DOCUMENTS (Google Drive style + Shared board)
            ══════════════════════════════════════════ */}
            {activeTab === 'my-documents' && (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <button onClick={() => { setNavMode('all'); setCurrentFolderId(undefined); setBreadcrumb([]); loadDocs() }} className="hover:text-foreground transition-colors">{t('sidebar.dashboard')}</button>
                      {breadcrumb.length > 0 ? breadcrumb.map((f, idx) => (
                        <React.Fragment key={f.id}>
                          {idx > 0 && <span className="text-zinc-700">/</span>}
                          <button onClick={() => navigateToFolder(f.id)} className="hover:text-foreground transition-colors">
                            {f.name}
                          </button>
                        </React.Fragment>
                      )) : navMode !== 'all' && (
                        <>
                          <span className="text-zinc-700">/</span>
                          <span className="text-muted-foreground">
                            {navMode === 'starred' ? t('dashboard.favorites') : navMode === 'recent' ? t('dashboard.recent') : t('dashboard.trash')}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {navMode === 'trash' ? t('dashboard.deleted_documents') : navMode === 'starred' ? t('dashboard.favorite_documents') : navMode === 'recent' ? t('dashboard.recent_documents') : `${t('dashboard.all_documents')} (${documents.length})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input type="text" placeholder={t('dashboard.search')} value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 transition-colors"
                      />
                      <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <button onClick={() => setViewMode('list')}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:bg-accent'}`}>
                      <List className="h-4 w-4" />
                    </button>
                    <button onClick={() => setViewMode('grid')}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:bg-accent'}`}>
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <div className="mx-2 h-6 w-px bg-muted" />
                    <button onClick={() => setShowUpload(!showUpload)}
                      className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors">
                      <Upload className="h-3.5 w-3.5" /> {t('dashboard.upload')}
                    </button>
                  </div>
                </div>

                {searchResults !== null && (
                  <div className="mb-4 rounded-lg border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
                    {searchResults.length > 0
                      ? `${t('dashboard.search_results')}: ${searchResults.length} ${t('dashboard.files_found')}`
                      : t('dashboard.no_results_found')}
                    <button onClick={() => { setSearchResults(null); setSearchQuery('') }} className="ml-2 text-amber-400 hover:underline">{t('dashboard.clear')}</button>
                  </div>
                )}

                {showUpload && (
                  <div className="mb-6">
                    <UploadBox onUpload={handleUpload} isUploading={isUploading} />
                  </div>
                )}

                {documents.length === 0 && !searchResults ? (
                  <div className="mb-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
                    <FolderOpen className="mb-4 h-12 w-12 text-zinc-700" />
                    <p className="text-sm text-muted-foreground">
                      {navMode === 'trash' ? t('dashboard.trash_is_empty') : navMode === 'starred' ? t('dashboard.no_favorite_documents') : t('dashboard.no_documents_yet')}
                    </p>
                    {navMode !== 'trash' && (
                      <button onClick={() => setShowUpload(true)}
                        className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors">
                        {t('dashboard.upload_now')}
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="mb-8">
                    {navMode === 'all' && <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.my_files')} ({documents.length})</p>}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {getDisplayItems(documents, navMode === 'all' ? folders : []).map(item => {
                        if (item.type === 'folder') {
                          if (item.folderEntity) {
                            const folder = item.folderEntity
                            return (
                              <div
                                key={item.key}
                                onClick={() => navigateToFolder(folder.id)}
                                onContextMenu={e => handleContextMenu(e, item)}
                                className="group cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-border transition-all"
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <FolderOpen className="h-10 w-10 text-amber-500" />
                                </div>
                                <p className="truncate text-sm font-medium text-foreground">{folder.name}</p>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {new Date(folder.created_at).toLocaleDateString('vi-VN')}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1">
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t('dashboard.folder_label')}</span>
                                </div>
                              </div>
                            )
                          }
                          const latest = item.docs!.reduce((a, b) => a.created_at > b.created_at ? a : b)
                          return (
                            <div
                              key={item.key}
                              onClick={() => setPreviewDoc(item.docs![0])}
                              onContextMenu={e => handleContextMenu(e, item)}
                              className="group cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-border transition-all"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <FolderOpen className="h-10 w-10 text-amber-500" />
                                <div className="flex items-center gap-1">
                                  <button onClick={e => { e.stopPropagation(); toggleFolderExpand(item.key); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className={`h-4 w-4 ${expandedFolder === item.key ? 'text-amber-400' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path d={expandedFolder === item.key ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button onClick={e => handleToggleStarFolder(e, item.docs!)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className={`h-4 w-4 ${item.docs![0].is_starred ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="truncate text-sm font-medium text-foreground">{item.folderName}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {item.docs!.length} {t('dashboard.documents_count')} · {new Date(latest.created_at).toLocaleDateString('vi-VN')}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-1">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t('dashboard.folder_label')}</span>
                              </div>
                              <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setPreviewDoc(item.docs![0])}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                  <Eye className="h-3 w-3" /> {t('dashboard.preview')}
                                </button>
                                <button onClick={() => handleStoreFolderOnChain(item.docs![0].folder_group!)}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/10 transition-colors">
                                  <Link2 className="h-3 w-3" /> {t('dashboard.chain')}
                                </button>
                                <button onClick={() => { setShareDialogResourceLabel(`📁 ${item.folderName}`); setShareDialogDoc(item.docs![0]) }}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                  <Share2 className="h-3 w-3" /> {t('dashboard.share')}
                                </button>
                                <button onClick={() => handleDeleteFolder(item.docs![0].folder_group!)}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                  <Trash2 className="h-3 w-3" /> {t('dashboard.delete')}
                                </button>
                              </div>
                              {expandedFolder === item.key && item.docs && (
                                <div className="mt-3 border-t border-border pt-2 space-y-1">
                                  {item.docs.map(d => (
                                    <div key={d.id} onClick={e => { e.stopPropagation(); setPreviewDoc(d) }}
                                      className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent cursor-pointer transition-colors">
                                      <FileText className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{d.relative_path?.split('/').slice(1).join('/') || d.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        }
                        const doc = item.doc!
                        return (
                          <div
                            key={doc.id}
                            onClick={() => selectDoc(doc)}
                            onContextMenu={e => handleContextMenu(e, item)}
                            className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                              doc.is_starred
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : 'border-border bg-card hover:border-border'
                            }`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                              <div className="flex items-center gap-1">
                                <button onClick={e => handleToggleStar(e, doc)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className={`h-4 w-4 ${doc.is_starred ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                </button>
                                {doc.is_ai_verified && <CheckCircle className="h-4 w-4 text-blue-400" />}
                                {doc.is_onchain && <Link2 className="h-4 w-4 text-emerald-400" />}
                              </div>
                            </div>
                            <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {doc.file_size ? formatStorage(doc.file_size) : ''}
                              {doc.file_size ? ' · ' : ''}
                              {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {doc.mime_type?.split('/')[1] || doc.title?.split('.').pop() || t('dashboard.unknown_type')}
                              </span>
                            </div>
                            <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setPreviewDoc(doc)}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                <Eye className="h-3 w-3" /> {t('dashboard.preview')}
                              </button>
                              {navMode === 'trash' ? (
                                <button onClick={() => restoreDocument(token, doc.id).then(() => loadDocs())}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2"/><circle cx="12" cy="12" r="3" strokeWidth="2"/></svg> {t('dashboard.restore')}
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => setShareDialogDoc(doc)}
                                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                    <Share2 className="h-3 w-3" /> {t('dashboard.share')}
                                  </button>
                                  {!doc.is_onchain && (
                                    <button onClick={() => handleStoreOnChain(doc)}
                                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                      <Link2 className="h-3 w-3" /> {t('dashboard.chain')}
                                    </button>
                                  )}
                                </>
                              )}
                              <button onClick={() => handleDeleteDoc(doc)}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                <Trash2 className="h-3 w-3" /> {navMode === 'trash' ? t('dashboard.delete_permanently') : t('dashboard.delete')}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    {navMode === 'all' && <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.my_files')} ({documents.length})</p>}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.name')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.type')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.size')}</th>
                            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.date')}</th>
                            <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDisplayItems(documents, navMode === 'all' ? folders : []).map(item => {
                            if (item.type === 'folder') {
                              if (item.folderEntity) {
                                const folder = item.folderEntity
                                return (
                                  <tr key={item.key} className="border-b border-border/60 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigateToFolder(folder.id)} onContextMenu={e => handleContextMenu(e, item)}>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="truncate max-w-[200px] font-medium text-foreground">{folder.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{t('dashboard.folder_label')}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">-</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(folder.created_at).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                        <button title="Preview" onClick={() => navigateToFolder(folder.id)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Delete" onClick={async () => {
                                          if (!window.confirm(`Xóa thư mục "${folder.name}"?`)) return
                                          try {
                                            await deleteFolder(token, folder.id, true)
                                            setFolders(prev => prev.filter(f => f.id !== folder.id))
                                            if (currentFolderId === folder.id) {
                                              setCurrentFolderId(undefined)
                                              setBreadcrumb([])
                                              await loadDocs(undefined, 'all')
                                              await loadFolders(undefined)
                                            }
                                          } catch (err) {
                                            console.error('Delete folder failed:', err)
                                            alert('Xóa thư mục thất bại!')
                                          }
                                        }}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-400/10 transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              }
                              const latest = item.docs!.reduce((a, b) => a.created_at > b.created_at ? a : b)
                              return (
                                <tr key={item.key} className="border-b border-border/60 hover:bg-accent/50 transition-colors" onContextMenu={e => handleContextMenu(e, item)}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                      <span className="truncate max-w-[200px] font-medium text-foreground">{item.folderName}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{t('dashboard.folder_label')}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.docs!.length} {t('dashboard.documents_count')}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(latest.created_at).toLocaleDateString('vi-VN')}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                      <button title="Preview" onClick={() => setPreviewDoc(item.docs![0])}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      <button title="Store On-Chain" onClick={() => handleStoreFolderOnChain(item.docs![0].folder_group!)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors">
                                        <Link2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button title="Add to Favorites" onClick={e => handleToggleStarFolder(e, item.docs!)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <svg className={`h-3.5 w-3.5 ${item.docs![0].is_starred ? 'text-amber-400 fill-amber-400' : ''}`} viewBox="0 0 24 24">
                                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                      </button>
                                      <button title="Share" onClick={() => { setShareDialogResourceLabel(`📁 ${item.folderName}`); setShareDialogDoc(item.docs![0]) }}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                        <Share2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button title="Delete" onClick={() => handleDeleteFolder(item.docs![0].folder_group!)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            }
                            const doc = item.doc!
                            return (
                              <tr key={doc.id} className={`border-b border-border/60 transition-colors ${doc.is_starred ? 'bg-amber-500/5' : 'hover:bg-accent/50'}`} onContextMenu={e => handleContextMenu(e, item)}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate max-w-[200px] font-medium text-foreground">{doc.title}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{doc.mime_type?.split('/')[1] || doc.title?.split('.').pop() || t('dashboard.unknown_type')}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{doc.file_size ? formatStorage(doc.file_size) : '-'}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                    <button title="Preview" onClick={() => setPreviewDoc(doc)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button title="Add to Favorites" onClick={e => handleToggleStar(e, doc)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                      <svg className={`h-3.5 w-3.5 ${doc.is_starred ? 'text-amber-400 fill-amber-400' : ''}`} viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                      </svg>
                                    </button>
                                    <button title="Share" onClick={() => setShareDialogDoc(doc)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-700 transition-colors">
                                      <Share2 className="h-3.5 w-3.5" />
                                    </button>
                                    {!doc.is_onchain && (
                                      <button title="Store On-Chain" onClick={() => handleStoreOnChain(doc)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors">
                                        <Link2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button title="Delete" onClick={() => handleDeleteDoc(doc)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {navMode === 'all' && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-amber-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.shared_with_me')} ({sharedDocs.length})</p>
                    </div>
                    {sharedDocs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12">
                        <Users className="mb-3 h-8 w-8 text-zinc-700" />
                        <p className="text-xs text-muted-foreground">{t('dashboard.no_shared_documents')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sharedDocs.map(doc => (
                          <div
                            key={doc.share_id || doc.id}
                            onClick={() => openSharedDoc(doc)}
                            className="group cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-amber-500/40 transition-all"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div className="flex items-center gap-1">
                                {doc.permission === 'edit' ? (
                                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-400">{t('dashboard.edit_permission')}</span>
                                ) : (
                                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-medium text-blue-400">{t('dashboard.view_permission')}</span>
                                )}
                              </div>
                            </div>
                            <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                            <p className="mt-1 truncate text-[10px] text-muted-foreground">
                              {t('dashboard.from_user')} <span className="font-mono text-muted-foreground">{doc.shared_by?.slice(0, 6)}...{doc.shared_by?.slice(-4)}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">{doc.shared_at ? new Date(doc.shared_at).toLocaleDateString('vi-VN') : ''}</p>
                            <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openSharedDoc(doc)}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-muted py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-zinc-700 transition-colors">
                                <Eye className="h-3 w-3" /> {t('dashboard.preview')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB: AI ANALYSIS
            ══════════════════════════════════════════ */}
            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{t('dashboard.ai_analysis_title')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.ai_analysis_subtitle')}</p>
                  </div>

                  <div className="mb-4 flex items-center gap-1 border-b border-border">
                    {[
                      { id: 'docs', label: t('dashboard.ai_chat_clauses_tab'), icon: <Brain className="h-4 w-4" /> },
                      { id: 'compare', label: t('dashboard.compare_tab'), icon: <Scale className="h-4 w-4" /> },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setSidebarSubTab(tab.id as 'docs' | 'compare')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                          sidebarSubTab === tab.id
                            ? 'border-amber-500 text-amber-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-600'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {sidebarSubTab === 'docs' && (
                    <div className="space-y-6">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('dashboard.select_document_label')}</label>
                        <select
                          value={selectedDoc?.id || ''}
                          onChange={e => {
                            const doc = documents.find(d => d.id === e.target.value)
                            if (doc) selectDoc(doc)
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500 transition-colors"
                        >
                          <option value="">{t('dashboard.select_document_option')}</option>
                          {documents.map(d => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                          ))}
                        </select>
                      </div>

                      {selectedDoc && (
                        <>
                          <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                {t('dashboard.ai_deep_analysis')}
                              </p>
                              <button
                                onClick={() => handleAIAnalysis(selectedDoc.id)}
                                disabled={isLoadingAnalysis}
                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                              >
                                {isLoadingAnalysis ? t('dashboard.analyzing') : t('dashboard.analyze')}
                              </button>
                            </div>
                            {isLoadingAnalysis && (
                              <div className="flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-amber-500" />
                              </div>
                            )}
                            {aiAnalysis && !isLoadingAnalysis && (
                              <div className="px-5 py-4 space-y-3">
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t('dashboard.summary')}</p>
                                  <p className="mt-1 text-sm text-foreground">{aiAnalysis.summary}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t('dashboard.key_points')}</p>
                                  <ul className="mt-1 space-y-1">
                                    {aiAnalysis.keyPoints?.map((p: string, i: number) => (
                                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                        <span className="text-amber-500">•</span>
                                        {p}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="flex gap-2">
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {t('dashboard.type_label')} {aiAnalysis.documentType}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                                    aiAnalysis.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                                    aiAnalysis.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {aiAnalysis.sentiment}
                                  </span>
                                </div>
                                {aiAnalysis.recommendations?.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t('dashboard.recommendations')}</p>
                                    <ul className="mt-1 space-y-1">
                                      {aiAnalysis.recommendations.map((r: string, i: number) => (
                                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                          <span className="text-blue-400">→</span>
                                          {r}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <FileSearch className="h-3.5 w-3.5 text-amber-500" />
                                {t('dashboard.edit_strategy_suggestions')}
                              </p>
                              <button
                                onClick={() => handleEditSuggestions(selectedDoc.id)}
                                disabled={isLoadingSuggestions}
                                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-[10px] font-medium text-foreground hover:border-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                              >
                                {isLoadingSuggestions ? t('dashboard.loading') : t('dashboard.get_suggestions')}
                              </button>
                            </div>
                            {isLoadingSuggestions && (
                              <div className="flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-amber-500" />
                              </div>
                            )}
                            {editSuggestions && !isLoadingSuggestions && (
                              <div className="px-5 py-4 space-y-3">
                                <div className="rounded-lg bg-muted px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground">{t('dashboard.overall_strategy')}</p>
                                  <p className="mt-0.5 text-xs text-foreground">{editSuggestions.overallStrategy}</p>
                                </div>
                                <div className="flex gap-2">
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {t('dashboard.complexity_label')} {editSuggestions.estimatedComplexity}
                                  </span>
                                </div>
                                {editSuggestions.suggestions?.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase">{t('dashboard.suggestions')} ({editSuggestions.suggestions.length})</p>
                                    <div className="space-y-2">
                                      {editSuggestions.suggestions.map((s: any, i: number) => (
                                        <div key={i} className="rounded-lg border border-border bg-background p-3">
                                          <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-medium text-foreground">{s.section}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                              s.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                              s.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                              'bg-blue-500/10 text-blue-400'
                                            }`}>
                                              {s.priority}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground">{t('dashboard.issue_label')} {s.issue}</p>
                                          <p className="mt-1 text-[10px] text-muted-foreground">→ {s.suggestion}</p>
                                          <p className="mt-0.5 text-[9px] text-muted-foreground">{s.reason}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border px-5 py-3">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                💬 AI Chat
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 bg-background p-4 min-h-[180px] max-h-[240px] overflow-y-auto">
                              {chatHistory.length === 0 ? (
                                <p className="pt-6 text-center text-xs italic text-muted-foreground">{t('dashboard.chat_placeholder')}</p>
                              ) : (
                                chatHistory.map((h, i) => (
                                  <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                                    h.role === 'user'
                                      ? 'self-end bg-amber-500/10 text-amber-200'
                                      : 'self-start bg-muted text-foreground'
                                  }`}>
                                    {h.content}
                                  </div>
                                ))
                              )}
                              {isChatLoading && <p className="self-start text-xs italic text-muted-foreground">{t('dashboard.ai_responding')}</p>}
                            </div>
                            <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-border p-3">
                              <input
                                type="text"
                                value={chatMessage}
                                onChange={e => setChatMessage(e.target.value)}
                                placeholder={t('dashboard.enter_question')}
                                disabled={isChatLoading || !selectedDoc}
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 disabled:opacity-50 transition-colors"
                              />
                              <button type="submit" disabled={isChatLoading || !selectedDoc}
                                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors">
                                {t('dashboard.send')}
                              </button>
                            </form>
                          </div>

                          <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Key className="h-3.5 w-3.5 text-amber-500" />
                                {t('dashboard.key_clauses')}
                              </p>
                              <button onClick={() => handleExtractClauses(selectedDoc.id)} disabled={isLoadingClauses}
                                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-[10px] font-medium text-foreground hover:border-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors">
                                {isLoadingClauses ? t('dashboard.extracting') : t('dashboard.extract')}
                              </button>
                            </div>
                            {isLoadingClauses && (
                              <div className="flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-amber-500" />
                              </div>
                            )}
                            {extractedClauses.length > 0 && !isLoadingClauses && (
                              <div className="px-5 py-4">
                                <ul className="space-y-1.5">
                                  {extractedClauses.map((c, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium text-amber-500">{i + 1}.</span>
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {extractedClauses.length === 0 && !isLoadingClauses && (
                              <div className="px-5 py-4 text-xs text-muted-foreground">
                                {t('dashboard.extract_hint')}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {sidebarSubTab === 'compare' && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h3 className="mb-6 text-lg font-semibold text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-amber-500" />
                        {t('dashboard.compare_title')}
                      </h3>
                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('dashboard.document_1')}</label>
                          <select value={compareId1} onChange={e => setCompareId1(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500 transition-colors">
                            <option value="">{t('dashboard.select_option')}</option>
                            {documents.map(d => (<option key={d.id} value={d.id}>{d.title}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('dashboard.document_2')}</label>
                          <select value={compareId2} onChange={e => setCompareId2(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500 transition-colors">
                            <option value="">{t('dashboard.select_option')}</option>
                            {documents.map(d => (<option key={d.id} value={d.id}>{d.title}</option>))}
                          </select>
                        </div>
                      </div>
                      <button onClick={handleCompare} disabled={isComparing || !compareId1 || !compareId2}
                        className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors">
                        {isComparing ? t('dashboard.comparing') : t('dashboard.compare')}
                      </button>
                      {compareResult && (
                        <div className="mt-6 border-t border-border pt-6">
                          <h4 className="mb-3 text-sm font-semibold text-foreground">{t('dashboard.result_label')}</h4>
                          <div className="whitespace-pre-line rounded-lg border border-border bg-background p-5 text-sm leading-relaxed text-foreground">
                            {compareResult}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {selectedDoc ? (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="border-b border-border px-5 py-4">
                        <p className="truncate text-sm font-semibold text-foreground">{selectedDoc.title}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">CID: {selectedDoc.cid}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
                        {!selectedDoc.is_onchain ? (
                          <button onClick={() => handleStoreOnChain(selectedDoc)}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors">
                            <Link2 className="h-3.5 w-3.5" /> {t('dashboard.save_proof_onchain')}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                            ✓ {t('dashboard.saved_onchain')}
                          </span>
                        )}
                        <button onClick={() => setShareDialogDoc(selectedDoc)}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-amber-500 hover:text-amber-400 transition-colors">
                          <Share2 className="h-3.5 w-3.5" /> {t('dashboard.share')}
                        </button>
                      </div>
                      {selectedDoc.ai_summary && (
                        <div className="px-5 py-4">
                          <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">AI Summary</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{selectedDoc.ai_summary}</p>
                        </div>
                      )}
                      {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
                          {selectedDoc.tags.map((t, i) => (
                            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-card">
                      <p className="px-6 text-center text-xs text-muted-foreground">{t('dashboard.select_doc_to_analyze_title')}<br />{t('dashboard.select_doc_to_analyze_subtitle')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
