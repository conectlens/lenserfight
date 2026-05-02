export type AgentRuntimePref = 'cloud' | 'local' | 'hybrid'
export type AgentOwnerRole = 'owner' | 'co_owner' | 'operator'
export type AgentPermissionScope =
  | 'approvals:decide'
  | 'team:manage'
  | 'workflow:assign'
  | 'schedule:manage'
  | 'memory:manage'
  | 'tools:manage'
  | 'models:manage'
  | 'settings:manage'
  | 'logs:view'
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
  permission_scope: AgentPermissionScope[]
  granted_at: string
  revoked_at: string | null
}

export interface AgentOwnershipDelegateRecord extends AgentOwnershipRecord {
  owner_handle: string | null
  owner_display_name: string | null
  owner_avatar_url: string | null
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

// ─── Scratchpad runs (F-PHASE2) ──────────────────────────────────────────────

export type ScratchpadRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ScratchpadCanvasState {
  nodes: Array<{
    id: string
    x: number
    y: number
    label: string
  }>
  edges: Array<{
    id: string
    source: string
    target: string
  }>
}

export interface ScratchpadRunMetadata {
  instruction_lens_id?: string | null
  instruction_version_id?: string | null
  canvas_state?: ScratchpadCanvasState | null
  [key: string]: unknown
}

export interface ScratchpadRunRecord {
  id: string
  ai_lenser_id: string
  actor_lenser_id: string
  prompt: string
  model_id: string | null
  tool_calls: Array<Record<string, unknown>>
  output: string | null
  status: ScratchpadRunStatus
  error: string | null
  cost_credits: number
  metadata: ScratchpadRunMetadata
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface CreateScratchpadRunInput {
  ai_lenser_id: string
  prompt: string
  model_id?: string | null
  metadata?: ScratchpadRunMetadata
}

export interface CompleteScratchpadRunInput {
  run_id: string
  output: string
  status?: ScratchpadRunStatus
  cost_credits?: number
  error?: string | null
}

// ─── Evaluations (F-PHASE2) ──────────────────────────────────────────────────

export type EvaluationTargetType = 'lens' | 'workflow' | 'agent' | 'team'
export type EvaluationRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface EvaluationRecord {
  id: string
  owner_lenser_id: string
  ai_lenser_id: string | null
  target_type: EvaluationTargetType
  target_id: string
  name: string
  description: string | null
  scoring_rules: Record<string, unknown>
  dataset_uri: string | null
  created_at: string
  updated_at: string
}

export interface EvaluationCaseRecord {
  id: string
  evaluation_id: string
  input: Record<string, unknown>
  expected: Record<string, unknown> | null
  weight: number
  tags: string[]
  created_at: string
}

export interface EvaluationRunRecord {
  id: string
  evaluation_id: string
  model_id: string | null
  status: EvaluationRunStatus
  score: number | null
  summary: Record<string, unknown>
  started_at: string
  completed_at: string | null
  rubric_id: string | null
}

export interface EvaluationCaseResultRow {
  result_id: string
  run_id: string
  evaluation_id: string
  run_status: EvaluationRunStatus
  run_score: number | null
  started_at: string
  completed_at: string | null
  case_id: string
  input: Record<string, unknown>
  expected: Record<string, unknown> | null
  weight: number
  tags: string[]
  case_score: number | null
  case_output: Record<string, unknown> | null
  case_error: string | null
  passed: boolean | null
}

export type EvaluationRubricCriterionOperator = '>=' | '<=' | '=='

export interface EvaluationRubricCriterion {
  name: string
  weight: number
  threshold: number
  operator: EvaluationRubricCriterionOperator
}

export interface EvaluationRubricRecord {
  id: string
  evaluation_id: string
  version: number
  criteria: EvaluationRubricCriterion[]
  is_current: boolean
  created_at: string
}

export interface EvaluationBaselineRecord {
  id: string
  evaluation_id: string
  run_id: string
  score: number | null
  set_at: string
  set_by: string | null
}

export interface CreateEvaluationInput {
  owner_lenser_id: string
  ai_lenser_id?: string | null
  target_type: EvaluationTargetType
  target_id: string
  name: string
  description?: string | null
  scoring_rules?: Record<string, unknown>
  dataset_uri?: string | null
  cases?: Array<Pick<EvaluationCaseRecord, 'input' | 'expected' | 'weight' | 'tags'>>
}

// ─── Tools registry (F-PHASE2) ───────────────────────────────────────────────

export type ToolAuthMethod = 'none' | 'api_key' | 'oauth' | 'service_account'
export type ToolStatus = 'active' | 'disabled' | 'deprecated'
export type EgressClass = 'none' | 'read_only' | 'write'

export interface ToolRegistryRecord {
  id: string
  owner_lenser_id: string
  key: string
  name: string
  description: string | null
  category: string
  schema_input: Record<string, unknown>
  schema_output: Record<string, unknown>
  auth_method: ToolAuthMethod
  requires_approval: boolean
  is_dangerous: boolean
  status: ToolStatus
  egress_class?: EgressClass
  created_at: string
  updated_at: string
}

export interface ToolAssignmentRecord {
  id: string
  ai_lenser_id: string
  tool_id: string
  profile_id: string | null
  allowed: boolean
  created_at: string
}

export interface RegisterToolInput {
  key: string
  name: string
  description?: string | null
  category?: string
  schema_input?: Record<string, unknown>
  schema_output?: Record<string, unknown>
  auth_method?: ToolAuthMethod
  requires_approval?: boolean
  is_dangerous?: boolean
}

export interface AssignToolInput {
  ai_lenser_id: string
  tool_id: string
  profile_id?: string | null
  allowed?: boolean
}

// ─── Tool invocations (Phase 7) ─────────────────────────────────────────────

export type ToolInvocationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'

export type ToolInvocationApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'not_required'

export interface ToolInvocationRecord {
  id: string
  team_run_id: string
  agent_run_step_id: string | null
  tool_id: string
  ai_lenser_id: string
  tool_key?: string
  tool_name?: string
  tool_category?: string
  egress_class?: EgressClass
  is_dangerous?: boolean
  step_title?: string | null
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  status: ToolInvocationStatus
  approval_status: ToolInvocationApprovalStatus
  approval_required: boolean
  approval_decided_by: string | null
  approval_reason: string | null
  error: string | null
  cost_estimate: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface InvokeToolInput {
  team_run_id: string
  tool_id: string
  ai_lenser_id: string
  input: Record<string, unknown>
  agent_run_step_id?: string | null
}

export interface CompleteToolInvocationInput {
  invocation_id: string
  status: 'completed' | 'failed'
  output?: Record<string, unknown> | null
  error?: string | null
  cost_estimate?: number | null
}

export interface ListToolInvocationsOptions {
  ai_lenser_id?: string
  team_run_id?: string
  status?: ToolInvocationStatus
  approval_status?: ToolInvocationApprovalStatus
  limit?: number
}

// ─── Fleet aggregations (F-PHASE2) ───────────────────────────────────────────

export interface FleetOverview {
  human_lenser_id: string
  agents_total: number
  agents_active: number
  credits_30d: number
  runs_24h: number
  approvals_pending: number
  schedules_active: number
}

export interface FleetRunRow {
  human_lenser_id: string
  run_id: string
  ai_lenser_id: string
  agent_handle: string
  team_id: string | null
  workflow_id: string | null
  status: string
  approval_status: string | null
  metadata: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface FleetLogRow {
  human_lenser_id: string
  event_id: string
  team_run_id: string
  ai_lenser_id: string
  agent_handle: string
  event_type: string
  payload: Record<string, unknown>
  occurred_at: string
}

// ─── Workspace settings (F-PHASE2) ───────────────────────────────────────────

export type ApprovalDefault = 'auto' | 'require_human' | 'deny'

export interface WorkspaceSettingsRecord {
  ai_lenser_id: string
  default_model_id: string | null
  default_provider_key: string | null
  approval_default: ApprovalDefault
  retention_days: number
  max_daily_credits: number
  webhooks: Array<{ url: string; events?: string[] }>
  api_access_enabled: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Phase 8: Autonomous Agent OS controls
  max_parallel_runs: number
  global_kill_switch: boolean
  agent_paused: boolean
  dark_launch_enabled: boolean
  dark_launch_pct: number
  budget_enforce: boolean
}

export interface UpdateWorkspaceSettingsPatch {
  default_model_id?: string | null
  default_provider_key?: string | null
  approval_default?: ApprovalDefault
  retention_days?: number
  max_daily_credits?: number
  webhooks?: Array<{ url: string; events?: string[] }>
  api_access_enabled?: boolean
  metadata?: Record<string, unknown>
  max_parallel_runs?: number
  global_kill_switch?: boolean
  agent_paused?: boolean
  dark_launch_enabled?: boolean
  dark_launch_pct?: number
  budget_enforce?: boolean
}

// ─── Phase 8: Autonomous Agent OS ────────────────────────────────────────────

export type RunOutcome = 'success' | 'partial' | 'failed' | 'cancelled' | 'killed'

export type RunIncidentType =
  | 'tool_failure'
  | 'budget_exceeded'
  | 'policy_violation'
  | 'timeout'
  | 'step_failure'
  | 'approval_rejected'
  | 'kill_switch'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export type PolicyEvaluationPoint = 'pre_run' | 'pre_side_effect' | 'pre_tool'

export type PolicyType =
  | 'budget'
  | 'kill_switch'
  | 'pause'
  | 'parallel_limit'
  | 'dark_launch'
  | 'approval'

export type PolicyVerdict = 'allow' | 'deny' | 'pause' | 'require_approval'

export interface RunReportRecord {
  id: string
  ai_lenser_id: string
  team_run_id: string | null
  workflow_run_id: string | null
  title: string
  summary: string | null
  metrics: Record<string, unknown>
  total_steps: number
  total_tool_invocations: number
  total_memory_writes: number
  total_cost_estimate: number
  evaluation_score: number | null
  outcome: RunOutcome
  created_at: string
}

export interface RunIncidentRecord {
  id: string
  run_report_id: string
  ai_lenser_id: string
  incident_type: RunIncidentType
  severity: IncidentSeverity
  title: string
  description: string | null
  context: Record<string, unknown>
  resolved_at: string | null
  resolution: string | null
  created_at: string
}

export interface PolicyEvaluationRecord {
  id: string
  ai_lenser_id: string
  team_run_id: string | null
  tool_invocation_id: string | null
  evaluation_point: PolicyEvaluationPoint
  policy_type: PolicyType
  verdict: PolicyVerdict
  reason: string | null
  context: Record<string, unknown>
  evaluated_at: string
}

export interface PolicyVerdictResult {
  verdict: PolicyVerdict
  reason: string | null
}

export interface RunUnifiedRow {
  run_id: string
  run_type: 'team' | 'workflow'
  ai_lenser_id: string
  status: string
  approval_status: string | null
  total_cost: number
  step_count: number
  memory_write_count: number
  latest_evaluation_score: number | null
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
}

export interface RecordRunIncidentInput {
  run_report_id: string
  incident_type: RunIncidentType
  severity: IncidentSeverity
  title: string
  description?: string | null
  context?: Record<string, unknown>
}
