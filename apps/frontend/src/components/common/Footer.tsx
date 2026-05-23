'use client'

export function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-800 py-8 mt-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-2xl font-bold text-amber-500">DocVault</span>
          <p className="text-sm opacity-60">© 2024 DocVault Ecosystem. Secure Optimism.</p>
        </div>
        <div className="flex gap-8 text-sm font-bold">
          <a className="hover:text-amber-500 transition-colors" href="#">Điều khoản</a>
          <a className="hover:text-amber-500 transition-colors" href="#">Chính sách bảo mật</a>
          <a className="hover:text-amber-500 transition-colors" href="#">Liên hệ</a>
        </div>
      </div>
    </footer>
  )
}
