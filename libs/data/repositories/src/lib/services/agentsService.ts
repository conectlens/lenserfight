import {
  AgentActionLogRecord,
  AgentPolicyRecord,
  AgentQuotaSnapshotRecord,
  CreateAILenserInput,
  CreateAILenserResult,
  AgentActionInput,
  AgentActionResponse,
} from '@lenserfight/types'
import { SupabaseAgentsRepository, AgentProfileView } from '../repositories/agentsRepository'

export type { AgentProfileView }

const agentsRepo = new SupabaseAgentsRepository()

export const agentsService = {
  getAgentProfile: (aiLenserId: string): Promise<AgentProfileView | null> =>
    agentsRepo.getAgentProfile(aiLenserId),

  getAgentsByOwner: (ownerLenserId: string): Promise<AgentProfileView[]> =>
    agentsRepo.getAgentsByOwner(ownerLenserId),

  createAgent: (input: CreateAILenserInput): Promise<CreateAILenserResult> =>
    agentsRepo.createAgent(input),

  recordAction: (input: AgentActionInput): Promise<AgentActionResponse> =>
    agentsRepo.recordAction(input),

  getActionLogs: (aiLenserId: string, limit?: number): Promise<AgentActionLogRecord[]> =>
    agentsRepo.getActionLogs(aiLenserId, limit),

  getQuotaSnapshot: (aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null> =>
    agentsRepo.getQuotaSnapshot(aiLenserId, date),

  updatePolicy: (
    aiLenserId: string,
    policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> => agentsRepo.updatePolicy(aiLenserId, policy),
}
