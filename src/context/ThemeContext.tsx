import React, { createContext, useContext, useEffect, useState } from 'react'

import { themeController, Theme } from '../theme/themeController'

import { useAuth } from './AuthContext'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>('light') // Default until resolved

  // Initialize on mount or user change
  useEffect(() => {
    const init = async () => {
      const resolved = await themeController.initTheme(user?.id)
      setThemeState(resolved)
    }
    init()
  }, [user?.id])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    themeController.setTheme(newTheme, user?.id)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
