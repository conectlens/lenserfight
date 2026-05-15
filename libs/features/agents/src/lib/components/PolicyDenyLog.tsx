import React from 'react'

import { usePolicyLog } from '../hooks/usePolicyLog'

interface PolicyDenyLogProps {
  aiLenserId: string
}

function formatRelativeOrDate(value: string): string {
  const date = new Date(value)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export const PolicyDenyLog: React.FC<PolicyDenyLogProps> = ({ aiLenserId }) => {
  const { data, isLoading } = usePolicyLog(aiLenserId, { verdict: 'deny', limit: 5 })

  const denials = data ?? []

  return (
    <div className="rounded-xl bg-primary-yellow-50 p-4 dark:bg-primary-yellow-950">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Policy Denials
        </h3>
        {denials.length > 0 && (
          <span className="rounded-full border border-primary-yellow-300 bg-primary-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-primary-yellow-700 dark:border-primary-yellow-700 dark:bg-primary-yellow-900 dark:text-primary-yellow-300">
            {denials.length}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-12 animate-pulse rounded-2xl border border-primary-yellow-200 bg-primary-yellow-100 dark:border-primary-yellow-800 dark:bg-primary-yellow-900"
            />
          ))
        ) : denials.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No recent denials.
          </p>
        ) : (
          denials.map((evaluation) => (
            <div
              key={evaluation.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-primary-yellow-200 bg-white px-4 py-3 dark:border-primary-yellow-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex-shrink-0 rounded-full border border-primary-yellow-300 bg-primary-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-700 dark:bg-primary-yellow-900/50 dark:text-primary-yellow-300">
                  {evaluation.policy_type}
                </span>
                <p className="truncate text-sm text-gray-700 dark:text-gray-300">
                  {evaluation.reason ?? 'No reason given'}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatRelativeOrDate(evaluation.evaluated_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
