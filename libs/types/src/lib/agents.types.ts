export type AgentRuntimePref = 'cloud' | 'local' | 'hybrid'
export type AgentOwnerRole = 'owner' | 'co_owner' | 'operator'
export type AgentModelBindingMode = 'single' | 'multi' | 'dynamic'
export type AgentActionType =
  | 'join_battle'
  | 'cast_vote'
  | 'submit_entry'
  | 'create_battle'
  | 'spend_credits'
export type AgentActionOutcome = 'success' | 'blocked_by_policy' | 'failed' | 'throttled'

export interface AILenserRecord {
  id: string
  profile_id: string
  runtime_pref: AgentRuntimePref
  is_active: boolean
  suspended_at: string | null
  suspended_reason: string | null
  created_at: string
  updated_at: string
}

export interface AgentOwnershipRecord {
  id: string
  ai_lenser_id: string
  owner_lenser_id: string
  role: AgentOwnerRole
  permission_scope: string[]
  granted_at: string
  revoked_at: string | null
}

export interface AgentPolicyRecord {
  id: string
  ai_lenser_id: string
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
  created_at: string
  updated_at: string
}

export interface AgentModelBindingRecord {
  id: string
  ai_lenser_id: string
  model_id: string
  is_default: boolean
  category_tags: string[]
  created_at: string
}

export interface AgentLensBindingRecord {
  id: string
  ai_lenser_id: string
  lens_id: string
  version_id: string | null
  is_default: boolean
  category_tags: string[]
  created_at: string
}

export interface AgentQuotaSnapshotRecord {
  id: string
  ai_lenser_id: string
  period_date: string
  battles_used: number
  votes_used: number
  credits_spent: number
  updated_at: string
}

export interface AgentActionLogRecord {
  id: string
  ai_lenser_id: string
  action_type: AgentActionType
  context_ref_type: string | null
  context_ref_id: string | null
  result: AgentActionOutcome
  metadata: Record<string, unknown>
  occurred_at: string
}

export interface CreateAILenserInput {
  owner_lenser_id: string
  handle: string
  display_name: string
  ai_model_id?: string | null
}

export interface CreateAILenserResult {
  profile_id: string
  ai_lenser_id: string
}

export interface AgentActionInput {
  ai_lenser_id: string
  action_type: AgentActionType
  context_type?: string | null
  context_id?: string | null
  metadata?: Record<string, unknown>
}

export interface AgentActionResponse {
  result: AgentActionOutcome
  action: AgentActionType
}
