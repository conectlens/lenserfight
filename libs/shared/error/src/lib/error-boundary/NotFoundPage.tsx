import React from 'react'

interface NotFoundPageProps {
  onDismiss?: () => void
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onDismiss }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <svg
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Not Found</h1>
        <p className="max-w-sm text-gray-500 dark:text-gray-400">
          The page you are looking for does not exist or has been moved.
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
