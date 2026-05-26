import React, { createContext, useCallback, useContext, useState } from 'react'

export type AuthSheetMode = 'login' | 'register' | 'magicLink'

interface AuthSheetContextValue {
  isOpen: boolean
  mode: AuthSheetMode
  open: (mode?: AuthSheetMode) => void
  close: () => void
  setMode: (mode: AuthSheetMode) => void
}

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null)

export const AuthSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthSheetMode>('login')

  const open = useCallback((m: AuthSheetMode = 'login') => {
    setMode(m)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  return (
    <AuthSheetContext.Provider value={{ isOpen, mode, open, close, setMode }}>
      {children}
    </AuthSheetContext.Provider>
  )
}

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext)
  if (!ctx) throw new Error('useAuthSheet must be used inside AuthSheetProvider')
  return ctx
}
