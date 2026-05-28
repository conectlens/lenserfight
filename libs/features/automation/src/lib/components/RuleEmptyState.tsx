import React from 'react'
import { Workflow } from 'lucide-react'
import { EmptyState } from '@lenserfight/ui/components'

interface RuleEmptyStateProps {
  docsHref?: string
}

/**
 * Shown on /automations when the lenser has zero trigger rules.
 *
 * Web is read/manage only for U5 — rule creation lives in the CLI
 * (Phase U4). We point users at the docs guide instead of an in-app
 * builder so the boundary stays explicit.
 */
export function RuleEmptyState({
  docsHref = '/docs/how-to/automation/build-your-first-trigger',
}: RuleEmptyStateProps) {
  return (
    <EmptyState
      icon={Workflow}
      title="No automations yet"
      description="Trigger rules react to events like battle.finalized and dispatch workflows, webhooks, or notifications. Build your first rule from the CLI."
      action={
        <a
          href={docsHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Open documentation: build your first trigger"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-2xl bg-white border border-greyscale-200 text-greyscale-800 hover:bg-greyscale-50 hover:border-greyscale-300 transition-all duration-150 dark:bg-greyscale-800 dark:border-greyscale-700 dark:text-greyscale-100 dark:hover:bg-greyscale-700"
        >
          Read the guide
        </a>
      }
    />
  )
}
