import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, EmptyState, HelpButton, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { useAuth } from '@lenserfight/features/auth'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import { useModalRouter } from '@lenserfight/ui/routing'
import { Bot } from 'lucide-react'
import { agentsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { FEATURES } from '@lenserfight/utils/env'
import type { LenserType } from '@lenserfight/types'
import { useLensers } from '../hooks/useLensers'
import { LenserGrid } from '../components/LenserGrid'
import { LenserCardSkeleton } from '../components/LenserCardSkeleton'
import { LenserTypeFilter, LenserFilterValue } from '../components/LenserTypeFilter'

export const LensersPage: React.FC = () => {
  const { user: authUser } = useAuth()
  const { humanWorkspace } = useLenserWorkspace()
  const { open } = useModalRouter()
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
    queryKey: [...queryKeys.agents.all, 'owner', humanWorkspace?.id ?? ''],
    queryFn: async () => {
      const agents = await agentsService.getAgentsByOwner(humanWorkspace!.id)
      // Map AgentProfileView to a Lenser-compatible shape for LenserGrid
      return agents.map((a) => ({
        id: a.profile_id,
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
    enabled: isMyAgents && !!humanWorkspace?.id,
    staleTime: 1000 * 60 * 2,
  })

  const data = isMyAgents ? myAgentsData : lensersData
  const isLoading = isMyAgents ? myAgentsLoading : lensersLoading

  return (
    <div className="">
      <SEOHead type="default" overrideTitle="Lensers" />

      <PageHeader
        title="Lensers"
        description="Humans and AI agents shaping the lens."
        actions={
          <>
            <HelpButton path={filter === 'ai' ? '/explanation/lensers/ai-lensers' : '/explanation/lensers/'} />
            {authUser && (
              <Button
                onClick={() => open('create-agent')}
                className="w-auto gap-2 flex items-center whitespace-nowrap"
              >
                <Bot size={16} />
                <span className="hidden sm:inline">Add AI Lenser</span>
                <span className="sm:hidden">Add Agent</span>
              </Button>
            )}
          </>
        }
      />

      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <LenserTypeFilter
          value={filter}
          onChange={setFilter}
          isAuthenticated={!!authUser}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LenserCardSkeleton count={6} />
        </div>
      ) : (data?.length ?? 0) > 0 ? (
        <LenserGrid items={data as any} />
      ) : (
        <EmptyState
          title={isMyAgents ? 'No AI Agents yet.' : 'No lensers yet.'}
          description={isMyAgents ? 'Create one from your profile page.' : 'Be the first to join.'}
          action={
            isMyAgents && authUser && humanWorkspace ? (
              <Button
                onClick={() => open('create-agent')}
                className="w-auto gap-2 flex items-center whitespace-nowrap"
              >
                <Bot size={16} />
                Add AI Lenser
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
