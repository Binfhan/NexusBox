import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, LogOut, Moon, Sun, Languages } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface HeaderProps {
  walletAddress: string | null
  avatarUrl: string | null
  displayName: string | null
  ensName: string | null
  onConnect: () => void
  onDisconnect: () => void
  onNavigate: (page: 'profile' | 'settings') => void
}

function WalletAvatar({ avatarUrl, walletAddress, size = 'sm' }: {
  avatarUrl: string | null
  walletAddress: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-20 h-20' }[size]

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

export function Header({
  walletAddress, avatarUrl, displayName, ensName,
  onConnect, onDisconnect, onNavigate
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : ''

  return (
    <header className="bg-background/90 backdrop-blur-md border-b border-border
                       flex justify-between items-center w-full px-6 h-16
                       sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-2xl font-bold text-amber-500">DocVault</Link>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <Link
          to="/dashboard"
          className="text-base font-bold text-amber-500"
        >
          {t('nav.dashboard')}
        </Link>
        <a className="text-base text-muted-foreground hover:text-foreground
                      transition-colors px-2 py-1 rounded-lg" href="#">
          {t('nav.my_documents')}
        </a>
        <a className="text-base text-muted-foreground hover:text-foreground
                      transition-colors px-2 py-1 rounded-lg" href="#">
          {t('nav.shared')}
        </a>
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1.5 rounded-lg border border-border
                     bg-card hover:bg-accent px-2.5 py-1.5 text-xs font-semibold
                     text-foreground transition-colors"
          title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{lang === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-lg border border-border
                     bg-card hover:bg-accent w-8 h-8 text-foreground transition-colors"
          title={theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {walletAddress ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 bg-card hover:bg-accent
                         border border-border rounded-xl px-3 py-1.5
                         transition-colors"
            >
              <span className="text-xs text-foreground font-mono hidden sm:block">
                {ensName || displayName || shortAddress}
              </span>
              <WalletAvatar
                avatarUrl={avatarUrl}
                walletAddress={walletAddress}
                size="sm"
              />
              <svg className={`w-3 h-3 text-muted-foreground transition-transform
                               ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card
                              border border-border rounded-xl shadow-xl
                              overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">
                    {displayName || ensName || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {shortAddress}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { onNavigate('profile'); setMenuOpen(false) }}
                    className="flex items-center gap-3 w-full px-4 py-2.5
                               text-sm text-foreground hover:bg-accent
                               hover:text-amber-400 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    {t('nav.profile')}
                  </button>
                  <button
                    onClick={() => { onNavigate('settings'); setMenuOpen(false) }}
                    className="flex items-center gap-3 w-full px-4 py-2.5
                               text-sm text-foreground hover:bg-accent
                               transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    {t('nav.settings')}
                  </button>
                </div>

                <div className="border-t border-border py-1">
                  <button
                    onClick={() => { onDisconnect(); setMenuOpen(false) }}
                    className="flex items-center gap-3 w-full px-4 py-2.5
                               text-sm text-muted-foreground hover:bg-red-500/10
                               hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold
                       px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {t('nav.connect')}
          </button>
        )}
      </div>
    </header>
  )
}
