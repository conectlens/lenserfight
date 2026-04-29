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
  AgentLensBindingRecord,
  AgentModelBindingRecord,
  AgentWorkspaceBootstrap,
  WorkflowScheduleRecord,
} from '@lenserfight/types'
import type { AgentWorkspaceBootstrapState } from '../context/AgentWorkspaceContext'

interface UseAgentWorkspaceDataParams {
  handle: string
  viewedProfileId: string | null
  viewedProfileType: 'human' | 'ai' | null
  isOwner: boolean
  shouldSwitchWorkspace: boolean
  ownerHumanLenserId?: string | null
}

interface AgentWorkspaceData {
  agentProfile: AgentProfileView | null
  agentLoading: boolean
  bootstrap: AgentWorkspaceBootstrap | null
  bootstrapState: AgentWorkspaceBootstrapState
  schedules: WorkflowScheduleRecord[]
  workflows: WorkflowRecord[]
  ownerFleetAgents: AgentProfileView[]
  ownerFleetAgentsLoading: boolean
  instructionBindings: AgentLensBindingRecord[]
  modelBindings: AgentModelBindingRecord[]
  defaultInstructionBinding: AgentLensBindingRecord | null
}

export function useAgentWorkspaceData({
  handle,
  viewedProfileId,
  viewedProfileType,
  isOwner,
  shouldSwitchWorkspace,
  ownerHumanLenserId,
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

  const ownerFleetAgentsQuery = useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'byOwner', ownerHumanLenserId ?? viewedProfileId ?? ''],
    queryFn: () => agentsService.getAgentsByOwner(ownerHumanLenserId ?? viewedProfileId!),
    enabled: (isHumanOwner || isAgentOwner) && !!(ownerHumanLenserId ?? viewedProfileId),
    staleTime: 30_000,
  })

  const instructionBindingsQuery = useQuery<AgentLensBindingRecord[]>({
    queryKey: queryKeys.agents.lensBindings(agentProfile?.ai_lenser_id ?? ''),
    queryFn: () => agentsService.getLensBindings(agentProfile!.ai_lenser_id),
    enabled: isAgentOwner && !!agentProfile?.ai_lenser_id,
    staleTime: 30_000,
  })

  const modelBindingsQuery = useQuery<AgentModelBindingRecord[]>({
    queryKey: queryKeys.agents.modelBindings(agentProfile?.ai_lenser_id ?? ''),
    queryFn: () => agentsService.getModelBindings(agentProfile!.ai_lenser_id),
    enabled: isAgentOwner && !!agentProfile?.ai_lenser_id,
    staleTime: 30_000,
  })

  const bootstrapState: AgentWorkspaceBootstrapState = (() => {
    if (!isAgentOwner) return { kind: 'idle' }
    if (bootstrapQuery.isLoading) return { kind: 'loading' }
    if (bootstrapQuery.error) {
      const message =
        bootstrapQuery.error instanceof Error
          ? bootstrapQuery.error.message
          : 'The control-room RPC did not return workspace data.'
      return { kind: 'failed', message }
    }
    if (bootstrapQuery.data) return { kind: 'ready' }
    return { kind: 'missing' }
  })()

  return {
    agentProfile,
    agentLoading,
    bootstrap: bootstrapQuery.data ?? null,
    bootstrapState,
    schedules: schedulesQuery.data ?? [],
    workflows: workflowsQuery.data ?? [],
    ownerFleetAgents: ownerFleetAgentsQuery.data ?? [],
    ownerFleetAgentsLoading: ownerFleetAgentsQuery.isLoading,
    instructionBindings: instructionBindingsQuery.data ?? [],
    modelBindings: modelBindingsQuery.data ?? [],
    defaultInstructionBinding:
      (instructionBindingsQuery.data ?? []).find((binding) => binding.is_default) ??
      null,
  }
}
