import type {
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentPersonalityProfileRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentToolProfileRecord,
  AgentWorkspaceBootstrap,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
  ApprovalRequestView,
  CostSummary,
  CrossAgentFeedItem,
} from '@lenserfight/types'

import {
  SupabaseAgentWorkspaceRepository,
  type CreateAgentMemoryProfileInput,
  type CreateAgentModelProfileInput,
  type CreateAgentPersonalityProfileInput,
  type CreateAgentTeamInput,
  type CreateAgentToolProfileInput,
  type ListApprovalRequestsOptions,
} from '../repositories/agentWorkspaceRepository'

const agentWorkspaceRepo = new SupabaseAgentWorkspaceRepository()

export type {
  CreateAgentMemoryProfileInput,
  CreateAgentModelProfileInput,
  CreateAgentPersonalityProfileInput,
  CreateAgentTeamInput,
  CreateAgentToolProfileInput,
  ListApprovalRequestsOptions,
}

export const agentWorkspaceService = {
  getWorkspaceBootstrap: (handle: string): Promise<AgentWorkspaceBootstrap | null> =>
    agentWorkspaceRepo.getWorkspaceBootstrap(handle),

  createTeam: (input: CreateAgentTeamInput): Promise<AgentTeamRecord | null> =>
    agentWorkspaceRepo.createTeam(input),

  listTeamMembers: (teamId: string): Promise<AgentTeamMemberRecord[]> =>
    agentWorkspaceRepo.listTeamMembers(teamId),

  listTeamEdges: (teamId: string): Promise<AgentTeamEdgeRecord[]> =>
    agentWorkspaceRepo.listTeamEdges(teamId),

  createPersonalityProfile: (
    input: CreateAgentPersonalityProfileInput
  ): Promise<AgentPersonalityProfileRecord | null> =>
    agentWorkspaceRepo.createPersonalityProfile(input),

  createMemoryProfile: (
    input: CreateAgentMemoryProfileInput
  ): Promise<AgentMemoryProfileRecord | null> =>
    agentWorkspaceRepo.createMemoryProfile(input),

  createToolProfile: (input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null> =>
    agentWorkspaceRepo.createToolProfile(input),

  createModelProfile: (
    input: CreateAgentModelProfileInput
  ): Promise<AgentModelProfileRecord | null> => agentWorkspaceRepo.createModelProfile(input),

  listApprovalRequests: (
    aiLenserId: string,
    options?: ListApprovalRequestsOptions
  ): Promise<ApprovalRequestView[]> =>
    agentWorkspaceRepo.listApprovalRequests(aiLenserId, options),

  getApprovalRequest: (requestId: string): Promise<ApprovalRequestView | null> =>
    agentWorkspaceRepo.getApprovalRequest(requestId),

  decideApproval: (input: ApprovalDecisionInput): Promise<ApprovalDecisionResult> =>
    agentWorkspaceRepo.decideApproval(input),

  getHumanActivityFeed: (
    humanLenserId: string,
    limit?: number,
    offset?: number
  ): Promise<CrossAgentFeedItem[]> =>
    agentWorkspaceRepo.getHumanActivityFeed(humanLenserId, limit, offset),

  getCostSummary: (aiLenserId: string): Promise<CostSummary> =>
    agentWorkspaceRepo.getCostSummary(aiLenserId),
}
