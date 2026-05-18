/**
 * FundingSection — reusable AI provider/model selector for runner nodes.
 *
 * Wraps the existing FundingSourceToggle from @lenserfight/features/lenses.
 * Only rendered for runners with needsAiProvider: true.
 */

import React from 'react'

import type { WorkflowNodeConfig } from '../../types'

export interface FundingSectionProps {
  config: WorkflowNodeConfig
  onConfigChange: (patch: Partial<WorkflowNodeConfig>) => void
}

/**
 * Placeholder: full funding integration will be wired in Phase 6.
 * For now, shows the current funding source as a read-only badge.
 */
export function FundingSection({ config }: FundingSectionProps) {
  const source = config.funding_source ?? 'platform_credit'

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-greyscale-500 dark:text-greyscale-400">
        AI Provider
      </p>
      <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-[11px] text-greyscale-600 dark:text-greyscale-300">
        Funding: <span className="font-medium capitalize">{source.replace(/_/g, ' ')}</span>
        {config.model_id && (
          <span className="ml-2 text-greyscale-400">Model: {config.model_id}</span>
        )}
      </div>
    </div>
  )
}
