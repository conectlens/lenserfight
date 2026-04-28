import React from 'react'
import { Bot } from 'lucide-react'
import type { AgentProfileView } from '@lenserfight/data/repositories'
import { AgentCard } from './AgentCard'
import { EmptyPanel } from './EmptyPanel'

export type AgentsGridMode = 'owner' | 'public'

interface AgentsGridProps {
  agents: AgentProfileView[]
  mode: AgentsGridMode
  /** Owner-only CTA. Required when `mode === 'owner'`. */
  onCreateAgent?: () => void
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Reusable grid of `AgentCard`s. Drives both Human-Owner and Human-Public
 * surfaces with the only difference being whether the empty state shows the
 * Create Agent CTA.
 */
export const AgentsGrid: React.FC<AgentsGridProps> = ({
  agents,
  mode,
  onCreateAgent,
  emptyTitle,
  emptyDescription,
}) => {
  if (agents.length === 0) {
    const isOwner = mode === 'owner'
    return (
      <EmptyPanel
        icon={<Bot size={22} />}
        title={emptyTitle ?? (isOwner ? 'No agents yet' : 'No public agents')}
        description={
          emptyDescription ??
          (isOwner
            ? 'Build your first Agent Lenser to run lenses, workflows, and teams.'
            : 'This Lenser does not own any public agents.')
        }
      >
        {isOwner && onCreateAgent && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onCreateAgent}
              className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
            >
              Create Agent
            </button>
          </div>
        )}
      </EmptyPanel>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isOwner={mode === 'owner'}
        />
      ))}
    </div>
  )
}
