'use client'

import { InteractiveCube } from './interactive-cube'

export function HeroSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col justify-center space-y-6 transition-colors duration-300 hover:border-amber-500/30">
        <div className="space-y-4">
          <span className="inline-block px-2 py-1 bg-amber-500/10 text-amber-500 text-sm font-bold rounded-full uppercase tracking-wider">
            Blockchain Secured
          </span>
          <h1 className="text-5xl font-bold leading-tight text-white">
            Lưu trữ tài liệu phi tập trung an toàn
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl">
            Bảo vệ quyền sở hữu dữ liệu của bạn với công nghệ Web3.
            Mã hóa đầu cuối, xác thực AI và lưu trữ vĩnh viễn trên IPFS.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-colors active:scale-95 will-change-transform flex items-center gap-2">
            Bắt đầu ngay
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
          </button>
          <button className="border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold px-8 py-3 rounded-xl transition-colors">
            Tìm hiểu thêm
          </button>
        </div>
      </div>

      <div className="lg:col-span-5 bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col items-center justify-center min-h-96 relative [contain:strict]">
        <InteractiveCube />
      </div>
    </section>
  )
}