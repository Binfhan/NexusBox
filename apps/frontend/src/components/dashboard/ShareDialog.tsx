import { useState, useEffect } from 'react'
import { shareDocument, getSharesByDocument, revokeShare } from '../../lib/api'
import { X, Share2, Trash2, UserCheck, Hash, Clock, Lock, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ShareDialogProps {
  token: string
  docId: string
  docTitle: string
  resourceLabel?: string
  onClose: () => void
}

export function ShareDialog({ token, docId, docTitle, resourceLabel, onClose }: ShareDialogProps) {
  const { t } = useLanguage()
  const [walletInput, setWalletInput] = useState('')
  const [userIdInput, setUserIdInput] = useState('')
  const [useUserId, setUseUserId] = useState(false)
  const [permission, setPermission] = useState('viewer')
  const [expiresAt, setExpiresAt] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [shares, setShares] = useState<any[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadShares = async () => {
    try {
      const data = await getSharesByDocument(token, docId)
      setShares(data)
    } catch { console.error('Failed to load shares') }
  }

  useEffect(() => { loadShares() }, [])

  const handleShare = async () => {
    setIsSharing(true)
    setMessage(null)
    try {
      let targetWallet: string | undefined
      let targetUserId: number | undefined

      if (useUserId) {
        if (!userIdInput.trim() || userIdInput.length !== 6) {
          setMessage({ type: 'error', text: t('share.error_user_id') })
          setIsSharing(false)
          return
        }
        targetUserId = Number(userIdInput.trim())
      } else {
        if (!walletInput.trim()) {
          setMessage({ type: 'error', text: t('share.error_wallet') })
          setIsSharing(false)
          return
        }
        targetWallet = walletInput.trim()
      }

      await shareDocument(token, docId, targetWallet!, permission, expiresAt || undefined, usePassword ? password : undefined)
      setMessage({ type: 'success', text: t('share.success') })
      setWalletInput('')
      setUserIdInput('')
      setExpiresAt('')
      setUsePassword(false)
      setPassword('')
      loadShares()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('share.error') })
    } finally {
      setIsSharing(false)
    }
  }

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeShare(token, shareId)
      loadShares()
    } catch { console.error('Failed to revoke share') }
  }

  const formatPermission = (perm: string) => t(`share.permission_${perm}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">{t('share.title')}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 truncate text-sm text-muted-foreground">
          {resourceLabel ? <span className="text-amber-400">{resourceLabel}</span> : docTitle}
        </p>

        <div className="mb-4 flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setUseUserId(false)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${!useUserId ? 'bg-amber-500 text-zinc-950' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {t('share.wallet_address')}
          </button>
          <button onClick={() => setUseUserId(true)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${useUserId ? 'bg-amber-500 text-zinc-950' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <div className="flex items-center justify-center gap-1"><Hash className="h-3 w-3" />{t('share.user_id')}</div>
          </button>
        </div>

        {useUserId ? (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('share.user_id_label')}</label>
            <input type="text" value={userIdInput} onChange={e => setUserIdInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456" maxLength={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 transition-colors font-mono text-center text-lg tracking-widest" />
          </div>
        ) : (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('share.receiver_wallet')}</label>
            <input type="text" value={walletInput} onChange={e => setWalletInput(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 transition-colors font-mono" />
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('share.permission')}</label>
          <select value={permission} onChange={e => setPermission(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500 transition-colors">
            {['viewer', 'commenter', 'editor', 'owner'].map(key => (
              <option key={key} value={key}>{t(`share.permission_${key}`)}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> {t('share.expires')}
          </label>
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-amber-500 transition-colors [color-scheme:dark]" />
        </div>

        <div className="mb-4">
          <button onClick={() => setUsePassword(!usePassword)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${usePassword ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-border text-muted-foreground hover:border-zinc-600'}`}>
            <Lock className="h-3.5 w-3.5" />
            {usePassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {usePassword ? t('share.password_protect') : t('share.add_password')}
          </button>
          {usePassword && (
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('share.enter_password')}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 transition-colors" />
          )}
        </div>

        <button onClick={handleShare} disabled={isSharing || (useUserId ? !userIdInput : !walletInput.trim()) || (usePassword && !password)}
          className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <UserCheck className="h-4 w-4" />
          {isSharing ? t('share.sharing') : t('share.share_button')}
        </button>

        {message && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {shares.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('share.shared_with').replace('{count}', String(shares.length))}</p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {shares.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{s.shared_with_wallet}</p>
                    <p className="text-[10px] text-muted-foreground">{formatPermission(s.permission)}</p>
                    {s.expires_at && <p className="text-[9px] text-muted-foreground">{t('share.expires_date')} {new Date(s.expires_at).toLocaleDateString('vi-VN')}</p>}
                    {s.password && <p className="text-[9px] text-muted-foreground">{t('share.has_password')}</p>}
                  </div>
                  <button onClick={() => handleRevoke(s.id)}
                    className="ml-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
