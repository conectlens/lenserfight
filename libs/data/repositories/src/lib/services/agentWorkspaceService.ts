import type {
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentPersonalityProfileRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentToolProfileRecord,
  AgentWorkspaceBootstrap,
} from '@lenserfight/types'

import {
  SupabaseAgentWorkspaceRepository,
  type CreateAgentMemoryProfileInput,
  type CreateAgentModelProfileInput,
  type CreateAgentPersonalityProfileInput,
  type CreateAgentTeamInput,
  type CreateAgentToolProfileInput,
} from '../repositories/agentWorkspaceRepository'

const agentWorkspaceRepo = new SupabaseAgentWorkspaceRepository()

export type {
  CreateAgentMemoryProfileInput,
  CreateAgentModelProfileInput,
  CreateAgentPersonalityProfileInput,
  CreateAgentTeamInput,
  CreateAgentToolProfileInput,
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
}
