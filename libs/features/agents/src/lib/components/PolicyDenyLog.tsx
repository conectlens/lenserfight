import { Card } from '@lenserfight/ui/components'
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
    <Card className="flex flex-col h-full !p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Policy Denials
          </h3>
          {denials.length > 0 && (
            <span className="rounded-full border border-primary-yellow-200 bg-primary-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
              {denials.length}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Review recent policy violations and automated denials.
      </p>

      <div className="mt-6 flex-1 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 animate-pulse rounded-2xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/50"
            />
          ))
        ) : denials.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recent denials.
            </p>
          </div>
        ) : (
          denials.map((evaluation) => (
            <div
              key={evaluation.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 transition-colors hover:border-primary-yellow-200 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-primary-yellow-500/30"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex-shrink-0 rounded-full border border-primary-yellow-200 bg-primary-yellow-50 px-2 py-0.5 text-[11px] font-bold text-primary-yellow-700 dark:border-primary-yellow-500/20 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
                  {evaluation.policy_type}
                </span>
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                  {evaluation.reason ?? 'No reason given'}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                {formatRelativeOrDate(evaluation.evaluated_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
