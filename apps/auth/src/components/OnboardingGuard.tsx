import React, { useEffect } from 'react'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { sanitizeReturnUrl } from '../utils/validateReturnUrl'

/**
 * OnboardingGuard ensures the /onboarding route is only accessible to
 * authenticated users who have not yet created a LenserProfile.
 *
 * - Not authenticated → /login (with return_url preserved)
 * - Authenticated + already has profile → return_url (onboarding already done)
 * - Authenticated + no profile → render children (onboarding page)
 */
export const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const { hasLenser, isLoading: lenserLoading } = useLenser()

  useEffect(() => {
    if (isLoading || lenserLoading) return
    if (!isAuthenticated) {
      const params = new URLSearchParams(window.location.search)
      const returnUrl = params.get('return_url')
      const loginUrl = returnUrl
        ? `/login?return_url=${encodeURIComponent(returnUrl)}`
        : '/login'
      window.location.replace(loginUrl)
    } else if (hasLenser) {
      const params = new URLSearchParams(window.location.search)
      window.location.replace(sanitizeReturnUrl(params.get('return_url')))
    }
  }, [isAuthenticated, hasLenser, isLoading, lenserLoading])

  if (isLoading || lenserLoading || !isAuthenticated || hasLenser) {
    return <LoadingOverlay message="Loading..." />
  }

  return <>{children}</>
}
