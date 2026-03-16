import React, { useEffect } from 'react'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { sanitizeReturnUrl } from '../utils/validateReturnUrl'

/**
 * GatewayGuard blocks access to all auth-entry routes for already-authenticated users.
 *
 * If the user has a valid session but no LenserProfile → redirect to /onboarding
 * (preserving return_url so they land on the right page after completing setup).
 *
 * If the user has a valid session and a profile → redirect to return_url directly.
 *
 * While loading, a loading overlay is shown to prevent auth form flash.
 */
export const GatewayGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const { hasLenser, isLoading: lenserLoading } = useLenser()

  useEffect(() => {
    if (isLoading || lenserLoading) return
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search)
      const returnUrl = sanitizeReturnUrl(params.get('return_url'))
      if (!hasLenser) {
        window.location.replace(`/onboarding?return_url=${encodeURIComponent(returnUrl)}`)
      } else {
        window.location.replace(returnUrl)
      }
    }
  }, [isAuthenticated, hasLenser, isLoading, lenserLoading])

  if (isLoading || lenserLoading || isAuthenticated) {
    return <LoadingOverlay message={isAuthenticated ? 'Redirecting...' : 'Loading...'} />
  }

  return <>{children}</>
}
