import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { preferencesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import {
  LocaleProvider,
  type LocaleChangeSource,
} from '@lenserfight/shared/i18n-locale'
import type { LocaleCode } from '@lenserfight/utils/locale'

interface LocaleProviderBridgeProps {
  children: ReactNode
}

/**
 * Bridges Supabase-backed auth state into the URL-stable LocaleProvider:
 *   - reads the authenticated user's saved language as the auth-priority locale
 *   - writes the chosen locale back to lensers.preferences when the user picks it
 *   - one-time persists the resolved locale to the profile if it is missing
 */
export function LocaleProviderBridge({ children }: LocaleProviderBridgeProps) {
  const { isAuthenticated } = useAuth()
  const { lenser } = useLenser()
  const authLocale = lenser?.preferences?.language ?? null
  const hasBackfilledProfileLocale = useRef(false)

  const handleLocaleChange = useCallback(
    (next: LocaleCode, _previous: LocaleCode, source: LocaleChangeSource) => {
      if (source !== 'user') return
      if (!isAuthenticated || !lenser) return
      void preferencesService
        .updatePreferences({ language: next })
        .catch((err) => {
          console.warn('Failed to persist locale to profile', err)
        })
    },
    [isAuthenticated, lenser],
  )

  useEffect(() => {
    if (!isAuthenticated || !lenser) return
    if (lenser.preferences?.language) return
    if (hasBackfilledProfileLocale.current) return
    hasBackfilledProfileLocale.current = true
    const current =
      (typeof document !== 'undefined' && document.documentElement.lang) || 'en'
    void preferencesService
      .updatePreferences({ language: current })
      .catch((err) => {
        console.warn('Failed to backfill profile locale', err)
      })
  }, [isAuthenticated, lenser])

  return (
    <LocaleProvider authLocale={authLocale} onLocaleChange={handleLocaleChange}>
      {children}
    </LocaleProvider>
  )
}
