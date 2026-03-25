import React, { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Footer } from '@lenserfight/ui/layout'

const NAV_LINKS = [
  { to: '/what-is-lenserfight', label: 'What is LenserFight?' },
  { to: '/product', label: 'Product' },
  { to: '/mission', label: 'Mission' },
  { to: '/demo', label: 'Demo' },
]

export const LandLayout: React.FC = () => {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-black text-lg tracking-tight text-gray-900 dark:text-white hover:opacity-80 transition-opacity shrink-0"
          >
            LenserFight
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`transition-colors ${
                  isActive(to)
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/get-started"
              className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/battles"
              className="px-4 py-2 text-sm font-bold rounded-full bg-[#ffe170] text-gray-900 hover:bg-[#ffd940] transition-colors shadow-sm"
            >
              Try Arena
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-3">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <Link
                to="/get-started"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-gray-600 dark:text-gray-300"
              >
                Get Started
              </Link>
              <Link
                to="/battles"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-2 text-sm font-bold rounded-full bg-[#ffe170] text-gray-900 text-center"
              >
                Try Arena
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
