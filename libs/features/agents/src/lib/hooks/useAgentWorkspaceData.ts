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
import { filterSchedulesForAgentWorkspace } from './filterSchedulesForAgentWorkspace'
import { resolveOwnerFleetOwnerId } from './resolveOwnerFleetOwnerId'

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
  personalityBindings: AgentLensBindingRecord[]
  defaultPersonalityBinding: AgentLensBindingRecord | null
}

export function useAgentWorkspaceData({
  handle,
  viewedProfileId,
  viewedProfileType,
  isOwner,
  shouldSwitchWorkspace,
  ownerHumanLenserId,
}: UseAgentWorkspaceDataParams): AgentWorkspaceData {
  const isAgentOwner = isOwner && viewedProfileType === 'ai' && !!viewedProfileId
  const isHumanOwner = isOwner && viewedProfileType === 'human' && !!viewedProfileId

  const { data: agentProfile = null, isLoading: agentLoading } = useQuery<AgentProfileView | null>({
    queryKey: queryKeys.agents.detailByProfile(viewedProfileId ?? ''),
    queryFn: () => agentsService.getAgentProfileByProfileId(viewedProfileId!),
    enabled: isAgentOwner,
    staleTime: 60_000,
  })

  const ownerFleetOwnerId = resolveOwnerFleetOwnerId({
    ownerHumanLenserId,
    agentOwnerLenserId: agentProfile?.owner_lenser_id ?? null,
    viewedProfileId,
    viewedProfileType,
  })

  const bootstrapQuery = useQuery<AgentWorkspaceBootstrap | null>({
    queryKey: queryKeys.agents.workspaceBootstrap(handle),
    queryFn: () => agentWorkspaceService.getWorkspaceBootstrap(handle),
    enabled: isAgentOwner && !!agentProfile && !shouldSwitchWorkspace,
    staleTime: 30_000,
  })

  const schedulesQuery = useQuery<WorkflowScheduleRecord[]>({
    queryKey: queryKeys.workflows.schedules(null),
    queryFn: () => workflowsService.getSchedules(),
    enabled: isAgentOwner && !shouldSwitchWorkspace,
    staleTime: 30_000,
  })

  // Workflows are owned by the human lenser, not the AI agent.
  // In agent_owner mode use the human owner's ID; in human_owner mode use the profile ID directly.
  const workflowsOwnerId = isAgentOwner
    ? (ownerFleetOwnerId ?? null)
    : isHumanOwner
      ? viewedProfileId
      : null

  const workflowsQuery = useQuery<WorkflowRecord[]>({
    queryKey: queryKeys.workflows.byLenser(workflowsOwnerId ?? ''),
    queryFn: () => workflowsService.listByLenser(workflowsOwnerId!),
    enabled: !!workflowsOwnerId && !shouldSwitchWorkspace,
    staleTime: 60_000,
  })

  const ownerFleetAgentsQuery = useQuery<AgentProfileView[]>({
    queryKey: [...queryKeys.agents.all, 'byOwner', ownerFleetOwnerId ?? ''],
    queryFn: () => agentsService.getAgentsByOwner(ownerFleetOwnerId!),
    enabled: (isHumanOwner || isAgentOwner) && !!ownerFleetOwnerId,
    staleTime: 30_000,
  })

  const instructionBindingsQuery = useQuery<AgentLensBindingRecord[]>({
    queryKey: queryKeys.agents.lensBindings(agentProfile?.ai_lenser_id ?? ''),
    queryFn: () => agentsService.getLensBindings(agentProfile!.ai_lenser_id),
    enabled: isAgentOwner && !!agentProfile?.ai_lenser_id,
    staleTime: 120_000,
  })

  const modelBindingsQuery = useQuery<AgentModelBindingRecord[]>({
    queryKey: queryKeys.agents.modelBindings(agentProfile?.ai_lenser_id ?? ''),
    queryFn: () => agentsService.getModelBindings(agentProfile!.ai_lenser_id),
    enabled: isAgentOwner && !!agentProfile?.ai_lenser_id,
    staleTime: 120_000,
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

  const schedules =
    isAgentOwner && bootstrapQuery.data
      ? filterSchedulesForAgentWorkspace(schedulesQuery.data ?? [], bootstrapQuery.data)
      : []

  return {
    agentProfile,
    agentLoading,
    bootstrap: bootstrapQuery.data ?? null,
    bootstrapState,
    schedules,
    workflows: workflowsQuery.data ?? [],
    ownerFleetAgents: ownerFleetAgentsQuery.data ?? [],
    ownerFleetAgentsLoading: ownerFleetAgentsQuery.isLoading,
    instructionBindings: instructionBindingsQuery.data ?? [],
    modelBindings: modelBindingsQuery.data ?? [],
    personalityBindings: (instructionBindingsQuery.data ?? []).filter((b) =>
      b.category_tags.includes('personality')
    ),
    defaultPersonalityBinding:
      (instructionBindingsQuery.data ?? []).find(
        (b) => b.is_default && b.category_tags.includes('personality')
      ) ?? null,
    defaultInstructionBinding:
      (instructionBindingsQuery.data ?? []).find(
        (b) => b.is_default && !b.category_tags.includes('personality')
      ) ?? null,
  }
}
