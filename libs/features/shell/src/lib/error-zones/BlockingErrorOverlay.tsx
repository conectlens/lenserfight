import { getErrorEntry, useError } from '@lenserfight/shared/error'
import React, { Component } from 'react'

import type { AppError } from '@lenserfight/shared/error'

// Safety boundary — if the overlay renderer itself crashes, show a minimal fallback
interface BoundaryState {
  hasError: boolean
}

class OverlayErrorBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">An unexpected error occurred.</p>
        </div>
      )
    }
    return this.props.children
  }
}

interface BlockingErrorOverlayProps {
  error: AppError
}

const GenericBlockingFallback: React.FC<{ error: AppError; onDismiss: () => void }> = ({
  error,
  onDismiss,
}) => (
  <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <svg
        className="h-8 w-8 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
        />
      </svg>
    </div>
    <div className="space-y-2">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
      <p className="max-w-sm text-gray-500 dark:text-gray-400">{error.message}</p>
    </div>
    <button
      onClick={onDismiss}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      Dismiss
    </button>
  </div>
)

export const BlockingErrorOverlay: React.FC<BlockingErrorOverlayProps> = ({ error }) => {
  const { removeError, clearError } = useError()

  const dismiss = () => {
    if (error.errorId) {
      removeError(error.errorId)
    } else {
      clearError()
    }
  }

  const entry = getErrorEntry(error.kind)

  return (
    <OverlayErrorBoundary>
      {entry ? (
        <entry.renderer error={error} onDismiss={dismiss} onRetry={dismiss} />
      ) : (
        <GenericBlockingFallback error={error} onDismiss={dismiss} />
      )}
    </OverlayErrorBoundary>
  )
}
