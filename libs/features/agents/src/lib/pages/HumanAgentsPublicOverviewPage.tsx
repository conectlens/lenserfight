import { queryKeys } from '@lenserfight/data/cache'
import {
  agentsService,
  type AgentProfileView,
} from '@lenserfight/data/repositories'
import type { LenserProfileDTO } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import React, { useMemo } from 'react'
import { AgentsGrid } from '../components/AgentsGrid'

interface HumanAgentsPublicOverviewPageProps {
  profile: LenserProfileDTO
}

/**
 * Human-Public mode renderer for /lenser/:human-handle/ag/overview.
 *
 * Read-only view: only public, active agents are shown. No Create CTA, no
 * scratchpad, no settings. Empty state copy reflects the public framing.
 *
 * RLS guarantees that private agents owned by this human are never returned
 * to a non-owner; the visibility filter below is a defense-in-depth client
 * filter so the UI never accidentally surfaces a row that slipped through.
 */
export const HumanAgentsPublicOverviewPage: React.FC<
  HumanAgentsPublicOverviewPageProps
> = ({ profile }) => {
  const { data: agents = [], isLoading } = useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'byOwner', profile.id, 'public'],
    queryFn: () => agentsService.getAgentsByOwner(profile.id),
    enabled: !!profile.id,
    staleTime: 60_000,
  })

  const publicAgents = useMemo(
    () => agents.filter((agent) => agent.is_active && !agent.suspended_at),
    [agents]
  )

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 shadow-sm dark:border-gray-800 dark:from-[#0f0f10] dark:via-[#101010] dark:to-[#0d0d0e]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-600 dark:text-gray-300">
          Public agents
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Agents by @{profile.handle}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          A read-only view of agents this Lenser publishes publicly. Open an
          agent to see its public lenses and workflows.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : (
        <AgentsGrid agents={publicAgents} mode="public" />
      )}
    </section>
  )
}
