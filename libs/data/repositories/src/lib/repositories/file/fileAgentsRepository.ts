import type {
  AgentActionInput,
  AgentActionLogRecord,
  AgentActionResponse,
  AgentAutomationFeedItem,
  AgentLensBindingRecord,
  AgentModelBindingRecord,
  AgentPolicyRecord,
  AgentQuotaSnapshotRecord,
  CreateAILenserInput,
  CreateAILenserResult,
} from '@lenserfight/types'
import { FileDataStore } from '@lenserfight/infra/storage'
import type {
  AgentProfilePatch,
  AgentProfileView,
  AgentsRepositoryPort,
} from '../agentsRepository'

const FILE_MODE_LENSER_ID = 'file-lenser-00000000-0000-0000-0000-000000000001'

const agentStore = new FileDataStore<AgentProfileView>('agent_profiles')
const lensBindingStore = new FileDataStore<AgentLensBindingRecord>('agent_lens_bindings')
const modelBindingStore = new FileDataStore<AgentModelBindingRecord>('agent_model_bindings')

function defaultAgentProfileView(aiLenserId: string, profileId: string, handle: string, displayName: string): AgentProfileView {
  return {
    id: aiLenserId,
    ai_lenser_id: aiLenserId,
    profile_id: profileId,
    handle,
    display_name: displayName,
    avatar_url: null,
    lenser_type: 'ai',
    runtime_pref: 'cloud',
    is_active: true,
    suspended_at: null,
    suspended_reason: null,
    personality_note: null,
    created_at: new Date().toISOString(),
    can_join_battles: true,
    can_vote: true,
    can_create_battles: false,
    can_receive_sponsorship: false,
    model_binding_mode: 'single',
    max_daily_battles: 10,
    max_daily_votes: 50,
    allowed_battle_types: [],
    spending_limit_credits: 1000,
    is_public_policy: false,
    model_count: 0,
    lens_count: 0,
    battles_used: 0,
    votes_used: 0,
    credits_spent: 0,
    total_battles: 0,
    battles_won: 0,
    battles_lost: 0,
    win_rate: null,
    owner_lenser_id: FILE_MODE_LENSER_ID,
    owner_handle: 'dev',
    owner_display_name: 'Local Dev',
    owner_avatar_url: null,
  }
}

export class FileAgentsRepository implements AgentsRepositoryPort {
  async getAgentProfile(aiLenserId: string): Promise<AgentProfileView | null> {
    return (await agentStore.findById(aiLenserId)) ?? null
  }

  async getAgentProfileByProfileId(profileId: string): Promise<AgentProfileView | null> {
    const results = await agentStore.findWhere((a) => a.profile_id === profileId)
    return results[0] ?? null
  }

  async getAgentsByOwner(ownerLenserId: string): Promise<AgentProfileView[]> {
    return agentStore.findWhere((a) => a.owner_lenser_id === ownerLenserId)
  }

  async createAgent(input: CreateAILenserInput): Promise<CreateAILenserResult> {
    const aiLenserId = crypto.randomUUID()
    const profileId = crypto.randomUUID()
    const view = defaultAgentProfileView(
      aiLenserId,
      profileId,
      input.handle ?? `agent-${aiLenserId.slice(0, 8)}`,
      input.display_name ?? 'New Agent'
    )
    await agentStore.save(view)
    return { profile_id: profileId, ai_lenser_id: aiLenserId }
  }

  async recordAction(_input: AgentActionInput): Promise<AgentActionResponse> {
    console.warn('[file mode] FileAgentsRepository.recordAction — no-op in file-storage mode')
    return { success: true, action_id: crypto.randomUUID() } as unknown as AgentActionResponse
  }

  async getActionLogs(_aiLenserId: string, _limit?: number): Promise<AgentActionLogRecord[]> {
    return []
  }

  async getAutomationFeed(_aiLenserId: string, _limit?: number, _offset?: number): Promise<AgentAutomationFeedItem[]> {
    return []
  }

  async getQuotaSnapshot(_aiLenserId: string, _date?: string): Promise<AgentQuotaSnapshotRecord | null> {
    return null
  }

  async getLensBindings(aiLenserId: string, limit = 50, offset = 0): Promise<AgentLensBindingRecord[]> {
    const all = await lensBindingStore.findWhere((b) => b.ai_lenser_id === aiLenserId)
    return all.slice(offset, offset + limit)
  }

  async getModelBindings(aiLenserId: string, limit = 50, offset = 0): Promise<AgentModelBindingRecord[]> {
    const all = await modelBindingStore.findWhere((b) => b.ai_lenser_id === aiLenserId)
    return all.slice(offset, offset + limit)
  }

  async setMainLensBinding(
    aiLenserId: string,
    lensId: string,
    versionId?: string | null,
    categoryTags: string[] = []
  ): Promise<AgentLensBindingRecord | null> {
    const isPersonality = categoryTags.includes('personality')
    const existing = await lensBindingStore.findWhere((b) => b.ai_lenser_id === aiLenserId && b.is_default)
    for (const b of existing) {
      const bIsPersonality = b.category_tags.includes('personality')
      if (bIsPersonality === isPersonality) {
        await lensBindingStore.save({ ...b, is_default: false })
      }
    }
    const binding: AgentLensBindingRecord = {
      id: crypto.randomUUID(),
      ai_lenser_id: aiLenserId,
      lens_id: lensId,
      version_id: versionId ?? null,
      is_default: true,
      category_tags: categoryTags,
      created_at: new Date().toISOString(),
    }
    await lensBindingStore.save(binding)
    return binding
  }

  async setDefaultModelBinding(
    aiLenserId: string,
    modelId: string
  ): Promise<AgentModelBindingRecord | null> {
    const existing = await modelBindingStore.findWhere((b) => b.ai_lenser_id === aiLenserId && b.is_default)
    for (const b of existing) {
      await modelBindingStore.save({ ...b, is_default: false })
    }
    const binding: AgentModelBindingRecord = {
      id: crypto.randomUUID(),
      ai_lenser_id: aiLenserId,
      model_id: modelId,
      is_default: true,
      category_tags: [],
      created_at: new Date().toISOString(),
    }
    await modelBindingStore.save(binding as any)
    return binding
  }

  async updatePolicy(
    aiLenserId: string,
    policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const agent = await agentStore.findById(aiLenserId)
    if (!agent) return
    await agentStore.save({ ...agent, ...policy })
  }

  async updateAgentProfile(profileId: string, patch: AgentProfilePatch): Promise<void> {
    const agents = await agentStore.findWhere((a) => a.profile_id === profileId)
    for (const agent of agents) {
      await agentStore.save({ ...agent, ...patch })
    }
  }

  async updatePersonality(aiLenserId: string, note: string | null): Promise<void> {
    const agent = await agentStore.findById(aiLenserId)
    if (!agent) return
    await agentStore.save({ ...agent, personality_note: note })
  }
}
