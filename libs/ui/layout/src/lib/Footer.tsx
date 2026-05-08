import { ExternalLink, Github, Heart, Monitor, Moon, Sun } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@lenserfight/ui/theme'
import type { Theme } from '@lenserfight/ui/theme'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'

interface FooterProps {
  isDashboard?: boolean
  /** When set, About/Product/Policy nav links point to this base URL instead of internal routes. */
  navBaseUrl?: string
  /**
   * UTM `utm_medium` value applied to the external Chainabit Contact link and other
   * external footer links. Defaults to `arena_footer`.
   */
  utmMedium?: string
  /**
   * Optional language hint (`en`, `tr`, …). When set and supported by chainabit.com,
   * the Contact link is localized as `https://chainabit.com/{lang_short}/contact`.
   */
  lang?: string
}

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']
const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  system: <Monitor size={18} />,
}
const THEME_LABELS: Record<Theme, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system mode',
  system: 'Switch to light mode',
}

const POLICY_SLUGS = [
  { slug: 'terms', label: 'Terms & Policies' },
  { slug: 'privacy', label: 'Privacy' },
  { slug: 'cookies', label: 'Cookies' },
]

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/product', label: 'Product' },
  { to: '/faq', label: 'FAQ' },
]

const CHAINABIT_SITE = 'https://chainabit.com'
const CHAINABIT_APP = 'https://app.chainabit.com'
const SUPPORTED_CONTACT_LANGS = new Set(['en', 'tr'])
const GITHUB_URL = 'https://github.com/conectlens/lenserfight'
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/conectlens'

function buildContactUrl(lang: string | undefined, utmMedium: string): string {
  const short = lang?.slice(0, 2).toLowerCase()
  const localized = short && SUPPORTED_CONTACT_LANGS.has(short) ? `${CHAINABIT_SITE}/${short}/contact` : `${CHAINABIT_SITE}/contact`
  const params = new URLSearchParams({
    utm_source: 'lenserfight',
    utm_medium: utmMedium,
    utm_campaign: 'lenserfight_contact',
  })
  return `${localized}?${params.toString()}`
}

function appendUtm(url: string, utmMedium: string, campaign: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', 'lenserfight')
    u.searchParams.set('utm_medium', utmMedium)
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    return url
  }
}

export const Footer: React.FC<FooterProps> = ({
  isDashboard,
  navBaseUrl,
  utmMedium = 'arena_footer',
  lang,
}) => {
  const currentYear = new Date().getFullYear()
  const { themeMode, setTheme } = useTheme()
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length]

  const contactUrl = buildContactUrl(lang, utmMedium)
  const docsUrl = appendUtm(DOCS_BASE_URL, utmMedium, 'footer_docs_link')
  const githubUrl = appendUtm(GITHUB_URL, utmMedium, 'footer_github_link')
  const chainabitAppUrl = appendUtm(CHAINABIT_APP, utmMedium, 'footer_chainabit_partner')
  const conectlensUrl = appendUtm('https://conectlens.com', utmMedium, 'footer_conectlens_link')

  return (
    <footer className="w-full py-12 px-4 mt-auto border-t border-gray-100 bg-white text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 transition-colors duration-200">
      <div
        className={`${isDashboard ? 'w-full' : 'max-w-5xl mx-auto px-6'} flex flex-col md:flex-row justify-between items-center gap-8`}
      >
        {/* Left: branding + attribution */}
        <div className="flex items-center gap-4">
          {isDashboard && (
            <div className="hidden md:block w-9 h-9 -ml-2 flex-shrink-0" aria-hidden="true" />
          )}

          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight text-sm">
              © {currentYear} LenserFight
            </span>

            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-100"
            >
              <Github size={14} />
            </a>
            <a
              href={appendUtm(GITHUB_SPONSORS_URL, utmMedium, 'footer_sponsor_link')}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Sponsor LenserFight"
              className="flex items-center gap-1 text-xs text-pink-500 transition-colors hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
            >
              <Heart size={12} /> Sponsor us
            </a>

            <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
            <a
              href={conectlensUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Powered by ConectLens
              <ExternalLink size={10} aria-label="External link" />
            </a>
            <span className="hidden md:inline text-gray-300 dark:text-gray-700">·</span>
            <a
              href={chainabitAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-orange-500 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              <img src="/chainabit/favicon-32x32.png" width={14} height={14} alt="" className="rounded shrink-0" />
              Sponsored by Chainabit
              <ExternalLink size={10} aria-label="External link" />
            </a>
          </div>
        </div>

        {/* Right: nav + theme */}
        <div className="flex items-center gap-4">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-medium">
            {/* About / Product / FAQ — internal when no navBaseUrl, external otherwise */}
            {NAV_LINKS.map(({ to, label }) =>
              navBaseUrl ? (
                <a
                  key={to}
                  href={appendUtm(`${navBaseUrl}${to}`, utmMedium, `footer_${to.replace(/\W+/g, '_')}_link`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={to}
                  to={to}
                  className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {label}
                </Link>
              )
            )}

            {/* Contact — always external (Chainabit) with ExternalLink icon and UTM tags */}
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Contact
              <ExternalLink size={11} aria-label="External link" />
            </a>

            {/* Policies — internal when no navBaseUrl, external otherwise */}
            {POLICY_SLUGS.map(({ slug, label }) =>
              navBaseUrl ? (
                <a
                  key={slug}
                  href={appendUtm(`${navBaseUrl}/policies/${slug}`, utmMedium, `footer_policy_${slug}_link`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={slug}
                  to={`/policies/${slug}`}
                  className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {label}
                </Link>
              )
            )}

            {/* Docs — always external */}
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Docs
              <ExternalLink size={11} aria-label="External link" />
            </a>
          </div>

          <button
            onClick={() => setTheme(nextTheme)}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            aria-label="Toggle theme"
            title={THEME_LABELS[themeMode]}
          >
            {THEME_ICONS[themeMode]}
          </button>

          {isDashboard && (
            <div className="hidden md:block w-9 h-9 -mr-1 flex-shrink-0" aria-hidden="true" />
          )}
        </div>
      </div>
    </footer>
  )
}
