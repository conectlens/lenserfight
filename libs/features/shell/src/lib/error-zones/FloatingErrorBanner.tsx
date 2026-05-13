import { useError } from '@lenserfight/shared/error'
import React, { useEffect } from 'react'

import type { AppError } from '@lenserfight/shared/error'

interface FloatingErrorBannerProps {
  error: AppError
}

const BANNER_COLOR: Record<string, string> = {
  network:
    'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-yellow-300',
  websocket_disconnected:
    'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-yellow-300',
  rate_limit:
    'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700/50 dark:text-orange-300',
  maintenance:
    'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700/50 dark:text-orange-300',
  realtime_unavailable:
    'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-yellow-300',
  edge_unavailable:
    'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-300',
}

const DEFAULT_BANNER_COLOR =
  'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300'

const AUTO_DISMISS_MS = 8000

export const FloatingErrorBanner: React.FC<FloatingErrorBannerProps> = ({ error }) => {
  const { removeError } = useError()

  const dismiss = () => {
    if (error.errorId) removeError(error.errorId)
  }

  useEffect(() => {
    if (error.lifecycle !== 'transient' && error.severity !== 'transient') return
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error.errorId])

  const colorClass = BANNER_COLOR[error.kind] ?? DEFAULT_BANNER_COLOR

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`sticky top-0 z-50 flex items-center justify-between border-b px-4 py-2.5 text-sm font-medium ${colorClass}`}
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <span>{error.message}</span>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-4 shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
