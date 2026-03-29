import React, { useEffect } from 'react'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'
import { useAuthProfileGate } from '../hooks/useAuthProfileGate'

/**
 * OnboardingGuard ensures the /onboarding route is only accessible to
 * authenticated users who are genuinely new or still mid-onboarding.
 *
 * - Not authenticated → /login (with return_url preserved)
 * - Authenticated + active profile → return_url (onboarding already done)
 * - Authenticated + recoverable profile → /account-recovery
 * - Authenticated + deleted/unavailable profile → /account-unavailable
 * - Authenticated + no profile / incomplete onboarding → render children
 */
export const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const { data: gate, isLoading: gateLoading, error: gateError } = useAuthProfileGate()

  useEffect(() => {
    if (isLoading || gateLoading || !!gateError) return

    if (!isAuthenticated) {
      const params = new URLSearchParams(window.location.search)
      const rawReturnUrl = params.get('return_url')
      const loginUrl = rawReturnUrl
        ? `/login?return_url=${encodeURIComponent(sanitizeReturnUrl(rawReturnUrl))}`
        : '/login'
      replaceLocationSafely(loginUrl)
      return
    }

    if (!gate) return

    if (gate.kind === 'active') {
      const params = new URLSearchParams(window.location.search)
      replaceLocationSafely(sanitizeReturnUrl(params.get('return_url')))
    } else if (gate.kind === 'recoverable') {
      const params = new URLSearchParams(window.location.search)
      const returnUrl = sanitizeReturnUrl(params.get('return_url'))
      replaceLocationSafely(`/account-recovery?return_url=${encodeURIComponent(returnUrl)}`)
    } else if (gate.kind !== 'new' && gate.kind !== 'onboarding') {
      const params = new URLSearchParams(window.location.search)
      const returnUrl = sanitizeReturnUrl(params.get('return_url'))
      replaceLocationSafely(`/account-unavailable?return_url=${encodeURIComponent(returnUrl)}`)
    }
  }, [gate, gateLoading, gateError, isAuthenticated, isLoading])

  if (isLoading || gateLoading || !!gateError) {
    return <LoadingOverlay message="Loading..." />
  }

  if (!isAuthenticated) {
    return null
  }

  if (!gate) {
    return <LoadingOverlay message="Loading..." />
  }

  if (gate.kind !== 'new' && gate.kind !== 'onboarding') {
    return <LoadingOverlay message="Loading..." />
  }

  return <>{children}</>
}
