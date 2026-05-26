import { useLanguage } from '@/contexts/LanguageContext'

export function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="bg-card border-t border-border py-8 mt-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-2xl font-bold text-amber-500">DocVault</span>
          <p className="text-sm text-muted-foreground">{t('home.copyright')}</p>
        </div>
        <div className="flex gap-8 text-sm font-bold">
          <a className="hover:text-amber-500 transition-colors text-muted-foreground" href="#">{t('home.terms')}</a>
          <a className="hover:text-amber-500 transition-colors text-muted-foreground" href="#">{t('home.privacy')}</a>
          <a className="hover:text-amber-500 transition-colors text-muted-foreground" href="#">{t('home.contact')}</a>
        </div>
      </div>
    </footer>
  )
}
