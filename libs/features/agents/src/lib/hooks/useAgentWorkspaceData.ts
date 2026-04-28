import { queryKeys } from '@lenserfight/data/cache'
import {
  agentWorkspaceService,
  agentsService,
  workflowsService,
  type AgentProfileView,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type {
  AgentWorkspaceBootstrap,
  WorkflowScheduleRecord,
} from '@lenserfight/types'

interface UseAgentWorkspaceDataParams {
  handle: string
  viewedProfileId: string | null
  viewedProfileType: 'human' | 'ai' | null
  isOwner: boolean
  shouldSwitchWorkspace: boolean
}

interface AgentWorkspaceData {
  agentProfile: AgentProfileView | null
  agentLoading: boolean
  bootstrap: AgentWorkspaceBootstrap | null
  bootstrapLoading: boolean
  bootstrapError: unknown
  schedules: WorkflowScheduleRecord[]
  workflows: WorkflowRecord[]
  ownedAgents: AgentProfileView[]
  ownedAgentsLoading: boolean
}

export function useAgentWorkspaceData({
  handle,
  viewedProfileId,
  viewedProfileType,
  isOwner,
  shouldSwitchWorkspace,
}: UseAgentWorkspaceDataParams): AgentWorkspaceData {
  const isAgentOwner =
    isOwner && viewedProfileType === 'ai' && !!viewedProfileId
  const isHumanOwner =
    isOwner && viewedProfileType === 'human' && !!viewedProfileId

  const { data: agentProfile = null, isLoading: agentLoading } =
    useQuery<AgentProfileView | null>({
      queryKey: queryKeys.agents.detailByProfile(viewedProfileId ?? ''),
      queryFn: () => agentsService.getAgentProfileByProfileId(viewedProfileId!),
      enabled: isAgentOwner,
      staleTime: 60_000,
    })

  const bootstrapQuery = useQuery<AgentWorkspaceBootstrap | null>({
    queryKey: queryKeys.agents.workspaceBootstrap(handle),
    queryFn: () => agentWorkspaceService.getWorkspaceBootstrap(handle),
    enabled:
      isAgentOwner && !!agentProfile && !shouldSwitchWorkspace,
    staleTime: 15_000,
  })

  const schedulesQuery = useQuery<WorkflowScheduleRecord[]>({
    queryKey: queryKeys.workflows.schedules(null),
    queryFn: () => workflowsService.getSchedules(),
    enabled: isAgentOwner && !shouldSwitchWorkspace,
    staleTime: 15_000,
  })

  const workflowsQuery = useQuery<WorkflowRecord[]>({
    queryKey: queryKeys.workflows.byLenser(viewedProfileId ?? ''),
    queryFn: () => workflowsService.listByLenser(viewedProfileId!),
    enabled:
      (isAgentOwner || isHumanOwner) &&
      !!viewedProfileId &&
      !shouldSwitchWorkspace,
    staleTime: 60_000,
  })

  const ownedAgentsQuery = useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'byOwner', viewedProfileId ?? ''],
    queryFn: () => agentsService.getAgentsByOwner(viewedProfileId!),
    enabled: isHumanOwner,
    staleTime: 30_000,
  })

  return {
    agentProfile,
    agentLoading,
    bootstrap: bootstrapQuery.data ?? null,
    bootstrapLoading: bootstrapQuery.isLoading,
    bootstrapError: bootstrapQuery.error,
    schedules: schedulesQuery.data ?? [],
    workflows: workflowsQuery.data ?? [],
    ownedAgents: ownedAgentsQuery.data ?? [],
    ownedAgentsLoading: ownedAgentsQuery.isLoading,
  }
}
