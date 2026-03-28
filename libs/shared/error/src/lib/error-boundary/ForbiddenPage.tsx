import React from 'react'

interface ForbiddenPageProps {
  message?: string
  onDismiss?: () => void
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ message, onDismiss }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
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
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Forbidden</h1>
        <p className="max-w-sm text-gray-500 dark:text-gray-400">
          {message ?? "You don't have permission to view this. Try signing in with a different account or contact support."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-90"
        >
          Go Home
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
