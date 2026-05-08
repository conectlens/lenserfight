import { Footer } from '@lenserfight/ui/layout'
import { Logo } from '@lenserfight/ui/components'
import { ArrowRight, BookOpen, ExternalLink, Github, Menu, X } from 'lucide-react'
import React, { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { CHAINABIT_APP_URL, DOCS_BASE_URL } from '@lenserfight/utils/env'

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/product', label: 'Product' },
  { to: '/demo', label: 'Demo' },
  { to: '/contact', label: 'Contact' },
]

const GITHUB_URL = 'https://github.com/conectlens/lenserfight'

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
          <Link to="/" className="flex shrink-0 items-center transition-opacity hover:opacity-80">
            <Logo size={28} showWordmark={true} showBeta={true} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isActive(to)
                  ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-0'
                  : 'text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0'
                  }`}
              >
                {label}
              </Link>
            ))}
            <a
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-greyscale-500 transition-colors hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              <BookOpen size={14} />
              Docs
              <ExternalLink size={11} />
            </a>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border text-greyscale-500 transition-colors hover:border-greyscale-400 hover:text-greyscale-900 dark:hover:text-greyscale-0"
            >
              <Github size={16} />
            </a>
            <a
              href={`${CHAINABIT_APP_URL}?utm_source=lenserfight_header`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chainabit"
              title="Sponsored by Chainabit"
              className="flex h-8 w-8 items-center justify-center rounded-full  transition-color "
            >
              <img src="/chainabit/favicon-32x32.png" width={20} height={20} alt="Chainabit" className="rounded" />
            </a>
            <div className="mx-1 h-4 w-px bg-surface-border" />
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
            <a
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 py-1 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              <BookOpen size={14} /> Docs <ExternalLink size={11} />
            </a>
            <div className="flex items-center gap-3 py-1">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-0"
              >
                <Github size={16} />
              </a>
              <a
                href={`${CHAINABIT_APP_URL}?utm_source=lenserfight_header`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chainabit"
                title="Sponsored by Chainabit"
                className="flex h-8 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-2.5 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400"
              >
                <img src="/chainabit/favicon-32x32.png" width={18} height={18} alt="" className="rounded shrink-0" />
                Chainabit
              </a>
            </div>
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
