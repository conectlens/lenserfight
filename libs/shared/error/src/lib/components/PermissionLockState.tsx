import React from 'react'
import type { AppError } from '../types'

interface PermissionLockStateProps {
  error: AppError
  upgradeUrl?: string
  onDismiss?: () => void
}

function resolveUpgradeUrl(error: AppError, prop?: string): string | undefined {
  return (
    prop ??
    (error.context?.upgradeUrl as string | undefined) ??
    (error as { upgradeUrl?: string }).upgradeUrl
  )
}

function resolveFeatureName(error: AppError): string | undefined {
  return (
    (error.context?.featureKey as string | undefined) ??
    (error as { featureKey?: string }).featureKey
  )
}

export const PermissionLockState: React.FC<PermissionLockStateProps> = ({
  error,
  upgradeUrl,
  onDismiss,
}) => {
  const resolvedUpgradeUrl = resolveUpgradeUrl(error, upgradeUrl)
  const featureName = resolveFeatureName(error)

  const heading =
    error.kind === 'role_insufficient' ? 'Insufficient permissions' : 'Feature locked'

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
        <svg
          className="h-5 w-5 text-amber-600 dark:text-amber-400"
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

      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {heading}
          {featureName ? ` — ${featureName}` : ''}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error.message}</p>
      </div>

      <div className="flex gap-3">
        {resolvedUpgradeUrl && (
          <a
            href={resolvedUpgradeUrl}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Upgrade
          </a>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
