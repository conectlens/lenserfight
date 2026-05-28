import { AUTH_BASE_URL } from '@lenserfight/utils/env'
import React from 'react'

interface ForbiddenPageProps {
  message?: string
  onDismiss?: () => void
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ message, onDismiss }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
        <svg
          className="h-8 w-8 text-orange-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
        <p className="max-w-sm text-gray-500 dark:text-gray-400">
          {message ?? "You don't have permission to view this. Sign in or try a different account."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`${AUTH_BASE_URL}/login`}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sign In
        </a>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
