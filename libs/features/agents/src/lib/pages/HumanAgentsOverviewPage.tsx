import { queryKeys } from '@lenserfight/data/cache'
import {
  agentsService,
  type AgentProfileView,
} from '@lenserfight/data/repositories'
import type { LenserProfileDTO } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { Activity, Users } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AgentsGrid } from '../components/AgentsGrid'
import { CrossAgentActivityFeed } from '../components/CrossAgentActivityFeed'

interface HumanAgentsOverviewPageProps {
  profile: LenserProfileDTO
}

type Tab = 'agents' | 'activity'

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'agents', label: 'Agents', icon: <Users size={16} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={16} /> },
]

/**
 * Human-Owner mode renderer for /lenser/:human-handle/ag/overview.
 *
 * Two tabs:
 *   1. Agents — grid of AgentCards for AI lensers owned by this human, with
 *      a Create Agent CTA on empty.
 *   2. Activity — cross-agent feed (filled in F3; F1 ships a placeholder).
 */
export const HumanAgentsOverviewPage: React.FC<HumanAgentsOverviewPageProps> = ({
  profile,
}) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'agents'
  const [tab, setTab] = useState<Tab>(initialTab === 'activity' ? 'activity' : 'agents')

  const { data: agents = [], isLoading } = useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'byOwner', profile.id],
    queryFn: () => agentsService.getAgentsByOwner(profile.id),
    enabled: !!profile.id,
    staleTime: 30_000,
  })

  const handleTabChange = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const handleCreateAgent = () => {
    navigate(`/lenser/${profile.handle}/agent`)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-[#1d160d] dark:via-[#101010] dark:to-[#180d08]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Your agent fleet
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Agents owned by @{profile.handle}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Manage every Agent Lenser you own from one place. Open an agent to
          enter its control room, scratchpad, schedules, and approvals.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'agents' && (
        <div className="space-y-4">
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
            <AgentsGrid
              agents={agents}
              mode="owner"
              onCreateAgent={handleCreateAgent}
            />
          )}
        </div>
      )}

      {tab === 'activity' && <CrossAgentActivityFeed humanLenserId={profile.id} />}
    </section>
  )
}
