import { Footer } from '@lenserfight/ui/layout'
import { Button, Logo } from '@lenserfight/ui/components'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ExternalLink,
  // eslint-disable-next-line deprecation/deprecation
  Github,
  Heart,
  Lightbulb,
  Menu,
  Smartphone,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { CHAINABIT_APP_URL, DOCS_BASE_URL } from '@lenserfight/utils/env'
import { globalAnalyticsController } from '@lenserfight/infra/analytics'

function trackNav(label: string, location = 'arena_header') {
  globalAnalyticsController.trackEvent({ name: 'nav_click', properties: { label, location } })
}
function trackCta(label: string, location = 'arena_header') {
  globalAnalyticsController.trackEvent({ name: 'cta_click', properties: { label, location } })
}
function trackExternal(label: string, href: string, location = 'arena_header') {
  globalAnalyticsController.trackEvent({ name: 'external_link_click', properties: { label, href, location } })
}

import { chainabitContactUrl } from '../utils/chainabitUrls'

const NAV_LINKS = [
  { to: '/about', label: 'About', description: 'Our mission & journey' },
  { to: '/note-from-omer', label: 'Note', description: 'A word from the founder' },
  { to: '/faq', label: 'FAQ', description: 'Questions & answers' },
]

const PRODUCT_ITEMS = [
  {
    to: '/product/cli',
    label: 'CLI',
    icon: Terminal,
    description: 'Run battles from your terminal',
  },
  {
    to: '/product',
    label: 'App',
    icon: Zap,
    description: 'The web arena — battles & lenses',
  },
  {
    to: '/demo',
    label: 'Demo',
    icon: Sparkles,
    description: 'See it in action',
  },
  {
    to: '/product/mobile',
    label: 'Mobile',
    icon: Smartphone,
    description: 'iOS & Android app',
    badge: 'Soon' as const,
  },
]

const GITHUB_URL = 'https://github.com/conectlens/lenserfight'
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/conectlens'

export const LandLayout: React.FC = () => {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [mobileProductOpen, setMobileProductOpen] = useState(false)
  const [mobileStoryOpen, setMobileStoryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const storyDropdownRef = useRef<HTMLDivElement>(null)
  const { i18n } = useTranslation()
  const contactUrl = chainabitContactUrl({
    lang: i18n.language,
    utmMedium: 'arena_header',
    utmCampaign: 'arena_contact_link',
  })

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')
  const isProductActive = PRODUCT_ITEMS.some(({ to }) => isActive(to))
  const isStoryActive = NAV_LINKS.some(({ to }) => isActive(to))

  return (
    <div className="min-h-screen flex flex-col bg-surface-base text-surface-text">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-border/80 bg-surface-base/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center transition-opacity hover:opacity-80">
            <Logo size={28} showWordmark={true} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {/* Product dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isProductActive
                  ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-0'
                  : 'text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0'
                  }`}
                aria-haspopup="true"
                aria-expanded={productOpen}
              >
                Product
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-150 ${productOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {productOpen && (
                <div className="absolute left-0 top-full pt-1.5">
                  <div className="w-64 rounded-2xl border border-surface-border bg-surface-base shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                    {PRODUCT_ITEMS.map(({ to, label, icon: Icon, description, badge }) => (
                      <Link
                        key={to}
                        to={to}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-raised ${isActive(to) ? 'bg-surface-raised' : ''
                          }`}
                        onClick={() => setProductOpen(false)}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                              {label}
                            </span>
                            {badge && (
                              <span className="rounded-full bg-primary-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-yellow-700 dark:text-primary-yellow-400">
                                {badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-greyscale-500 dark:text-greyscale-400">
                            {description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Story dropdown */}
            <div
              ref={storyDropdownRef}
              className="relative"
              onMouseEnter={() => setStoryOpen(true)}
              onMouseLeave={() => setStoryOpen(false)}
            >
              <button
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isStoryActive
                  ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-0'
                  : 'text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0'
                  }`}
                aria-haspopup="true"
                aria-expanded={storyOpen}
              >
                About Us
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-150 ${storyOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {storyOpen && (
                <div className="absolute left-0 top-full pt-1.5">
                  <div className="w-64 rounded-2xl border border-surface-border bg-surface-base shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                    {NAV_LINKS.map(({ to, label, description }) => (
                      <Link
                        key={to}
                        to={to}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-raised ${isActive(to) ? 'bg-surface-raised' : ''
                          }`}
                        onClick={() => setStoryOpen(false)}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                            {label}
                          </span>
                          <p className="mt-0.5 truncate text-xs text-greyscale-500 dark:text-greyscale-400">
                            {description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <a
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_header&utm_campaign=arena_docs_link`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternal('Docs', DOCS_BASE_URL)}
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
              onClick={() => trackExternal('Contact', contactUrl)}
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
              onClick={() => trackExternal('GitHub', GITHUB_URL)}
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
              onClick={() => trackCta('Sponsor', 'arena_header')}
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
              onClick={() => trackExternal('Chainabit', CHAINABIT_APP_URL)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            >
              <img src="/chainabit/favicon-32x32.png" width={20} height={20} alt="Chainabit" className="rounded" />
            </a>
            <div className="mx-1 h-4 w-px bg-surface-border" />
            <Link to="/get-started" onClick={() => trackCta('Get Started', 'arena_header')}>
              <Button variant="ghost" size="sm">Get Started</Button>
            </Link>
            <Link to="/battles" onClick={() => trackCta('Try Arena', 'arena_header')}>
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
          <div className="space-y-1 border-t border-surface-border bg-surface-base px-4 py-4 md:hidden">
            {/* Product accordion */}
            <div>
              <button
                onClick={() => setMobileProductOpen((prev) => !prev)}
                className="flex w-full items-center justify-between py-2 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
              >
                Product
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${mobileProductOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileProductOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-surface-border pl-3">
                  {PRODUCT_ITEMS.map(({ to, label, icon: Icon, badge }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => { setMobileOpen(false); setMobileProductOpen(false) }}
                      className="flex items-center gap-2 py-1.5 text-sm text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
                    >
                      <Icon size={14} className="shrink-0" />
                      {label}
                      {badge && (
                        <span className="rounded-full bg-primary-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-yellow-700 dark:text-primary-yellow-400">
                          {badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* About Us accordion */}
            <div>
              <button
                onClick={() => setMobileStoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between py-2 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
              >
                About Us
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${mobileStoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileStoryOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-surface-border pl-3">
                  {NAV_LINKS.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => { setMobileOpen(false); setMobileStoryOpen(false); trackNav(label, 'arena_header_mobile') }}
                      className="flex items-center py-1.5 text-sm text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <a
              href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_header_mobile&utm_campaign=arena_docs_link`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setMobileOpen(false); trackExternal('Docs', DOCS_BASE_URL, 'arena_header_mobile') }}
              className="flex items-center gap-1.5 py-2 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
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
              onClick={() => { setMobileOpen(false); trackExternal('Contact', contactUrl, 'arena_header_mobile') }}
              className="flex items-center gap-1.5 py-2 text-sm font-medium text-greyscale-600 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0"
            >
              Contact <ExternalLink size={11} aria-label="External link" />
            </a>
            <div className="flex items-center gap-3 py-1">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                onClick={() => trackExternal('GitHub', GITHUB_URL, 'arena_header_mobile')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-0"
              >
                <Github size={16} />
              </a>
              <a
                href={`${GITHUB_SPONSORS_URL}?utm_source=lenserfight&utm_medium=arena_header_mobile&utm_campaign=sponsor_cta`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setMobileOpen(false); trackCta('Sponsor', 'arena_header_mobile') }}
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
                onClick={() => trackExternal('Chainabit', CHAINABIT_APP_URL, 'arena_header_mobile')}
                className="flex h-8 items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-2.5 text-xs font-semibold text-greyscale-700 dark:text-greyscale-300"
              >
                <img src="/chainabit/favicon-32x32.png" width={18} height={18} alt="" className="rounded shrink-0" />
                Chainabit
                <ExternalLink size={11} aria-label="External link" />
              </a>
            </div>
            <div className="flex flex-col gap-2 border-t border-surface-border pt-3">
              <Link to="/get-started" onClick={() => { setMobileOpen(false); trackCta('Get Started', 'arena_header_mobile') }}>
                <Button variant="secondary" size="md" fullWidth>Get Started</Button>
              </Link>
              <Link to="/battles" onClick={() => { setMobileOpen(false); trackCta('Try Arena', 'arena_header_mobile') }}>
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
