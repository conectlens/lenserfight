import React from 'react'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'

/**
 * OnboardingPage hosts the multi-step profile creation wizard in apps/auth.
 * All applications redirect here after login when the user has no LenserProfile
 * or still has onboarding steps left to finish.
 * After completing onboarding, the user is sent to return_url.
 */
export const OnboardingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <CreateLenserProfileModal />
    </div>
  )
}
