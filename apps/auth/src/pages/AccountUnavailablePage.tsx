import React, { useEffect, useState } from 'react'
import { useAuth } from '@lenserfight/features/auth'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { sanitizeReturnUrl } from '../utils/validateReturnUrl'

export const AccountUnavailablePage: React.FC = () => {
  const { logout } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(true)

  const params = new URLSearchParams(window.location.search)
  const returnUrl = sanitizeReturnUrl(params.get('return_url'))
  const registerUrl = `/register?return_url=${encodeURIComponent(returnUrl)}`

  useEffect(() => {
    let active = true

    logout()
      .catch((error) => {
        console.error('Failed to clear auth session for unavailable account', error)
      })
      .finally(() => {
        if (active) setIsSigningOut(false)
      })

    return () => {
      active = false
    }
  }, [logout])

  if (isSigningOut) {
    return <LoadingOverlay message="Securing your account..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
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
