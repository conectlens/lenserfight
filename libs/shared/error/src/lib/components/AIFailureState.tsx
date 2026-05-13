import React from 'react'
import type { AppError } from '../types'

interface AIFailureStateProps {
  error: AppError
  onRetry?: () => void
  onSwitchProvider?: () => void
}

function resolveHeading(kind: AppError['kind']): string {
  switch (kind) {
    case 'model_unavailable':
      return 'Model unavailable'
    case 'agent_crashed':
      return 'Agent stopped unexpectedly'
    case 'token_quota_exceeded':
      return 'Token quota exceeded'
    case 'workflow_failed':
      return 'Workflow failed'
    default:
      return 'AI error'
  }
}

function resolveProvider(error: AppError): string | undefined {
  return (
    (error.context?.provider as string | undefined) ??
    (error as { provider?: string }).provider
  )
}

export const AIFailureState: React.FC<AIFailureStateProps> = ({
  error,
  onRetry,
  onSwitchProvider,
}) => {
  const provider = resolveProvider(error)

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/20">
        <svg
          className="h-5 w-5 text-violet-600 dark:text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {resolveHeading(error.kind)}
          {provider ? ` — ${provider}` : ''}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error.message}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        )}
        {onSwitchProvider && (
          <button
            onClick={onSwitchProvider}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Switch provider
          </button>
        )}
      </div>
    </div>
  )
}
