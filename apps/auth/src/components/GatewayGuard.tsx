import React, { useEffect } from 'react'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'
import { getAuthGateRedirectUrl } from '../utils/authRedirects'
import { useAuthProfileGate } from '../hooks/useAuthProfileGate'

/**
 * GatewayGuard blocks access to all auth-entry routes for already-authenticated users.
 *
 * - active profile → redirect to return_url
 * - no profile row → redirect to /onboarding
 * - recoverable profile → redirect to /account-recovery for automatic restore
 * - deleted profile → redirect to /account-unavailable
 *
 * While loading, a loading overlay is shown to prevent auth form flash.
 */
export const GatewayGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const { data: gate, isLoading: gateLoading, error: gateError } = useAuthProfileGate()

  useEffect(() => {
    if (isLoading || gateLoading || !gate) return
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search)
      const returnUrl = sanitizeReturnUrl(params.get('return_url'))
      replaceLocationSafely(getAuthGateRedirectUrl(gate, returnUrl))
    }
  }, [gate, gateLoading, isAuthenticated, isLoading])

  if (isLoading || gateLoading || !!gateError || (isAuthenticated && gate)) {
    return <LoadingOverlay message={isAuthenticated ? 'Redirecting...' : 'Loading...'} />
  }

  return <>{children}</>
}
