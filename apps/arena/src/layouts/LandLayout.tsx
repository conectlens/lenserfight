import { Footer } from '@lenserfight/ui/layout'
import { Button, Logo } from '@lenserfight/ui/components'
import { ArrowRight, BookOpen, ExternalLink, Github, Heart, Menu, X } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { CHAINABIT_APP_URL, DOCS_BASE_URL } from '@lenserfight/utils/env'

import { chainabitContactUrl } from '../utils/chainabitUrls'

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/product', label: 'Product' },
  { to: '/faq', label: 'FAQ' },
  { to: '/demo', label: 'Demo' },
]

const GITHUB_URL = 'https://github.com/conectlens/lenserfight'
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/conectlens'

export const LandLayout: React.FC = () => {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { i18n } = useTranslation()
  const contactUrl = chainabitContactUrl({
    lang: i18n.language,
    utmMedium: 'arena_header',
    utmCampaign: 'arena_contact_link',
  })

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
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_header&utm_campaign=arena_docs_link`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-greyscale-500 transition-colors hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              <BookOpen size={14} />
              Docs
              <ExternalLink size={11} aria-label="External link" />
            </a>
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-greyscale-500 transition-colors hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              Contact
              <ExternalLink size={11} aria-label="External link" />
            </a>
          </nav>

          {/* CTAs */}
          <div className="hidden items-center gap-2 md:flex">
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
              href={`${GITHUB_SPONSORS_URL}?utm_source=lenserfight&utm_medium=arena_header&utm_campaign=sponsor_cta`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Sponsor LenserFight"
              title="Sponsor us on GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-500"
            >
              <Heart size={16} />
            </a>
            <a
              href={`${CHAINABIT_APP_URL}?utm_source=lenserfight&utm_medium=arena_header&utm_campaign=arena_chainabit_partner`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chainabit"
              title="Sponsored by Chainabit"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            >
              <img src="/chainabit/favicon-32x32.png" width={20} height={20} alt="Chainabit" className="rounded" />
            </a>
            <div className="mx-1 h-4 w-px bg-surface-border" />
            <Link to="/get-started">
              <Button variant="ghost" size="sm">Get Started</Button>
            </Link>
            <Link to="/battles">
              <Button variant="primary" size="sm">
                Try Arena <ArrowRight size={14} />
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
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
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_header_mobile&utm_campaign=arena_docs_link`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 py-1 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              <BookOpen size={14} /> Docs <ExternalLink size={11} aria-label="External link" />
            </a>
            <a
              href={chainabitContactUrl({
                lang: i18n.language,
                utmMedium: 'arena_header_mobile',
                utmCampaign: 'arena_contact_link',
              })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 py-1 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              Contact <ExternalLink size={11} aria-label="External link" />
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
                href={`${GITHUB_SPONSORS_URL}?utm_source=lenserfight&utm_medium=arena_header_mobile&utm_campaign=sponsor_cta`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 items-center gap-1.5 rounded-full border border-surface-border bg-surface-raised px-2.5 text-xs font-semibold text-primary-yellow-500 transition-colors hover:border-primary-yellow-500"
              >
                <Heart size={13} />
                Sponsor us
              </a>
              <a
                href={`${CHAINABIT_APP_URL}?utm_source=lenserfight&utm_medium=arena_header_mobile&utm_campaign=arena_chainabit_partner`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chainabit"
                title="Sponsored by Chainabit"
                className="flex h-8 items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-2.5 text-xs font-semibold text-greyscale-700 dark:text-greyscale-300"
              >
                <img src="/chainabit/favicon-32x32.png" width={18} height={18} alt="" className="rounded shrink-0" />
                Chainabit
                <ExternalLink size={11} aria-label="External link" />
              </a>
            </div>
            <div className="flex flex-col gap-2 border-t border-surface-border pt-3">
              <Link to="/get-started" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" size="md" fullWidth>Get Started</Button>
              </Link>
              <Link to="/battles" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="md" fullWidth>
                  Try Arena <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer lang={i18n.language} utmMedium="arena_footer" />
    </div>
  )
}
