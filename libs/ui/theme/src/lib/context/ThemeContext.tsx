import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@lenserfight/features/auth'

if (import.meta.hot) {
  import.meta.hot.decline()
}

import { themeController, Theme, ResolvedTheme, resolveTheme, getSystemTheme } from '../themeController'

interface ThemeContextType {
  /** The user's stored preference: 'light' | 'dark' | 'system' */
  themeMode: Theme
  /** The actual applied theme after resolving 'system' */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  /** @deprecated use setTheme instead */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [themeMode, setThemeModeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(getSystemTheme())

  // Initialize on mount or user change
  useEffect(() => {
    const init = async () => {
      const mode = await themeController.initTheme(user?.id)
      setThemeModeState(mode)
      setResolvedTheme(resolveTheme(mode))
    }
    init()
  }, [user?.id])

  // Watch system preference when mode is 'system'
  useEffect(() => {
    if (themeMode !== 'system') return
    const unwatch = themeController.watchSystemTheme((resolved) => {
      setResolvedTheme(resolved)
      // applyToDOM is handled inside watchSystemTheme via themeController.setTheme
      // but here we just re-apply the class
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    })
    return unwatch
  }, [themeMode])

  const setTheme = (newTheme: Theme) => {
    setThemeModeState(newTheme)
    setResolvedTheme(resolveTheme(newTheme))
    themeController.setTheme(newTheme, user?.id)
  }

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
