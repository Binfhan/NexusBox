"use client";
import { Link } from "react-router-dom";
interface HeaderProps {
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({
  walletAddress,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <header className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-amber-500">DocVault</span>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        <Link
          to="/"
          className="text-base font-bold text-amber-500"
        >
          Home
        </Link>
        {walletAddress && (
          <Link
            to="/dashboard"
            className="text-sm text-zinc-300 hover:text-amber-400 transition-colors"
          >
            Dashboard
          </Link>
        )}
        <a
          className="text-base text-zinc-400 hover:bg-zinc-800 transition-colors px-2 py-1 rounded-lg"
          href="#"
        >
          My Documents
        </a>
        <a
          className="text-base text-zinc-400 hover:bg-zinc-800 transition-colors px-2 py-1 rounded-lg"
          href="#"
        >
          Shared
        </a>
      </nav>
      <div className="flex items-center gap-4">
        {walletAddress ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700 font-mono">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button
              onClick={onDisconnect}
              className="text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm transition-all"
          >
            Kết nối ví
          </button>
        )}
      </div>
    </header>
  );
}
