import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@lenserfight/ui/theme'
import type { Theme } from '@lenserfight/ui/theme'

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']
const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  system: <Monitor size={18} />,
}
const THEME_LABELS: Record<Theme, string> = {
  light: 'Dark',
  dark: 'System',
  system: 'Light',
}

export const AuthCard: React.FC<{
  children: React.ReactNode
  title: string
  subtitle?: string
  backButton?: React.ReactNode
}> = ({ children, title, subtitle, backButton }) => {
  const { themeMode, setTheme } = useTheme()
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length]

  return (
    <div className="min-h-screen flex flex-col justify-start md:justify-center items-center
bg-[var(--cl-grey-50)]
dark:bg-[var(--cl-dark-700)]
p-4 md:p-6 relative transition-colors duration-200">
      {backButton && (
        <div className="w-full md:absolute md:top-6 md:left-6 z-10 mb-6 md:mb-0">{backButton}</div>
      )}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="h-24 w-24 flex items-center justify-center bg-[var(--surface-card)] dark:bg-gray-800 rounded-3xl shadow-sm border border-[var(--border-default)] dark:border-gray-700 p-4 transition-colors">
              <img
                src="https://cdn.lenserfight.com/brand/lenserfight-logo.png"
                alt="LenserFight Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="absolute -top-3 -right-6 bg-gradient-to-br from-primary to-yellow-400 text-gray-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md transform rotate-6 border border-white/40 dark:border-gray-700/40 select-none z-10">
              Beta
            </span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] dark:text-white tracking-tight text-center">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--text-secondary)] dark:text-gray-400 mt-2 font-medium text-center">
              {subtitle}
            </p>
          )}
        </div>

        <div className="bg-[var(--surface-card)] dark:bg-gray-800 rounded-3xl border border-[var(--border-default)] dark:border-gray-700 p-8 sm:p-10 shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden transition-colors">
          {children}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setTheme(nextTheme)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--surface-input)] dark:bg-gray-800 border border-[var(--border-default)] dark:border-gray-700 text-[var(--text-primary)] dark:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 transition-colors shadow-sm"
            title={`Switch to ${THEME_LABELS[themeMode]} mode`}
          >
            {THEME_ICONS[nextTheme]}
            <span className="text-sm font-medium">{THEME_LABELS[themeMode]}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
