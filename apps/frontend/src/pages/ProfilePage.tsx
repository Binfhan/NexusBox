import { useState, useRef } from 'react'
import {
  User, Shield, Activity, HardDrive,
  Settings, Copy, ExternalLink, Camera,
  Globe, Link2,
  CheckCircle2, Wallet, Coins, LogOut, Save
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

interface UserProfile {
  walletAddress: string
  userId: number
  displayName: string
  bio: string
  avatarUrl: string | null
  ensName: string | null
  lensHandle: string | null
  twitterUrl: string
  githubUrl: string
  websiteUrl: string
  isProfilePublic: boolean
  plan: {
    name: string
    maxBytes: number
    maxDocs: number
  }
  storageLimit: number
  storageUsed: number
  joinedAt: string
}

interface ProfilePageProps {
  profile: UserProfile
  onBack: () => void
  onUpdateProfile: (data: any) => void
  onUploadAvatar: (file: File) => void
  onDisconnect: () => void
}

function WalletAvatar({ avatarUrl, walletAddress, size = 'lg' }: {
  avatarUrl: string | null
  walletAddress: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-24 h-24' }[size]

  if (avatarUrl && !imgError) {
    return (
      <img
        key={avatarUrl}
        src={avatarUrl}
        alt="avatar"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-2xl object-cover ring-4 ring-zinc-950`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-2xl bg-gradient-to-br
                     from-amber-400 to-orange-600 flex items-center
                     justify-center text-zinc-950 font-bold ring-4 ring-zinc-950`}
         style={{ fontSize: size === 'lg' ? '2rem' : size === 'md' ? '0.875rem' : '0.75rem' }}>
      {walletAddress.slice(2, 4).toUpperCase()}
    </div>
  )
}

export function ProfilePage({
  profile, onBack, onUpdateProfile, onUploadAvatar, onDisconnect
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { t } = useLanguage()
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editForm, setEditForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    twitterUrl: profile.twitterUrl,
    githubUrl: profile.githubUrl,
    websiteUrl: profile.websiteUrl,
    isProfilePublic: profile.isProfilePublic,
  })

  const TABS = [
    { id: 'overview',  label: t('profile.overview'),   icon: <User className="h-4 w-4" /> },
    { id: 'web3',      label: t('profile.web3'),        icon: <Wallet className="h-4 w-4" /> },
    { id: 'activity',  label: t('profile.activity'),    icon: <Activity className="h-4 w-4" /> },
    { id: 'storage',   label: t('profile.storage'),     icon: <HardDrive className="h-4 w-4" /> },
    { id: 'security',  label: t('profile.security'),    icon: <Shield className="h-4 w-4" /> },
    { id: 'edit',      label: t('profile.edit_tab'),    icon: <Settings className="h-4 w-4" /> },
  ]

  const copyAddress = () => {
    navigator.clipboard.writeText(profile.walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddr = `${profile.walletAddress.slice(0, 8)}...${profile.walletAddress.slice(-6)}`
  const usagePercent = Math.min(100, Math.round((profile.storageUsed / profile.storageLimit) * 100))

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await onUpdateProfile(editForm)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    totalDocs: 0,
    verifiedDocs: 0,
    onChainDocs: 0,
    sharedDocs: 0,
    signingsSigned: 0,
    nftsOwned: 0,
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">

      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-card via-amber-950/20 to-card
                        border-b border-border relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 50%, #f59e0b 0%, transparent 50%),
                                radial-gradient(circle at 75% 50%, #f59e0b 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 pb-4 gap-4">
            <div className="relative self-start">
              <div className="relative">
                {avatarUploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center
                                  bg-background/60 rounded-2xl ring-4 ring-zinc-950">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                )}
                <WalletAvatar
                  avatarUrl={profile.avatarUrl}
                  walletAddress={profile.walletAddress}
                  size="lg"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500
                           rounded-full flex items-center justify-center
                           hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-lg cursor-pointer"
                title={t('profile.upload_avatar')}
              >
                <Camera className="h-3.5 w-3.5 text-zinc-950" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setAvatarUploading(true)
                  try {
                    await onUploadAvatar(file)
                  } finally {
                    setAvatarUploading(false)
                    e.target.value = ''
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={onBack}
                className="rounded-lg border border-border bg-zinc-800
                           px-4 py-2 text-sm text-foreground
                           hover:border-zinc-600 transition-colors cursor-pointer"
              >
                {t('profile.back')}
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm
                           font-semibold text-zinc-950 hover:bg-amber-400
                           transition-colors cursor-pointer"
              >
                {t('profile.edit')}
              </button>
            </div>
          </div>

          <div className="pb-6 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {profile.displayName || t('profile.anonymous')}
              </h1>
              {profile.ensName && (
                <span className="flex items-center gap-1 rounded-full bg-blue-500/10
                                 border border-blue-500/20 px-2.5 py-0.5
                                 text-xs font-medium text-blue-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {profile.ensName}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase
                ${profile.plan.name === 'free'
                  ? 'bg-zinc-700 text-foreground'
                  : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                }`}>
                {profile.plan.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{shortAddr}</span>
              <button onClick={copyAddress} type="button"
                className="text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer">
                {copied
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  : <Copy className="h-3.5 w-3.5" />
                }
              </button>
              <a href={`https://etherscan.io/address/${profile.walletAddress}`}
                target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-amber-400 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('profile.user_id')}: <span className="text-muted-foreground font-mono">#{profile.userId}</span>
            </p>

            {profile.bio && (
              <p className="text-sm text-muted-foreground max-w-xl">{profile.bio}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              {profile.twitterUrl && (
                <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-sky-400 transition-colors">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-amber-400 transition-colors">
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
            {[
              { label: t('profile.documents'), value: stats.totalDocs },
              { label: t('profile.verified'),  value: stats.verifiedDocs },
              { label: t('profile.on_chain'),  value: stats.onChainDocs },
              { label: t('profile.shared'),    value: stats.sharedDocs },
              { label: t('profile.signed'),    value: stats.signingsSigned },
              { label: t('profile.nfts_count'), value: stats.nftsOwned },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

        <div className="flex items-center gap-1 border-b border-border mb-8 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                          whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer
                          ${activeTab === tab.id
                            ? 'border-amber-500 text-amber-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-amber-500" />
                {t('profile.storage_detail')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {(profile.storageUsed / 1024 / 1024).toFixed(0)} {t('profile.storage_used')}
                  </span>
                  <span className="text-muted-foreground">
                    {t('profile.storage_of')} {(profile.storageLimit / 1024 / 1024).toFixed(0)} MB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${usagePercent > 80
                        ? 'bg-red-500'
                        : usagePercent > 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{usagePercent}{t('profile.usage_percent')}</span>
                  <span className="text-xs font-semibold uppercase
                                   text-amber-400 bg-amber-500/10
                                   px-2 py-0.5 rounded-full">
                    {profile.plan.name}
                  </span>
                </div>
                {profile.plan.name === 'free' && (
                  <button type="button"
                    className="w-full mt-2 rounded-lg bg-amber-500 py-2 text-sm
                               font-semibold text-zinc-950 hover:bg-amber-400
                               transition-colors cursor-pointer">
                    {t('profile.upgrade_pro')}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                {t('profile.account_info')}
              </h3>
              <div className="space-y-3">
                {[
                  { label: t('profile.user_id'),         value: `#${profile.userId}` },
                  { label: t('profile.joined'),           value: new Date(profile.joinedAt).toLocaleDateString('vi-VN') },
                  { label: t('profile.auth_method'),      value: t('profile.wallet_auth') },
                  { label: t('profile.public_profile'),   value: profile.isProfilePublic ? t('profile.yes') : t('profile.no') },
                ].map(item => (
                  <div key={item.label}
                    className="flex justify-between text-sm border-b
                               border-border pb-2 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'web3' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-400" />
                {t('profile.ens_name')}
              </h3>
              {profile.ensName ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-lg font-semibold text-foreground">
                    {profile.ensName}
                  </span>
                  <a href={`https://app.ens.domains/${profile.ensName}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-blue-400 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('profile.no_ens')}
                  </p>
                  <a href="https://app.ens.domains" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-blue-500/30
                               bg-blue-500/10 px-3 py-1.5 text-xs font-medium
                               text-blue-400 hover:bg-blue-500/20 transition-colors
                               whitespace-nowrap ml-4">
                    {t('profile.register_ens')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                {t('profile.nfts')}
                <span className="ml-auto bg-amber-500/10 border border-amber-500/20
                                 rounded-full px-2 py-0.5 text-xs text-amber-400">
                  {stats.nftsOwned} {t('profile.nfts_count')}
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.no_nfts')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                {t('profile.onchain_stats')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: t('profile.docs_onchain'),    value: stats.onChainDocs,      color: 'text-emerald-400' },
                  { label: t('profile.signings'),         value: stats.signingsSigned,  color: 'text-blue-400' },
                  { label: t('profile.nfts_minted'),       value: stats.nftsOwned,       color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label}
                    className="bg-background border border-border rounded-lg p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {t('profile.activity_history')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('profile.loading_activity')}
            </p>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-amber-500" />
                {t('profile.storage_detail')}
              </h3>
              <div className="space-y-4">
                <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {(profile.storageUsed / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <p className="text-xs text-muted-foreground">{t('profile.used')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {((profile.storageLimit - profile.storageUsed) / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <p className="text-xs text-muted-foreground">{t('profile.remaining')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {(profile.storageLimit / 1024 / 1024).toFixed(0)} MB
                    </p>
                    <p className="text-xs text-muted-foreground">{t('profile.total_limit')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'free',       storage: '200 MB', docs: '50',       priceKey: 'profile.price_free',       current: profile.plan.name === 'free' },
                { key: 'pro',        storage: '5 GB',   docs: '500',      priceKey: 'profile.price_pro',        current: profile.plan.name === 'pro' },
                { key: 'business',   storage: '20 GB',  docs: '2,000',    priceKey: 'profile.price_business',   current: profile.plan.name === 'business' },
                { key: 'enterprise', storage: '100 GB', docs: 'Unlimited', priceKey: 'profile.price_enterprise', current: profile.plan.name === 'enterprise' },
              ].map(plan => (
                <div key={plan.key}
                  className={`rounded-xl border p-4 text-center
                    ${plan.current
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-border bg-card'
                    }`}
                >
                  {plan.current && (
                    <span className="inline-block mb-2 text-[10px] font-semibold
                                     uppercase text-amber-400 bg-amber-500/10
                                     rounded-full px-2 py-0.5">
                      {t('profile.current')}
                    </span>
                  )}
                  <p className="text-base font-bold text-foreground">{t('profile.plan_' + plan.key)}</p>
                  <p className="text-2xl font-bold text-amber-400 my-2">{plan.storage}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.docs === 'Unlimited' ? t('profile.unlimited') : plan.docs} {t('profile.documents')}
                  </p>
                  <p className="text-sm font-semibold text-foreground mb-3">{t(plan.priceKey)}</p>
                  {!plan.current && (
                    <button type="button"
                      className="w-full rounded-lg bg-amber-500 py-1.5 text-xs
                                 font-semibold text-zinc-950 hover:bg-amber-400
                                 transition-colors cursor-pointer">
                      {t('profile.upgrade')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            {[
              {
                titleKey: 'profile.wallet_auth',
                descKey: 'profile.wallet_auth_desc',
                status: true,
                statusLabelKey: 'profile.enabled',
              },
              {
                titleKey: 'profile.nonce_rotation',
                descKey: 'profile.nonce_rotation_desc',
                status: true,
                statusLabelKey: 'profile.active',
              },
              {
                titleKey: 'profile.jwt_expiry',
                descKey: 'profile.jwt_expiry_desc',
                status: true,
                daysValue: 7,
              },
              {
                titleKey: 'profile.e2e_encryption',
                descKey: 'profile.e2e_encryption_desc',
                status: false,
                statusLabelKey: 'profile.coming_soon',
              },
            ].map(item => (
              <div key={item.titleKey}
                className="flex items-start justify-between gap-4
                           bg-card border border-border rounded-xl p-5">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t(item.titleKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(item.descKey)}</p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2.5 py-1
                                  text-xs font-medium
                  ${item.status
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-muted-foreground border border-border'
                  }`}>
                  {item.daysValue != null
                    ? `${item.daysValue} ${t('profile.days')}`
                    : t(item.statusLabelKey!)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="max-w-lg space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('profile.edit_info')}
                </h3>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('profile.saved')}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t('profile.display_name')}
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => { setEditForm(f => ({ ...f, displayName: e.target.value })); setSaved(false) }}
                  placeholder={t('profile.placeholder_display_name')}
                  className="w-full rounded-lg border border-border bg-background
                             px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none
                             focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t('profile.bio')}
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={e => { setEditForm(f => ({ ...f, bio: e.target.value })); setSaved(false) }}
                  placeholder={t('profile.placeholder_bio')}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background
                             px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none
                             focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t('profile.twitter')}
                </label>
                <input
                  type="url"
                  value={editForm.twitterUrl}
                  onChange={e => { setEditForm(f => ({ ...f, twitterUrl: e.target.value })); setSaved(false) }}
                  placeholder={t('profile.placeholder_twitter')}
                  className="w-full rounded-lg border border-border bg-background
                             px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none
                             focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t('profile.github')}
                </label>
                <input
                  type="url"
                  value={editForm.githubUrl}
                  onChange={e => { setEditForm(f => ({ ...f, githubUrl: e.target.value })); setSaved(false) }}
                  placeholder={t('profile.placeholder_github')}
                  className="w-full rounded-lg border border-border bg-background
                             px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none
                             focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t('profile.website')}
                </label>
                <input
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={e => { setEditForm(f => ({ ...f, websiteUrl: e.target.value })); setSaved(false) }}
                  placeholder={t('profile.placeholder_website')}
                  className="w-full rounded-lg border border-border bg-background
                             px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none
                             focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-sm text-muted-foreground">{t('profile.public_toggle')}</label>
                <button
                  type="button"
                  onClick={() => { setEditForm(f => ({ ...f, isProfilePublic: !f.isProfilePublic })); setSaved(false) }}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer
                    ${editForm.isProfilePublic ? 'bg-amber-500' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full
                                    shadow transition-transform
                                    ${editForm.isProfilePublic ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm
                           font-semibold text-zinc-950 hover:bg-amber-400
                           disabled:opacity-50 transition-colors cursor-pointer
                           flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    {t('profile.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('profile.save_changes')}
                  </>
                )}
              </button>

              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => { onDisconnect(); onBack() }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg
                             border border-border py-2.5 px-4 text-sm
                             text-muted-foreground hover:bg-red-500/10 hover:text-red-400
                             transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {t('profile.logout')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
