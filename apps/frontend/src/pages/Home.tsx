import { HeroSection } from '@/components/home/hero-section'
import { FeaturesSection } from '@/components/home/features-section'
import { HighlightSection } from '@/components/home/highlight-section'
import { StatsSection } from '@/components/home/stats-section'

interface HomeProps {
  walletAddress: string | null
  onConnect: () => void
  onDisconnect: () => void
  avatarUrl?: string | null
  displayName?: string | null
  ensName?: string | null
}

export default function Home({
  walletAddress,
  onConnect,
  onDisconnect,
  avatarUrl,
  displayName,
  ensName,
}: HomeProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      <main className="flex-1">
        {/* HERO */}
        <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
          <HeroSection />

          {!walletAddress && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={onConnect}
                className="rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-zinc-950 shadow-lg transition-all hover:scale-105 hover:bg-amber-400"
              >
                🚀 Bắt đầu ngay bằng ví Web3
              </button>
            </div>
          )}
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-7xl px-4 md:px-6 py-12">
          <FeaturesSection />
        </section>

        {/* HIGHLIGHT */}
        <section className="mx-auto max-w-7xl px-4 md:px-6 py-12">
          <HighlightSection />
        </section>

        {/* STATS */}
        <section className="mx-auto max-w-7xl px-4 md:px-6 py-12">
          <StatsSection />
        </section>
      </main>
    </div>
  )
}