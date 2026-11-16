import React, { useEffect, useState } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { useAuthProfileGate } from '../hooks/useAuthProfileGate'
import { DEFAULT_RETURN_URL, replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'

type Phase = 'checking' | 'signing-out' | 'done'

/**
 * Terminal page for permanently deleted accounts. The session is cleared only
 * after the profile gate confirms the signed-in account really is deleted, so
 * following a link to this route can never sign anyone out.
 */
export const AccountUnavailablePage: React.FC = () => {
  const { logout, isAuthenticated, isLoading } = useAuth()
  const { data: gate, isLoading: gateLoading, error: gateError } = useAuthProfileGate()
  const [phase, setPhase] = useState<Phase>('checking')

  const params = new URLSearchParams(window.location.search)
  const returnUrl = sanitizeReturnUrl(params.get('return_url'))
  const registerUrl = `/register?return_url=${encodeURIComponent(returnUrl)}`

  useEffect(() => {
    if (phase !== 'checking' || isLoading || gateLoading) return

    if (isAuthenticated && gate?.kind === 'deleted') {
      setPhase('signing-out')
      logout()
        .catch((error) => {
          console.error('Failed to clear auth session for unavailable account', error)
        })
        .finally(() => setPhase('done'))
      return
    }

    // Active accounts have nothing to see here. Everyone else (anonymous,
    // recoverable, onboarding, or a failed gate) stays on this page without any
    // sign-out, so a failed recovery can never bounce back into a redirect loop.
    if (isAuthenticated && gate?.kind === 'active') {
      replaceLocationSafely(returnUrl.startsWith('/account-') ? DEFAULT_RETURN_URL : returnUrl)
      return
    }
    setPhase('done')
    // returnUrl is derived from the URL once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isLoading, gateLoading, isAuthenticated, gate, gateError, logout])

  if (phase !== 'done') {
    return (
      <LoadingOverlay
        message={phase === 'signing-out' ? 'Securing your account...' : 'Checking your account...'}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-greyscale-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">
            !
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account unavailable</h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            This Lenser account has already been permanently deleted and can no longer be restored.
            We signed you out to stop the auth redirect loop.
          </p>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            If you want to join again, start with a fresh account. Otherwise, head back to the
            forum.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href={registerUrl}
            className="flex items-center justify-center rounded-lg border border-transparent bg-primary px-4 py-3 font-medium text-gray-900 transition-all duration-200 hover:bg-yellow-300"
          >
            Create new account
          </a>
          <a
            href={returnUrl}
            className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Return to forum
          </a>
        </div>
      </div>
    </div>
  )
}
