// Bootstrap default renderer registrations (mirrors the previous switch statement exactly)
import '../error-registry/defaultRenderers'

import React from 'react'
import { useError } from '../error-context/ErrorContext'
import { getErrorEntry } from '../error-registry/registry'

interface GenericErrorPageProps {
  message: string
  onDismiss?: () => void
}

const GenericErrorPage: React.FC<GenericErrorPageProps> = ({ message, onDismiss }) => (
  <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <svg
        className="h-8 w-8 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
    </div>

    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
      <p className="max-w-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>

    {onDismiss && (
      <button
        onClick={onDismiss}
        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Dismiss
      </button>
    )}
  </div>
)

export const GlobalErrorRenderer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { error, clearError } = useError()

  if (!error) return <>{children}</>

  const entry = getErrorEntry(error.kind)
  if (entry) {
    const Renderer = entry.renderer
    return <Renderer error={error} onDismiss={clearError} onRetry={clearError} />
  }

  // Fallback for unregistered kinds — preserves the existing switch default-case behavior
  return <GenericErrorPage message={error.message} onDismiss={clearError} />
}
