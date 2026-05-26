import { useState, useRef } from 'react'
import { Upload, Check, Lock, Zap, X, FolderOpen } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface UploadBoxProps {
  onUpload: (files: File[]) => Promise<void>
  isUploading: boolean
}

export function UploadBox({ onUpload, isUploading }: UploadBoxProps) {
  const { t } = useLanguage()
  const [isDragActive, setIsDragActive]   = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStep, setUploadStep]       = useState<'select' | 'processing' | 'complete'>('select')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isFolderMode, setIsFolderMode]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragActive(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) setSelectedFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) setSelectedFiles(files)
    e.target.value = ''
  }

  const handleScanAndUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploadStep('processing')
    setUploadProgress(0)
    await onUpload(selectedFiles)
    setUploadProgress(100)
    setUploadStep('complete')
    setTimeout(() => {
      setSelectedFiles([])
      setUploadStep('select')
      setUploadProgress(0)
    }, 2000)
  }

  const triggerFileInput = () => {
    if (isFolderMode) {
      folderInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={`border-2 border-dashed rounded-xl p-8 transition-colors
      ${isDragActive
        ? 'border-amber-500 bg-amber-500/5'
        : 'border-border bg-card'
      }`}
    >
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        multiple
      />
      <input
        ref={folderInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
      />

      {/* STATE 1: idle */}
      {uploadStep === 'select' && selectedFiles.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-4 text-center"
        >
          <div className="rounded-xl bg-muted p-4">
            <Upload className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('upload.drop_here')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('upload.limits')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerFileInput}
              className="rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-foreground hover:border-amber-500 hover:text-amber-400 transition-colors"
            >
              {isFolderMode ? t('upload.choose_folder') : t('upload.choose_files')}
            </button>
            <button
              onClick={() => setIsFolderMode(!isFolderMode)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                isFolderMode
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-border bg-muted text-muted-foreground hover:border-zinc-500'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {t('upload.folder')}
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: files selected */}
      {selectedFiles.length > 0 && uploadStep === 'select' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              {t('upload.files_selected').replace('{count}', String(selectedFiles.length))}
            </p>
            <button
              onClick={() => { setSelectedFiles([]); setIsFolderMode(false) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                    {f.webkitRelativePath && <span className="ml-2 text-muted-foreground"> — {f.webkitRelativePath}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('upload.processing_steps')}
            </p>
            {[
              { icon: <span className="text-xs font-bold">1</span>, key: 'upload.step_upload',        active: true },
              { icon: <Zap className="h-3.5 w-3.5" />,             key: 'upload.step_ai_scan',       active: false },
              { icon: <Lock className="h-3.5 w-3.5" />,            key: 'upload.step_store_chain',    active: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs
                  ${step.active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {step.icon}
                </div>
                <span className="text-sm text-foreground">{t(step.key)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleScanAndUpload}
            disabled={isUploading}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {t('upload.scan_and_upload')}{selectedFiles.length > 1 ? ` ${t('upload.n_files').replace('{count}', String(selectedFiles.length))}` : ''}
          </button>
        </div>
      )}

      {/* STATE 3: processing */}
      {uploadStep === 'processing' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('upload.processing')}</p>
            <p className="text-xs text-muted-foreground">{t('upload.uploading_files').replace('{count}', String(selectedFiles.length))}</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{uploadProgress}%</p>
          </div>
        </div>
      )}

      {/* STATE 4: done */}
      {uploadStep === 'complete' && (
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-emerald-500/10 p-3">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('upload.complete_title')}</p>
            <p className="text-xs text-muted-foreground">{t('upload.complete_desc').replace('{count}', String(selectedFiles.length))}</p>
          </div>
        </div>
      )}
    </div>
  )
}
