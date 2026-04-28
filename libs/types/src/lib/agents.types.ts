export type AgentRuntimePref = 'cloud' | 'local' | 'hybrid'
export type AgentOwnerRole = 'owner' | 'co_owner' | 'operator'
export type AgentModelBindingMode = 'single' | 'multi' | 'dynamic'
export type AgentActionType =
  | 'join_battle'
  | 'cast_vote'
  | 'submit_entry'
  | 'create_battle'
  | 'spend_credits'
  | 'run_lens'
  | 'run_workflow'
  | 'dispatch_schedule'
  | 'schedule_skipped'
  | 'policy_updated'
  | 'binding_updated'
export type AgentActionOutcome = 'success' | 'blocked_by_policy' | 'failed' | 'throttled'

export interface AILenserRecord {
  id: string
  profile_id: string
  runtime_pref: AgentRuntimePref
  is_active: boolean
  suspended_at: string | null
  suspended_reason: string | null
  personality_note: string | null
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

export type AgentAutomationFeedKind =
  | 'agent_action'
  | 'workflow_run'
  | 'workflow_event'
  | 'schedule_dispatch'

interface AgentAutomationFeedBase {
  kind: AgentAutomationFeedKind
  id: string
  occurred_at: string
  title: string
  result: string | null
  workflow_id: string | null
  workflow_title: string | null
  run_id: string | null
  schedule_id: string | null
  action_type: AgentActionType | null
  event_type: string | null
  payload: Record<string, unknown>
}

export interface AgentAutomationActionFeedItem extends AgentAutomationFeedBase {
  kind: 'agent_action'
  action_type: AgentActionType
  event_type: null
}

export interface AgentAutomationRunFeedItem extends AgentAutomationFeedBase {
  kind: 'workflow_run'
  action_type: null
  event_type: null
}

export interface AgentAutomationEventFeedItem extends AgentAutomationFeedBase {
  kind: 'workflow_event'
  action_type: null
  event_type: string
}

export interface AgentAutomationScheduleFeedItem extends AgentAutomationFeedBase {
  kind: 'schedule_dispatch'
  action_type: AgentActionType
  event_type: null
}

export type AgentAutomationFeedItem =
  | AgentAutomationActionFeedItem
  | AgentAutomationRunFeedItem
  | AgentAutomationEventFeedItem
  | AgentAutomationScheduleFeedItem

// ─── Approval queue (F2) ─────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required'

export type ApprovalDecision = 'approved' | 'rejected' | 'modified'

export interface ApprovalDecisionMetadata {
  decision_at?: string
  decision_by_lenser_id?: string
  decision_reason?: string | null
  decision_modifications?: Record<string, unknown>
  gate_kind?: string
  requested_action?: string
  requester_agent_id?: string
}

/**
 * Materialized projection of agents.team_runs WHERE approval_status='pending',
 * joined with the backing workflow_assignment + workflow. Returned by
 * `agentWorkspaceService.listApprovalRequests`.
 */
export interface ApprovalRequestView {
  request_id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_assignment_id: string | null
  workflow_run_id: string | null
  run_status: string
  approval_status: ApprovalStatus
  metadata: ApprovalDecisionMetadata
  gate_kind: string | null
  requested_action: string | null
  requester_agent_id: string | null
  requested_at: string
  started_at: string | null
  completed_at: string | null
  assignee_kind: 'agent' | 'team' | null
  approval_policy: Record<string, unknown> | null
  retry_policy: Record<string, unknown> | null
  failure_policy: Record<string, unknown> | null
  workflow_title: string | null
}

/**
 * Argument shape for `fn_decide_approval` / `agentWorkspaceService.decideApproval`.
 * `modifications` is required when `decision === 'modified'`.
 */
export interface ApprovalDecisionInput {
  team_run_id: string
  decision: ApprovalDecision
  reason?: string | null
  modifications?: Record<string, unknown>
}

export interface ApprovalDecisionResult {
  request_id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  workflow_assignment_id: string | null
  approval_status: 'approved' | 'rejected'
  run_status: string
  metadata: ApprovalDecisionMetadata
  decided_at: string
}

// ─── Cost summary (F4) ───────────────────────────────────────────────────────

export interface CostSummary {
  ai_lenser_id: string
  /** Total credits spent today (UTC). */
  today_credits: number
  /** Trailing 7 days inclusive of today. */
  seven_day_credits: number
  /** Trailing 30 days inclusive of today. */
  thirty_day_credits: number
  /** Total battles used today (legacy quota counter). */
  today_battles: number
  today_votes: number
  /** Allowed credits ceiling on `agents.policies`. -1 means unlimited. */
  spending_limit_credits: number | null
  /** Per-day breakdown for the last 30 days. */
  daily: Array<{
    period_date: string
    credits_spent: number
    battles_used: number
    votes_used: number
  }>
}

// ─── Cross-agent activity feed (F3) ──────────────────────────────────────────

export type CrossAgentFeedKind =
  | 'approval_pending'
  | 'team_run'
  | 'schedule_dispatch'
  | 'agent_action'

/**
 * One row of the human Lenser's cross-agent activity feed. Returned by
 * `fn_get_human_activity_feed`. The discriminant is `kind`.
 */
export interface CrossAgentFeedItem {
  occurred_at: string
  kind: CrossAgentFeedKind
  ai_lenser_id: string
  ai_lenser_handle: string
  ai_lenser_name: string
  title: string
  status: string
  team_run_id: string | null
  workflow_id: string | null
  schedule_id: string | null
  action_type: AgentActionType | null
  payload: Record<string, unknown>
}
