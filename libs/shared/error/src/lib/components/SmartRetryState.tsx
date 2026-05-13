import React, { useEffect, useState } from 'react'
import type { AppError } from '../types'

interface SmartRetryStateProps {
  error: AppError
  onRetry: () => void
  /** Seconds to count down before enabling the retry button. Falls back to error.retryAfter. */
  retryAfter?: number
  message?: string
}

export const SmartRetryState: React.FC<SmartRetryStateProps> = ({
  error,
  onRetry,
  retryAfter,
  message,
}) => {
  const initialCountdown =
    retryAfter ?? (error as { retryAfter?: number }).retryAfter ?? 0
  const [countdown, setCountdown] = useState(initialCountdown)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [countdown])

  const canRetry = countdown <= 0

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <svg
          className="h-7 w-7 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message ?? error.message}
        </p>
        {countdown > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Retry available in {countdown}s
          </p>
        )}
      </div>

      <button
        onClick={onRetry}
        disabled={!canRetry}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canRetry ? 'Retry' : `Wait ${countdown}s`}
      </button>
    </div>
  )
}
