export type AgentWorkspaceStatus = 'active' | 'paused' | 'archived'
export type AgentTeamEdgeType =
  | 'delegates'
  | 'reviews'
  | 'reports_to'
  | 'shares_context'
  | 'handoff'
export type AgentAssignmentKind = 'agent' | 'team' | 'evaluator'
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked'
export type AgentApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required'
export type AgentRunStepStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped'

export interface AgentTeamRecord {
  id: string
  ai_lenser_id: string
  name: string
  description: string | null
  status: AgentWorkspaceStatus
  scratchpad: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentTeamMemberRecord {
  id: string
  team_id: string
  agent_id: string
  role: string
  responsibility: string
  lane: number
  personality_profile_id: string | null
  memory_profile_id: string | null
  tool_profile_id: string | null
  model_profile_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentTeamEdgeRecord {
  id: string
  team_id: string
  source_member_id: string
  target_member_id: string
  edge_type: AgentTeamEdgeType
  is_blocking: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentPersonalityProfileRecord {
  id: string
  ai_lenser_id: string
  name: string
  tone: string
  expertise_level: string
  risk_tolerance: string
  autonomy_level: string
  communication_style: string
  decision_style: string
  escalation_behavior: string
  system_prompt_patch: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AgentMemoryProfileRecord {
  id: string
  ai_lenser_id: string
  name: string
  scope_type: string
  isolation_mode: string
  retention_days: number
  visibility: string
  summary_strategy: string
  reset_policy: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export type MemoryScope = 'project' | 'conversation' | 'global'
export type MemorySource = 'user' | 'agent' | 'tool' | 'eval' | 'manual'
export type MemoryAccessAction = 'read' | 'write' | 'redact'

export interface AgentMemoryEntryRecord {
  id: string
  profile_id: string
  profile_name?: string | null
  ai_lenser_id: string
  scope: MemoryScope
  source: MemorySource
  content: string
  embedding_metadata: Record<string, unknown>
  confidence: number
  expires_at: string | null
  team_run_id: string | null
  is_redacted: boolean
  created_at: string
}

export interface AgentMemoryAccessLogRecord {
  id: string
  memory_id: string
  team_run_id: string | null
  action: MemoryAccessAction
  context: Record<string, unknown>
  accessed_at: string
}

export interface WriteMemoryEntryInput {
  profile_id: string
  scope: MemoryScope
  source: MemorySource
  content: string
  confidence?: number
  expires_at?: string | null
  team_run_id?: string | null
  metadata?: Record<string, unknown>
}

export interface ReadMemoryEntriesInput {
  profile_id: string
  scope?: MemoryScope
  limit?: number
  team_run_id?: string | null
}

export interface MemoryProfileSummary {
  profile_id: string
  count: number
  last_written_at: string | null
  scopes: Record<string, number>
}

export interface AgentToolProfileRecord {
  id: string
  ai_lenser_id: string
  name: string
  allow_tools: string[]
  deny_tools: string[]
  tool_groups: string[]
  provider_overrides: Record<string, unknown>
  requires_approval: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AgentModelProfileRecord {
  id: string
  ai_lenser_id: string
  name: string
  provider_key: string | null
  model_id: string | null
  model_key: string | null
  support_level: string
  params: Record<string, unknown>
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AgentWorkflowAssignmentRecord {
  id: string
  ai_lenser_id: string
  workflow_id: string
  assignee_kind: AgentAssignmentKind
  assignee_ai_lenser_id: string | null
  assignee_team_id: string | null
  approval_policy: Record<string, unknown>
  retry_policy: Record<string, unknown>
  failure_policy: Record<string, unknown>
  queue_policy: Record<string, unknown>
  output_destination: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentTeamRunRecord {
  id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  workflow_assignment_id: string | null
  status: AgentRunStatus
  approval_status: AgentApprovalStatus
  scratchpad: Record<string, unknown>
  metadata: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentRunStepRecord {
  id: string
  team_run_id: string
  team_member_id: string | null
  workflow_node_id: string | null
  lane: number
  title: string
  current_task: string | null
  recent_output_summary: string | null
  blocker_summary: string | null
  status: AgentRunStepStatus
  payload: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentRunEventRecord {
  id: string
  team_run_id: string
  agent_run_step_id: string | null
  event_type: string
  payload: Record<string, unknown>
  occurred_at: string
}

export interface AgentWorkspaceBootstrap {
  profile_id: string
  ai_lenser_id: string
  teams: Array<
    AgentTeamRecord & {
      member_count: number
      members?: AgentTeamMemberRecord[]
      edges?: AgentTeamEdgeRecord[]
    }
  >
  runs: AgentTeamRunRecord[]
  profiles: {
    personality: AgentPersonalityProfileRecord[]
    memory: AgentMemoryProfileRecord[]
    tools: AgentToolProfileRecord[]
    models: AgentModelProfileRecord[]
  }
  workflow_assignments: AgentWorkflowAssignmentRecord[]
}

export interface ProviderConfigRecord {
  id: string
  ai_lenser_id: string
  provider_key: string
  ai_key_id: string | null
  base_url: string | null
  status: 'healthy' | 'error' | 'unconfigured'
  last_checked_at: string | null
  configured_at: string | null
  created_at: string
  updated_at: string
}
