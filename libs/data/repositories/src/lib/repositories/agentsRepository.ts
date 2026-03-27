import { supabase } from '@lenserfight/data/supabase'
import {
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
  handle: string
  display_name: string
  avatar_url: string | null
  runtime_pref: AgentRuntimePref
  is_active: boolean
  suspended_at: string | null
  suspended_reason: string | null
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
  getAgentsByOwner(ownerLenserId: string): Promise<AgentProfileView[]>
  createAgent(input: CreateAILenserInput): Promise<CreateAILenserResult>
  recordAction(input: AgentActionInput): Promise<AgentActionResponse>
  getActionLogs(aiLenserId: string, limit?: number): Promise<AgentActionLogRecord[]>
  getQuotaSnapshot(aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null>
  updatePolicy(aiLenserId: string, policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>): Promise<void>
  updateAgentProfile(aiLenserId: string, patch: AgentProfilePatch): Promise<void>
}

// --- Supabase Implementation ---

export class SupabaseAgentsRepository implements AgentsRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Agent not found.')
    throw error
  }

  async getAgentProfile(aiLenserId: string): Promise<AgentProfileView | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('v_agent_profile')
      .select('*')
      .eq('id', aiLenserId)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as AgentProfileView | null
  }

  async getAgentsByOwner(ownerLenserId: string): Promise<AgentProfileView[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('v_agent_profile')
      .select('*')
      .eq('owner_lenser_id', ownerLenserId)

    if (error) this.handleError(error)
    return (data ?? []) as AgentProfileView[]
  }

  async createAgent(input: CreateAILenserInput): Promise<CreateAILenserResult> {
    const { data, error } = await supabase.schema('agents').rpc('fn_create_ai_lenser', {
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
    const { data, error } = await supabase
      .schema('agents')
      .from('action_logs')
      .select('id, ai_lenser_id, action_type, context_ref_type, context_ref_id, result, metadata, occurred_at')
      .eq('ai_lenser_id', aiLenserId)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (error) this.handleError(error)
    return (data ?? []) as AgentActionLogRecord[]
  }

  async getQuotaSnapshot(aiLenserId: string, date?: string): Promise<AgentQuotaSnapshotRecord | null> {
    const periodDate = date ?? new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .schema('agents')
      .from('quota_snapshots')
      .select('id, ai_lenser_id, period_date, battles_used, votes_used, credits_spent, updated_at')
      .eq('ai_lenser_id', aiLenserId)
      .eq('period_date', periodDate)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as AgentQuotaSnapshotRecord | null
  }

  async updatePolicy(
    aiLenserId: string,
    policy: Partial<Omit<AgentPolicyRecord, 'id' | 'ai_lenser_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .schema('agents')
      .from('policies')
      .update({ ...policy, updated_at: new Date().toISOString() })
      .eq('ai_lenser_id', aiLenserId)

    if (error) this.handleError(error)
  }

  async updateAgentProfile(aiLenserId: string, patch: AgentProfilePatch): Promise<void> {
    const { error } = await supabase.rpc('fn_update_agent_profile', {
      p_ai_lenser_id: aiLenserId,
      p_patch: patch,
    })
    if (error) this.handleError(error)
  }
}
