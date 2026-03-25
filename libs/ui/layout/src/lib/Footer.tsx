import { Sun, Moon, Monitor, ExternalLink } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@lenserfight/ui/theme'
import type { Theme } from '@lenserfight/ui/theme'

interface FooterProps {
  isDashboard?: boolean
  /** When set, About/Ecosystem/Contact nav links point to this base URL instead of internal routes.
   *  Example (Forum app): import.meta.env.VITE_ARENA_URL ?? 'https://lenserfight.com'
   */
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

const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL ?? 'https://lenserfight.com'

export const Footer: React.FC<FooterProps> = ({ isDashboard, navBaseUrl }) => {
  const currentYear = new Date().getFullYear()
  const { themeMode, setTheme } = useTheme()
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length]
  const policyHref = (slug: string) => `${WEB_BASE_URL}/policies/${slug}`

  return (
    <footer className="w-full py-12 px-4 mt-auto border-t border-gray-100 bg-white text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 transition-colors duration-200">
      <div
        className={`${isDashboard ? 'w-full' : 'max-w-5xl mx-auto px-6'} flex flex-col md:flex-row justify-between items-center gap-8`}
      >
        <div className="flex items-center gap-4">
          {/*
             Left Alignment Spacer for Dashboard:
             Matches the Header's Sidebar Toggle Button layout footprint to align Footer text with Breadcrumbs.
           */}
          {isDashboard && (
            <div className="hidden md:block w-9 h-9 -ml-2 flex-shrink-0" aria-hidden="true" />
          )}

          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-8">
            <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight text-sm">
              © {currentYear} LenserFight
            </span>
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
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium">
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
            {POLICY_SLUGS.map(({ slug, label }) => (
              <a
                key={slug}
                href={policyHref(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>


          <button
            onClick={() => setTheme(nextTheme)}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            aria-label="Toggle theme"
            title={THEME_LABELS[themeMode]}
          >
            {THEME_ICONS[themeMode]}
          </button>

          {/*
             Right Alignment Spacer for Dashboard
           */}
          {isDashboard && (
            <div className="hidden md:block w-9 h-9 -mr-1 flex-shrink-0" aria-hidden="true" />
          )}
        </div>
      </div>
    </footer>
  )
}
