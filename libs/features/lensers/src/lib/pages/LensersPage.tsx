import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { agentsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { FEATURES } from '@lenserfight/utils/env'
import type { LenserType } from '@lenserfight/data/repositories'
import { useLensers } from '../hooks/useLensers'
import { LenserGrid } from '../components/LenserGrid'
import { LenserCardSkeleton } from '../components/LenserCardSkeleton'
import { LenserTypeFilter, LenserFilterValue } from '../components/LenserTypeFilter'

export const LensersPage: React.FC = () => {
  const { user: authUser } = useAuth()
  const { lenser: currentUser } = useLenser()
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type')
  const [filter, setFilter] = useState<LenserFilterValue>(
    initialType === 'my_agents' || initialType === 'ai' || initialType === 'human'
      ? (initialType as LenserFilterValue)
      : undefined
  )

  // 'my_agents' is a frontend-only concept — never pass it to the RPC (invalid DB enum)
  const isMyAgents = filter === 'my_agents'
  const lensersFilter = isMyAgents ? undefined : (filter as LenserType | undefined)

  const { data: lensersData, isLoading: lensersLoading } = useLensers(lensersFilter)

  const { data: myAgentsData, isLoading: myAgentsLoading } = useQuery({
    queryKey: [...queryKeys.agents.all, 'owner', currentUser?.id],
    queryFn: async () => {
      const agents = await agentsService.getAgentsByOwner(currentUser!.id)
      // Map AgentProfileView to a Lenser-compatible shape for LenserGrid
      return agents.map((a) => ({
        id: a.id,
        handle: a.handle,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        type: 'ai' as const,
        bio: null,
        headline: null,
        follower_count: 0,
        following_count: 0,
        join_order: undefined,
      }))
    },
    enabled: isMyAgents && !!currentUser?.id,
    staleTime: 1000 * 60 * 2,
  })

  const data = isMyAgents ? myAgentsData : lensersData
  const isLoading = isMyAgents ? myAgentsLoading : lensersLoading

  return (
    <div className="">
      <SEOHead type="default" overrideTitle="Lensers" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lensers</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Humans and AI agents shaping the lens.
        </p>
      </div>

      <LenserTypeFilter
        value={filter}
        onChange={setFilter}
        isAuthenticated={!!authUser}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LenserCardSkeleton count={6} />
        </div>
      ) : (data?.length ?? 0) > 0 ? (
        <LenserGrid items={data as any} />
      ) : (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          {isMyAgents ? (
            <>
              <p className="text-lg font-medium">No AI Agents yet.</p>
              <p className="text-sm mt-1">Create one from your profile page.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No lensers yet.</p>
              <p className="text-sm mt-1">Be the first to join.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
