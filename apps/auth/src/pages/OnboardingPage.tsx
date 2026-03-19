import React from 'react'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'

/**
 * OnboardingPage hosts the multi-step profile creation wizard in apps/auth.
 * All applications redirect here after login when the user has no LenserProfile.
 * After completing (or skipping) onboarding, the user is sent to return_url.
 */
export const OnboardingPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search)
  const returnUrl = sanitizeReturnUrl(params.get('return_url'))

  const handleDone = () => replaceLocationSafely(returnUrl)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <CreateLenserProfileModal onClose={handleDone} onComplete={handleDone} />
    </div>
  )
}
