import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useError } from '../error-context/ErrorContext'

/**
 * Mount this inside a React Router context.
 * Clears the global error state whenever the route changes so stale
 * errors from one page never bleed into the next.
 */
export const ErrorClearer: React.FC = () => {
  const { clearError } = useError()
  const { pathname } = useLocation()

  useEffect(() => {
    clearError()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
