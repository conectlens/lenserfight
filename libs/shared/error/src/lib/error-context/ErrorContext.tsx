import React, { createContext, useCallback, useContext, useState } from 'react'
import type { AppError } from '../types'

interface ErrorContextValue {
  error: AppError | null
  setError: (error: AppError) => void
  clearError: () => void
}

const ErrorContext = createContext<ErrorContextValue>({
  error: null,
  setError: () => undefined,
  clearError: () => undefined,
})

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setErrorState] = useState<AppError | null>(null)

  const setError = useCallback((err: AppError) => {
    setErrorState(err)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export const useError = (): ErrorContextValue => useContext(ErrorContext)
