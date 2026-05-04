import {
  AgentActionLogRecord,
  AgentAutomationFeedItem,
  AgentLensBindingRecord,
  AgentModelBindingRecord,
  AgentPolicyRecord,
  AgentQuotaSnapshotRecord,
  CreateAILenserInput,
  CreateAILenserResult,
  AgentActionInput,
  AgentActionResponse,
} from '@lenserfight/types'
import { AgentProfileView, AgentProfilePatch } from '../repositories/agentsRepository'
import { createAgentsRepository } from '../factory'


export type { AgentProfileView, AgentProfilePatch }

const agentsRepo = createAgentsRepository()

export const agentsService = {
  getAgentProfile: (aiLenserId: string): Promise<AgentProfileView | null> =>
    agentsRepo.getAgentProfile(aiLenserId),

  getAgentProfileByProfileId: (profileId: string): Promise<AgentProfileView | null> =>
    agentsRepo.getAgentProfileByProfileId(profileId),

  getAgentsByOwner: (ownerLenserId: string): Promise<AgentProfileView[]> =>
    agentsRepo.getAgentsByOwner(ownerLenserId),

  createAgent: (input: CreateAILenserInput): Promise<CreateAILenserResult> =>
    agentsRepo.createAgent(input),

  recordAction: (input: AgentActionInput): Promise<AgentActionResponse> =>
    agentsRepo.recordAction(input),

  getActionLogs: (aiLenserId: string, limit?: number): Promise<AgentActionLogRecord[]> =>
    agentsRepo.getActionLogs(aiLenserId, limit),

  getAutomationFeed: (aiLenserId: string, limit?: number, offset?: number): Promise<AgentAutomationFeedItem[]> =>
    agentsRepo.getAutomationFeed(aiLenserId, limit, offset),

  getQuotaSnapshot: (aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null> =>
    agentsRepo.getQuotaSnapshot(aiLenserId, date),

  getLensBindings: (aiLenserId: string): Promise<AgentLensBindingRecord[]> =>
    agentsRepo.getLensBindings(aiLenserId),

  getModelBindings: (aiLenserId: string): Promise<AgentModelBindingRecord[]> =>
    agentsRepo.getModelBindings(aiLenserId),

  setMainLensBinding: (
    aiLenserId: string,
    lensId: string,
    versionId?: string | null
  ): Promise<AgentLensBindingRecord | null> =>
    agentsRepo.setMainLensBinding(aiLenserId, lensId, versionId),

  setDefaultModelBinding: (
    aiLenserId: string,
    modelId: string
  ): Promise<AgentModelBindingRecord | null> =>
    agentsRepo.setDefaultModelBinding(aiLenserId, modelId),

  updatePolicy: (
    aiLenserId: string,
    policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> => agentsRepo.updatePolicy(aiLenserId, policy),

  /** Securely patches AI lenser workspace profile fields via fn_update_agent_profile RPC (validates ownership). */
  updateAgentProfile: (profileId: string, patch: AgentProfilePatch): Promise<void> =>
    agentsRepo.updateAgentProfile(profileId, patch),

  /** Updates the agent personality note (role/tone/behavior description). Owner-only via fn_update_agent_personality RPC. */
  updatePersonality: (aiLenserId: string, note: string | null): Promise<void> =>
    agentsRepo.updatePersonality(aiLenserId, note),
}
