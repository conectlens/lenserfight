export const AUTOMATION_OBJECT_KINDS = [
  'lens',
  'agent',
  'agent_team',
  'tool',
  'workflow',
  'private_battle',
  'skill',
  'memory_policy',
  'evaluation',
  'run_report',
] as const

export type AutomationObjectKind = (typeof AUTOMATION_OBJECT_KINDS)[number]

export const AUTOMATION_VISIBILITIES = ['private', 'workspace', 'public'] as const
export type AutomationObjectVisibility = (typeof AUTOMATION_VISIBILITIES)[number]

export const AUTOMATION_OBJECT_STATUSES = ['draft', 'active', 'archived'] as const
export type AutomationObjectStatus = (typeof AUTOMATION_OBJECT_STATUSES)[number]

export const PERMISSION_LEVELS = [
  'read',
  'suggest',
  'draft',
  'simulate',
  'execute',
  'modify',
  'publish',
  'external_action',
  'admin',
] as const

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number]

export const ACTION_CATEGORIES = [
  'safe_read',
  'safe_draft',
  'internal_execution',
  'cost_incurring_execution',
  'external_write',
  'public_publish',
  'destructive_action',
  'admin_action',
] as const

export type ActionCategory = (typeof ACTION_CATEGORIES)[number]

export const TOOL_RISK_LEVELS = ['safe', 'guarded', 'sensitive', 'destructive'] as const
export type ToolRiskLevel = (typeof TOOL_RISK_LEVELS)[number]

export const TOOL_COST_LEVELS = ['low', 'medium', 'high'] as const
export type ToolCostLevel = (typeof TOOL_COST_LEVELS)[number]

export const EXECUTION_RUNTIMES = ['local', 'cloud', 'hybrid'] as const
export type ExecutionRuntime = (typeof EXECUTION_RUNTIMES)[number]

export interface AutomationObjectOwner {
  workspace_id: string
  created_by?: string
}

export interface AutomationObjectFrontmatter {
  kind: AutomationObjectKind
  schema_version: number
  id: string
  slug?: string
  name?: string
  owner?: AutomationObjectOwner
  visibility?: AutomationObjectVisibility
  status?: AutomationObjectStatus
  version?: string
  tags?: string[]
  description?: string
}

export interface AutomationMarkdownDocument<TFrontmatter = AutomationObjectFrontmatter> {
  filePath?: string
  frontmatter: TFrontmatter
  body: string
  sections: Record<string, string>
}

export interface AutomationValidationIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export interface AutomationValidationResult<TFrontmatter = AutomationObjectFrontmatter> {
  ok: boolean
  kind?: AutomationObjectKind
  document?: AutomationMarkdownDocument<TFrontmatter>
  issues: AutomationValidationIssue[]
}

export interface ExecutionPolicy {
  autonomy?: 'manual' | 'assisted' | 'semi_autonomous' | 'autonomous_with_gates'
  approval_required_actions?: string[]
  blocked_actions?: string[]
  max_cost_per_run_usd?: number
  max_cost_per_day_usd?: number
}

export interface MemoryScopeAccess {
  readable: string[]
  writable: string[]
}

export interface DraftObjectRef {
  kind: AutomationObjectKind
  id: string
  path?: string
}

export interface RunArtifactRef {
  id: string
  kind: 'text' | 'json' | 'image' | 'video' | 'audio' | 'file'
  path?: string
  url?: string
}

export interface ApprovalTicket {
  id: string
  workspace_id: string
  action: string
  requested_by_actor_type: 'human' | 'agent'
  requested_by_actor_id: string
  target_kind: AutomationObjectKind | 'workspace'
  target_id: string
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  justification?: string
  decided_by?: string
  decided_at?: string
}

export interface AgentModelPolicy {
  mode: 'single' | 'multi' | 'dynamic'
  preferred_models: string[]
  fallback_models?: string[]
  provider_preferences?: string[]
  runtime?: ExecutionRuntime
}

export interface AgentToolPolicy {
  allow?: string[]
  deny?: string[]
  groups?: string[]
  approval_required?: string[]
}

export interface AgentWorkspacePermissions {
  read_scopes: string[]
  write_scopes?: string[]
}

export interface AgentSafetyBoundaries {
  blocked_actions?: string[]
  cost_limits?: Record<string, number>
  destructive_rules?: string[]
}

export interface AgentFrontmatter extends AutomationObjectFrontmatter {
  kind: 'agent'
  role?: string
  capabilities?: string[]
  model_policy?: AgentModelPolicy
  tool_policy?: AgentToolPolicy
  memory_policy_ref?: string
  workspace_permissions?: AgentWorkspacePermissions
  allowed_actions?: PermissionLevel[]
  evaluation_policy_ref?: string
  safety_boundaries?: AgentSafetyBoundaries
  team_membership?: string[]
}

export interface AgentTeamMemberDefinition {
  agent_id: string
  role: string
  responsibilities?: string[]
}

export interface AgentTeamFrontmatter extends AutomationObjectFrontmatter {
  kind: 'agent_team'
  purpose?: string
  team_lead_agent?: string
  members?: AgentTeamMemberDefinition[]
  shared_tools?: string[]
  shared_memory_policy_ref?: string
  workflow_ownership?: string[]
}

export interface ToolFrontmatter extends AutomationObjectFrontmatter {
  kind: 'tool'
  category?: string
  auth?: Record<string, unknown>
  permission_level?: PermissionLevel
  cost_level?: ToolCostLevel
  risk_level?: ToolRiskLevel
  rate_limits?: Record<string, unknown>
  logging?: Record<string, unknown>
  approval_rules?: string[]
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
}

export interface WorkflowStepDefinition {
  id: string
  type: string
  agent_ref?: string
  tool_ref?: string
  workflow_ref?: string
}

export interface WorkflowFrontmatter extends AutomationObjectFrontmatter {
  kind: 'workflow'
  workflow_type?: 'manual' | 'scheduled' | 'event_triggered' | 'agent_initiated' | 'tool_triggered' | 'evaluation' | 'private_battle' | 'report_generation'
  triggers?: Array<Record<string, unknown>>
  inputs?: Record<string, unknown>
  steps?: WorkflowStepDefinition[]
  conditions?: Array<Record<string, unknown>>
  approval_gates?: Array<Record<string, unknown> | string>
  retry_policy?: Record<string, unknown>
  evaluation?: Record<string, unknown>
  outputs?: Record<string, unknown>
  logging?: Record<string, unknown>
}

export interface PrivateBattleParticipant {
  type: 'agent' | 'workflow' | 'model' | 'prompt' | 'human'
  ref: string
  /** LLM provider for local execution (e.g. 'anthropic', 'openai', 'ollama') */
  provider?: string
  /** Model key for local execution (e.g. 'claude-sonnet-4-6') */
  model?: string
  /** Env var override for BYOK key resolution (e.g. 'MY_ANTHROPIC_KEY') */
  key_var?: string
}

export interface PrivateBattleFrontmatter extends AutomationObjectFrontmatter {
  kind: 'private_battle'
  participants?: PrivateBattleParticipant[]
  inputs_ref?: string
  evaluation_method?: string
  judge_agent_ref?: string
  human_judge_required?: boolean
  rubric_ref?: string
  metrics?: string[]
}

export interface SkillFrontmatter extends AutomationObjectFrontmatter {
  kind: 'skill'
  activation?: {
    keywords?: string[]
    requires_tools?: string[]
  }
  compatibility?: Record<string, unknown>
}

export interface MemoryPolicyFrontmatter extends AutomationObjectFrontmatter {
  kind: 'memory_policy'
  scope?: MemoryScopeAccess
  retention?: Record<string, number>
  promotion_rules?: Array<Record<string, unknown>>
  redaction_rules?: string[]
  reset_rules?: string[]
}

export interface EvaluationFrontmatter extends AutomationObjectFrontmatter {
  kind: 'evaluation'
  rubric_ref?: string
  dataset_ref?: string
  metrics?: string[]
  judge_agent_ref?: string
  thresholds?: Record<string, number>
}

export interface RunReportFrontmatter extends AutomationObjectFrontmatter {
  kind: 'run_report'
  run_id?: string
  source_kind?: AutomationObjectKind
  source_id?: string
  run_status?: 'completed' | 'failed' | 'cancelled'
  artifacts?: RunArtifactRef[]
  cost_usd?: number
  latency_ms?: number
}

export interface LensFrontmatter extends AutomationObjectFrontmatter {
  kind: 'lens'
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  evaluation_refs?: string[]
}

export interface AutomationObjectSummary {
  kind: AutomationObjectKind
  id: string
  name: string
  path?: string
  version?: string
  visibility?: AutomationObjectVisibility
  status?: string
}

export interface WorkspaceObjectQuery {
  kinds?: AutomationObjectKind[]
  query?: string
  visibility?: AutomationObjectVisibility[]
  limit?: number
}

export interface WorkspaceObjectReadRequest {
  kind: AutomationObjectKind
  id: string
}

export interface WorkspaceObjectSearchResult {
  items: AutomationObjectSummary[]
}

export interface DraftCreationRequest {
  kind: Extract<AutomationObjectKind, 'lens' | 'agent' | 'tool' | 'workflow' | 'private_battle'>
  goal: string
  inputs?: Record<string, unknown>
  tags?: string[]
}

export interface DraftCreationResult {
  draft: DraftObjectRef
  summary: string
}

export interface SimulationRequest {
  target_kind: AutomationObjectKind
  target_id: string
  inputs?: Record<string, unknown>
}

export interface SimulationResult {
  status: 'ready' | 'blocked' | 'failed'
  summary: string
  steps: string[]
}

export interface HumanApprovalRequest {
  action: string
  target_kind: AutomationObjectKind | 'workspace'
  target_id: string
  justification: string
}
