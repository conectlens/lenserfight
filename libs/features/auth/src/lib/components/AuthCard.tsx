import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export const AuthCard: React.FC<{
  children: React.ReactNode
  title: string
  subtitle?: string
  backButton?: React.ReactNode
}> = ({ children, title, subtitle, backButton }) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:justify-center items-center
bg-[var(--background-default)]
dark:bg-gray-900
p-4 relative transition-colors duration-200">
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
            onClick={toggleTheme}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--surface-input)] dark:bg-gray-800 border border-[var(--border-default)] dark:border-gray-700 text-[var(--text-primary)] dark:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 transition-colors shadow-sm"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <>
                <Sun size={18} />
                <span className="text-sm font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon size={18} />
                <span className="text-sm font-medium">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
