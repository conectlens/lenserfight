import { ExternalLink, Github, Monitor, Moon, Sun } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@lenserfight/ui/theme'
import type { Theme } from '@lenserfight/ui/theme'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'

interface FooterProps {
  isDashboard?: boolean
  /** When set, About/Product/Contact/Policy nav links point to this base URL instead of internal routes. */
  navBaseUrl?: string
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
  { to: '/contact', label: 'Contact' },
]

const GITHUB_URL = 'https://github.com/conectlens/lenserfight'

export const Footer: React.FC<FooterProps> = ({ isDashboard, navBaseUrl }) => {
  const currentYear = new Date().getFullYear()
  const { themeMode, setTheme } = useTheme()
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length]

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
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-100"
            >
              <Github size={14} />
            </a>

            <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
            <a
              href="https://conectlens.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Powered by ConectLens
              <ExternalLink size={10} />
            </a>
            <span className="hidden md:inline text-gray-300 dark:text-gray-700">·</span>
            <a
              href="https://app.chainabit.com?utm_source=lenserfight_footer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors font-medium"
            >
              <img src="/chainabit/favicon-32x32.png" width={14} height={14} alt="" className="rounded shrink-0" />
              Sponsored by Chainabit
            </a>
          </div>
        </div>

        {/* Right: nav + theme */}
        <div className="flex items-center gap-4">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-medium">
            {/* About / Product / Contact — internal when no navBaseUrl, external otherwise */}
            {NAV_LINKS.map(({ to, label }) =>
              navBaseUrl ? (
                <a
                  key={to}
                  href={`${navBaseUrl}${to}`}
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

            {/* Policies — internal when no navBaseUrl, external otherwise */}
            {POLICY_SLUGS.map(({ slug, label }) =>
              navBaseUrl ? (
                <a
                  key={slug}
                  href={`${navBaseUrl}/policies/${slug}`}
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
              href={DOCS_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Docs
              <ExternalLink size={11} />
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
