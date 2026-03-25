import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Sword } from 'lucide-react'
import { Footer } from '@lenserfight/ui/layout'

const BATTLE_NAV = [
  { to: '/battles', label: 'All Battles' },
  { to: '/battles/create', label: 'New Battle' },
]

export const ArenaLayout: React.FC = () => {
  const location = useLocation()

  const isActive = (to: string) => location.pathname === to

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Arena header */}
      <header className="sticky top-0 z-50 w-full bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              Home
            </Link>
            <span className="text-gray-700">|</span>
            <Link
              to="/battles"
              className="flex items-center gap-1.5 font-bold text-sm text-white hover:opacity-80 transition-opacity"
            >
              <Sword size={14} className="text-[#ffe170]" />
              Arena
            </Link>
          </div>

          <nav className="flex items-center gap-4 text-sm font-medium">
            {BATTLE_NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`transition-colors ${
                  isActive(to)
                    ? 'text-[#ffe170]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
