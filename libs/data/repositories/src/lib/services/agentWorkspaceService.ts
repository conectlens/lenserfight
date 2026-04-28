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

  // Scratchpad
  listScratchpadRuns: agentWorkspaceRepo.listScratchpadRuns.bind(agentWorkspaceRepo),
  createScratchpadRun: agentWorkspaceRepo.createScratchpadRun.bind(agentWorkspaceRepo),
  completeScratchpadRun: agentWorkspaceRepo.completeScratchpadRun.bind(agentWorkspaceRepo),
  promoteScratchpadToMemory: agentWorkspaceRepo.promoteScratchpadToMemory.bind(agentWorkspaceRepo),

  // Evaluations
  listEvaluations: agentWorkspaceRepo.listEvaluations.bind(agentWorkspaceRepo),
  createEvaluation: agentWorkspaceRepo.createEvaluation.bind(agentWorkspaceRepo),
  runEvaluation: agentWorkspaceRepo.runEvaluation.bind(agentWorkspaceRepo),
  getEvaluationResults: agentWorkspaceRepo.getEvaluationResults.bind(agentWorkspaceRepo),
  listEvaluationRuns: agentWorkspaceRepo.listEvaluationRuns.bind(agentWorkspaceRepo),

  // Tools registry
  listToolRegistry: agentWorkspaceRepo.listToolRegistry.bind(agentWorkspaceRepo),
  registerTool: agentWorkspaceRepo.registerTool.bind(agentWorkspaceRepo),
  assignTool: agentWorkspaceRepo.assignTool.bind(agentWorkspaceRepo),
  revokeTool: agentWorkspaceRepo.revokeTool.bind(agentWorkspaceRepo),
  listToolAssignments: agentWorkspaceRepo.listToolAssignments.bind(agentWorkspaceRepo),

  // Fleet aggregations
  getFleetOverview: agentWorkspaceRepo.getFleetOverview.bind(agentWorkspaceRepo),
  listFleetRuns: agentWorkspaceRepo.listFleetRuns.bind(agentWorkspaceRepo),
  listFleetLogs: agentWorkspaceRepo.listFleetLogs.bind(agentWorkspaceRepo),

  // Workspace settings
  getWorkspaceSettings: agentWorkspaceRepo.getWorkspaceSettings.bind(agentWorkspaceRepo),
  updateWorkspaceSettings: agentWorkspaceRepo.updateWorkspaceSettings.bind(agentWorkspaceRepo),
  exportWorkspace: agentWorkspaceRepo.exportWorkspace.bind(agentWorkspaceRepo),
  requestWorkspaceDeletion: agentWorkspaceRepo.requestWorkspaceDeletion.bind(agentWorkspaceRepo),

  // Profile mutations
  updateMemoryProfile: agentWorkspaceRepo.updateMemoryProfile.bind(agentWorkspaceRepo),
  deleteMemoryProfile: agentWorkspaceRepo.deleteMemoryProfile.bind(agentWorkspaceRepo),
  updatePersonalityProfile: agentWorkspaceRepo.updatePersonalityProfile.bind(agentWorkspaceRepo),
  deletePersonalityProfile: agentWorkspaceRepo.deletePersonalityProfile.bind(agentWorkspaceRepo),
  updateToolProfile: agentWorkspaceRepo.updateToolProfile.bind(agentWorkspaceRepo),
  deleteToolProfile: agentWorkspaceRepo.deleteToolProfile.bind(agentWorkspaceRepo),
  updateModelProfile: agentWorkspaceRepo.updateModelProfile.bind(agentWorkspaceRepo),
  deleteModelProfile: agentWorkspaceRepo.deleteModelProfile.bind(agentWorkspaceRepo),

  // Team mutations
  updateTeam: agentWorkspaceRepo.updateTeam.bind(agentWorkspaceRepo),
  deleteTeam: agentWorkspaceRepo.deleteTeam.bind(agentWorkspaceRepo),
  addTeamMember: agentWorkspaceRepo.addTeamMember.bind(agentWorkspaceRepo),
  updateTeamMember: agentWorkspaceRepo.updateTeamMember.bind(agentWorkspaceRepo),
  deleteTeamMember: agentWorkspaceRepo.deleteTeamMember.bind(agentWorkspaceRepo),
  upsertTeamEdge: agentWorkspaceRepo.upsertTeamEdge.bind(agentWorkspaceRepo),
  deleteTeamEdge: agentWorkspaceRepo.deleteTeamEdge.bind(agentWorkspaceRepo),
}
