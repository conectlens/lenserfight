import { supabase } from '@lenserfight/data/supabase'
import {
  AgentAutomationFeedItem,
  AgentLensBindingRecord,
  AgentModelBindingRecord,
  AgentRuntimePref,
  AgentModelBindingMode,
  AgentActionLogRecord,
  AgentPolicyRecord,
  AgentQuotaSnapshotRecord,
  CreateAILenserInput,
  CreateAILenserResult,
  AgentActionInput,
  AgentActionResponse,
} from '@lenserfight/types'

// --- View type ---

export interface AgentProfileView {
  id: string
  ai_lenser_id: string
  profile_id: string
  handle: string
  display_name: string
  avatar_url: string | null
  lenser_type?: 'human' | 'ai'
  runtime_pref: AgentRuntimePref
  is_active: boolean
  suspended_at: string | null
  suspended_reason: string | null
  personality_note?: string | null
  created_at?: string
  can_join_battles: boolean
  can_vote: boolean
  can_create_battles: boolean
  can_receive_sponsorship: boolean
  model_binding_mode: AgentModelBindingMode
  max_daily_battles: number
  max_daily_votes: number
  allowed_battle_types: string[]
  spending_limit_credits: number
  is_public_policy: boolean
  model_count: number
  lens_count: number
  battles_used: number
  votes_used: number
  credits_spent: number
  owner_lenser_id: string
  owner_handle: string
  owner_display_name: string
  owner_avatar_url?: string | null
  total_battles: number
  battles_won: number
  battles_lost: number
  win_rate: number | null
}

// --- Port ---

export interface AgentProfilePatch {
  display_name?: string
  avatar_url?: string | null
  banner_url?: string | null
  bio?: string | null
  headline?: string | null
  website_url?: string | null
}

export interface AgentsRepositoryPort {
  getAgentProfile(aiLenserId: string): Promise<AgentProfileView | null>
  getAgentProfileByProfileId(profileId: string): Promise<AgentProfileView | null>
  getAgentsByOwner(ownerLenserId: string): Promise<AgentProfileView[]>
  createAgent(input: CreateAILenserInput): Promise<CreateAILenserResult>
  recordAction(input: AgentActionInput): Promise<AgentActionResponse>
  getActionLogs(aiLenserId: string, limit?: number): Promise<AgentActionLogRecord[]>
  getAutomationFeed(aiLenserId: string, limit?: number, offset?: number): Promise<AgentAutomationFeedItem[]>
  getQuotaSnapshot(aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null>
  getLensBindings(aiLenserId: string, limit?: number, offset?: number): Promise<AgentLensBindingRecord[]>
  getModelBindings(aiLenserId: string, limit?: number, offset?: number): Promise<AgentModelBindingRecord[]>
  setMainLensBinding(aiLenserId: string, lensId: string, versionId?: string | null, categoryTags?: string[]): Promise<AgentLensBindingRecord | null>
  setDefaultModelBinding(aiLenserId: string, modelId: string): Promise<AgentModelBindingRecord | null>
  updatePolicy(aiLenserId: string, policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>): Promise<void>
  updateAgentProfile(profileId: string, patch: AgentProfilePatch): Promise<void>
  updatePersonality(aiLenserId: string, note: string | null): Promise<void>
}

// --- Supabase Implementation ---

export class SupabaseAgentsRepository implements AgentsRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Agent not found.')
    if (e.message?.includes('owner_must_be_active_human_lenser')) {
      throw new Error('Your account must be active to create AI agents. Try refreshing the page.')
    }
    throw error
  }

  async getAgentProfile(aiLenserId: string): Promise<AgentProfileView | null> {
    const { data, error } = await supabase.rpc('fn_get_agent_profile', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) this.handleError(error)
    return (data ?? null) as AgentProfileView | null
  }

  async getAgentProfileByProfileId(profileId: string): Promise<AgentProfileView | null> {
    const { data, error } = await supabase.rpc('fn_get_agent_profile_by_profile_id', {
      p_profile_id: profileId,
    })
    if (error) this.handleError(error)
    return (data ?? null) as AgentProfileView | null
  }

  async getAgentsByOwner(ownerLenserId: string): Promise<AgentProfileView[]> {
    const { data, error } = await supabase.rpc('fn_list_agents_by_owner', {
      p_owner_lenser_id: ownerLenserId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as AgentProfileView[]
  }

  async createAgent(input: CreateAILenserInput): Promise<CreateAILenserResult> {
    const { data, error } = await supabase.rpc('fn_create_ai_lenser', {
      p_owner_lenser_id: input.owner_lenser_id,
      p_handle: input.handle,
      p_display_name: input.display_name,
      p_ai_model_id: input.ai_model_id ?? null,
    })
    if (error) this.handleError(error)
    const result = data as { profile_id: string; ai_lenser_id: string; status: string }
    return { profile_id: result.profile_id, ai_lenser_id: result.ai_lenser_id }
  }

  async recordAction(input: AgentActionInput): Promise<AgentActionResponse> {
    const { data, error } = await supabase.rpc('fn_agent_action', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_action_type: input.action_type,
      p_context_type: input.context_type ?? null,
      p_context_id: input.context_id ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) this.handleError(error)
    return data as AgentActionResponse
  }

  async getActionLogs(aiLenserId: string, limit = 50): Promise<AgentActionLogRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_action_logs', {
      p_ai_lenser_id: aiLenserId,
      p_limit: limit,
    })
    if (error) this.handleError(error)
    return (data ?? []) as AgentActionLogRecord[]
  }

  async getAutomationFeed(
    aiLenserId: string,
    limit = 100,
    offset = 0
  ): Promise<AgentAutomationFeedItem[]> {
    const { data, error } = await supabase.rpc('fn_get_agent_automation_feed', {
      p_ai_lenser_id: aiLenserId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)
    return ((data ?? []) as AgentAutomationFeedItem[]).map((item) => ({
      ...item,
      payload: (item.payload ?? {}) as Record<string, unknown>,
    }))
  }

  async getQuotaSnapshot(aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null> {
    const periodDate = date ?? new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase.rpc('fn_get_agent_quota_snapshot', {
      p_ai_lenser_id: aiLenserId,
      p_period_date: periodDate,
    })
    if (error) this.handleError(error)
    const rows = (data ?? []) as AgentQuotaSnapshotRecord[]
    return rows[0] ?? null
  }

  async getLensBindings(aiLenserId: string, limit = 50, offset = 0): Promise<AgentLensBindingRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_lens_bindings', {
      p_ai_lenser_id: aiLenserId,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) this.handleError(error)
    return (data ?? []) as AgentLensBindingRecord[]
  }

  async getModelBindings(aiLenserId: string, limit = 50, offset = 0): Promise<AgentModelBindingRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_model_bindings', {
      p_ai_lenser_id: aiLenserId,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) this.handleError(error)
    return (data ?? []) as AgentModelBindingRecord[]
  }

  async setMainLensBinding(
    aiLenserId: string,
    lensId: string,
    versionId?: string | null,
    categoryTags: string[] = []
  ): Promise<AgentLensBindingRecord | null> {
    const { data, error } = await supabase.rpc('fn_upsert_agent_lens_binding', {
      p_ai_lenser_id:  aiLenserId,
      p_lens_id:       lensId,
      p_version_id:    versionId ?? null,
      p_is_default:    true,
      p_category_tags: categoryTags,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as AgentLensBindingRecord | null
  }

  async setDefaultModelBinding(aiLenserId: string, modelId: string): Promise<AgentModelBindingRecord | null> {
    const { data, error } = await supabase.rpc('fn_upsert_agent_model_binding', {
      p_ai_lenser_id: aiLenserId,
      p_model_id: modelId,
      p_is_default: true,
    })

    if (error) this.handleError(error)
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as AgentModelBindingRecord | null
  }

  async updatePolicy(
    aiLenserId: string,
    policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_update_agent_policy', {
      p_ai_lenser_id: aiLenserId,
      p_patch: policy,
    })

    if (error) this.handleError(error)
  }

  async updateAgentProfile(profileId: string, patch: AgentProfilePatch): Promise<void> {
    const { error } = await supabase.rpc('fn_update_agent_profile', {
      p_ai_lenser_id: profileId,
      p_patch: patch,
    })
    if (error) this.handleError(error)
  }

  async updatePersonality(aiLenserId: string, note: string | null): Promise<void> {
    const { error } = await supabase.rpc('fn_update_agent_personality', {
      p_ai_lenser_id: aiLenserId,
      p_personality_note: note,
    })
    if (error) this.handleError(error)
  }
}
