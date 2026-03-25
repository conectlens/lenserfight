import { Footer } from '@lenserfight/ui/layout'
import { Menu, X, ArrowRight } from 'lucide-react'
import React, { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/product', label: 'Product' },
  { to: '/demo', label: 'Demo' },
  { to: '/contact', label: 'Contact' },
]

export const LandLayout: React.FC = () => {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className="min-h-screen flex flex-col bg-surface-base text-surface-text">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-border/80 bg-surface-base/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-lg font-black tracking-tight text-greyscale-900 transition-opacity hover:opacity-80 dark:text-greyscale-0"
          >
            LenserFight
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-0'
                    : 'text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0'
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
              className="text-sm font-semibold text-greyscale-600 transition-colors hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              Get Started
            </Link>
            <Link
              to="/battles"
              className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-4 py-2 text-sm font-bold text-greyscale-900 shadow-sm transition-colors hover:bg-primary-yellow-400"
            >
              Try Arena <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="rounded-lg p-2 text-greyscale-500 transition-colors hover:bg-surface-raised md:hidden"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="space-y-3 border-t border-surface-border bg-surface-base px-4 py-4 md:hidden">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block py-1 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
              >
                {label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 border-t border-surface-border pt-3">
              <Link
                to="/get-started"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-greyscale-600"
              >
                Get Started
              </Link>
              <Link
                to="/battles"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-yellow-500 px-4 py-2 text-sm font-bold text-greyscale-900"
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
