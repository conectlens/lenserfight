import { supabase } from '@lenserfight/data/supabase'
import type {
  AgentOwnershipDelegateRecord,
  AgentOwnerRole,
  AgentPermissionScope,
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentPersonalityProfileRecord,
  AgentRunEventRecord,
  AgentRunStepRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentTeamRunRecord,
  AgentToolProfileRecord,
  AgentWorkflowAssignmentRecord,
  AgentWorkspaceBootstrap,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
  ApprovalRequestView,
  ApprovalStatus,
  AssignToolInput,
  CompleteScratchpadRunInput,
  CostSummary,
  CreateEvaluationInput,
  CreateScratchpadRunInput,
  CrossAgentFeedItem,
  EvaluationBaselineRecord,
  EvaluationCaseRecord,
  EvaluationCaseResultRow,
  EvaluationRecord,
  EvaluationRunRecord,
  EvaluationRubricCriterion,
  EvaluationRubricRecord,
  FleetLogRow,
  FleetOverview,
  FleetRunRow,
  ProviderConfigRecord,
  RegisterToolInput,
  ScratchpadRunRecord,
  ToolAssignmentRecord,
  ToolRegistryRecord,
  UpdateWorkspaceSettingsPatch,
  WorkspaceSettingsRecord,
} from '@lenserfight/types'

export interface CreateAgentTeamInput {
  ai_lenser_id: string
  name: string
  description?: string | null
  status?: 'active' | 'paused'
  is_active?: boolean
  initial_members?: Array<{
    agent_id: string
    role: string
    responsibility?: string | null
    lane?: number
    sort_order?: number
  }>
}

export interface CreateAgentPersonalityProfileInput {
  ai_lenser_id: string
  name: string
  tone: string
  expertise_level: string
  risk_tolerance: string
  autonomy_level: string
  communication_style: string
  decision_style: string
  escalation_behavior: string
  system_prompt_patch?: string
}

export interface CreateAgentMemoryProfileInput {
  ai_lenser_id: string
  name: string
  scope_type: string
  isolation_mode: string
  retention_days: number
  visibility: string
  summary_strategy: string
  reset_policy: string
}

export interface CreateAgentToolProfileInput {
  ai_lenser_id: string
  name: string
  allow_tools?: string[]
  deny_tools?: string[]
  tool_groups?: string[]
  provider_overrides?: Record<string, unknown>
  requires_approval?: boolean
}

export interface CreateAgentModelProfileInput {
  ai_lenser_id: string
  name: string
  provider_key?: string | null
  model_id?: string | null
  model_key?: string | null
  support_level?: string
  params?: Record<string, unknown>
}

export interface ListApprovalRequestsOptions {
  status?: ApprovalStatus
  limit?: number
}

export interface CreateWorkflowAssignmentInput {
  ai_lenser_id: string
  workflow_id: string
  assignee_kind: 'agent' | 'team' | 'evaluator'
  assignee_ai_lenser_id?: string | null
  assignee_team_id?: string | null
  approval_policy?: Record<string, unknown>
  retry_policy?: Record<string, unknown>
  failure_policy?: Record<string, unknown>
  is_active?: boolean
}

export interface CreateTeamRunInput {
  ai_lenser_id: string
  workflow_id: string
  workflow_run_id: string
  workflow_assignment_id: string
  team_id?: string | null
  approval_status: string
}

export interface UpsertAgentRunStepInput {
  team_run_id: string
  workflow_node_id: string
  lane: number
  title: string
  status: string
  current_task?: string | null
  recent_output_summary?: string | null
  blocker_summary?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface CreateEvaluationCaseInput {
  evaluation_id: string
  input: Record<string, unknown>
  expected?: Record<string, unknown> | null
  weight?: number
  tags?: string[]
}

export interface UpsertAgentOwnershipInput {
  ai_lenser_id: string
  owner_lenser_id: string
  role: AgentOwnerRole
  permission_scope?: AgentPermissionScope[]
}

export interface AgentWorkspaceRepositoryPort {
  getWorkspaceBootstrap(handle: string): Promise<AgentWorkspaceBootstrap | null>
  createTeam(input: CreateAgentTeamInput): Promise<AgentTeamRecord | null>
  listTeamMembers(teamId: string): Promise<AgentTeamMemberRecord[]>
  listTeamEdges(teamId: string): Promise<AgentTeamEdgeRecord[]>
  createPersonalityProfile(input: CreateAgentPersonalityProfileInput): Promise<AgentPersonalityProfileRecord | null>
  createMemoryProfile(input: CreateAgentMemoryProfileInput): Promise<AgentMemoryProfileRecord | null>
  createToolProfile(input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null>
  createModelProfile(input: CreateAgentModelProfileInput): Promise<AgentModelProfileRecord | null>
  listApprovalRequests(aiLenserId: string, options?: ListApprovalRequestsOptions): Promise<ApprovalRequestView[]>
  getApprovalRequest(requestId: string): Promise<ApprovalRequestView | null>
  decideApproval(input: ApprovalDecisionInput): Promise<ApprovalDecisionResult>
  getHumanActivityFeed(humanLenserId: string, limit?: number, offset?: number): Promise<CrossAgentFeedItem[]>
  getCostSummary(aiLenserId: string): Promise<CostSummary>
  listAgentOwnerships(aiLenserId: string): Promise<AgentOwnershipDelegateRecord[]>
  upsertAgentOwnership(input: UpsertAgentOwnershipInput): Promise<AgentOwnershipDelegateRecord>
  revokeAgentOwnership(ownershipId: string): Promise<void>

  // Scratchpad
  listScratchpadRuns(aiLenserId: string, limit?: number): Promise<ScratchpadRunRecord[]>
  createScratchpadRun(input: CreateScratchpadRunInput): Promise<ScratchpadRunRecord>
  completeScratchpadRun(input: CompleteScratchpadRunInput): Promise<ScratchpadRunRecord>
  promoteScratchpadToMemory(runId: string, memoryProfileId: string): Promise<AgentMemoryProfileRecord>

  // Evaluations
  listEvaluations(ownerLenserId: string): Promise<EvaluationRecord[]>
  createEvaluation(input: CreateEvaluationInput): Promise<EvaluationRecord>
  runEvaluation(evaluationId: string, modelId?: string | null): Promise<string>
  getEvaluationResults(runId: string): Promise<EvaluationCaseResultRow[]>
  listEvaluationRuns(evaluationId: string): Promise<EvaluationRunRecord[]>

  // Tools registry
  listToolRegistry(ownerLenserId: string): Promise<ToolRegistryRecord[]>
  registerTool(input: RegisterToolInput): Promise<ToolRegistryRecord>
  assignTool(input: AssignToolInput): Promise<ToolAssignmentRecord>
  revokeTool(aiLenserId: string, toolId: string): Promise<void>
  listToolAssignments(aiLenserId: string): Promise<ToolAssignmentRecord[]>

  // Fleet aggregations
  getFleetOverview(humanLenserId: string): Promise<FleetOverview | null>
  listFleetRuns(humanLenserId: string, opts?: { status?: string; agentId?: string; since?: string; limit?: number; offset?: number }): Promise<FleetRunRow[]>
  listFleetLogs(humanLenserId: string, opts?: { runId?: string; eventType?: string; limit?: number; offset?: number }): Promise<FleetLogRow[]>
  listAgentRunEvents(aiLenserId: string, opts?: { runId?: string; eventType?: string; limit?: number }): Promise<AgentRunEventRecord[]>

  // Provider configs (BYOK)
  listProviderConfigs(aiLenserId: string): Promise<ProviderConfigRecord[]>
  configureProvider(aiLenserId: string, providerKey: string, apiKey: string, baseUrl?: string | null): Promise<ProviderConfigRecord>
  testProvider(aiLenserId: string, providerKey: string): Promise<{ status: 'healthy' | 'error'; message: string }>

  // Workspace settings
  getWorkspaceSettings(aiLenserId: string): Promise<WorkspaceSettingsRecord | null>
  updateWorkspaceSettings(aiLenserId: string, patch: UpdateWorkspaceSettingsPatch): Promise<WorkspaceSettingsRecord>
  exportWorkspace(aiLenserId: string): Promise<Record<string, unknown>>
  requestWorkspaceDeletion(aiLenserId: string, reason?: string | null): Promise<WorkspaceSettingsRecord>

  // Mutations on existing per-agent profiles
  listMemoryProfiles(aiLenserId: string): Promise<AgentMemoryProfileRecord[]>
  updateMemoryProfile(id: string, patch: Partial<AgentMemoryProfileRecord>): Promise<AgentMemoryProfileRecord>
  deleteMemoryProfile(id: string): Promise<void>
  updatePersonalityProfile(id: string, patch: Partial<AgentPersonalityProfileRecord>): Promise<AgentPersonalityProfileRecord>
  deletePersonalityProfile(id: string): Promise<void>
  updateToolProfile(id: string, patch: Partial<AgentToolProfileRecord>): Promise<AgentToolProfileRecord>
  deleteToolProfile(id: string): Promise<void>
  updateModelProfile(id: string, patch: Partial<AgentModelProfileRecord>): Promise<AgentModelProfileRecord>
  deleteModelProfile(id: string): Promise<void>

  // Team mutations
  updateTeam(id: string, patch: Partial<AgentTeamRecord>): Promise<AgentTeamRecord>
  deleteTeam(id: string): Promise<void>
  addTeamMember(input: { team_id: string; agent_id: string; role: string; responsibility?: string | null; lane?: number; sort_order?: number }): Promise<AgentTeamMemberRecord>
  updateTeamMember(id: string, patch: Partial<AgentTeamMemberRecord>): Promise<AgentTeamMemberRecord>
  deleteTeamMember(id: string): Promise<void>
  upsertTeamEdge(input: { team_id: string; source_member_id: string; target_member_id: string; edge_type: string; is_blocking?: boolean }): Promise<AgentTeamEdgeRecord>
  deleteTeamEdge(id: string): Promise<void>

  // Run step inspection
  listAgentRunSteps(aiLenserId: string, runId: string): Promise<AgentRunStepRecord[]>
  cancelAgentRun(aiLenserId: string, runId: string): Promise<void>
  retryAgentRun(aiLenserId: string, runId: string): Promise<string>

  // Workflow assignments
  listWorkflowAssignments(aiLenserId: string): Promise<AgentWorkflowAssignmentRecord[]>
  createWorkflowAssignment(input: CreateWorkflowAssignmentInput): Promise<AgentWorkflowAssignmentRecord>
  updateWorkflowAssignment(id: string, patch: Partial<AgentWorkflowAssignmentRecord>): Promise<AgentWorkflowAssignmentRecord>
  deleteWorkflowAssignment(id: string): Promise<void>

  // Team run lifecycle (called by dispatch hook)
  createTeamRun(input: CreateTeamRunInput): Promise<AgentTeamRunRecord>
  updateTeamRunStatus(runId: string, status: string, completedAt?: string): Promise<void>
  appendTeamRunEvent(teamRunId: string, eventType: string, payload: Record<string, unknown>): Promise<void>
  upsertAgentRunStep(input: UpsertAgentRunStepInput): Promise<AgentRunStepRecord>

  // Evaluation cases
  listEvaluationCases(evaluationId: string): Promise<EvaluationCaseRecord[]>
  createEvaluationCase(input: CreateEvaluationCaseInput): Promise<EvaluationCaseRecord>
  deleteEvaluationCase(id: string): Promise<void>

  // Evaluation rubrics (versioned scoring criteria)
  listEvaluationRubrics(evaluationId: string): Promise<EvaluationRubricRecord[]>
  createEvaluationRubric(evaluationId: string, criteria: EvaluationRubricCriterion[]): Promise<EvaluationRubricRecord>

  // Evaluation baselines (golden-run snapshots)
  getEvaluationBaseline(evaluationId: string): Promise<EvaluationBaselineRecord | null>
  setEvaluationBaseline(evaluationId: string, runId: string): Promise<EvaluationBaselineRecord>

  // Post-run evaluation trigger
  triggerPostRunEvaluations(workflowId: string, teamRunId: string): Promise<void>
}

export class SupabaseAgentWorkspaceRepository implements AgentWorkspaceRepositoryPort {
  async getWorkspaceBootstrap(handle: string): Promise<AgentWorkspaceBootstrap | null> {
    const { data, error } = await supabase.rpc('fn_get_agent_workspace_bootstrap', {
      p_profile_handle: handle,
    })

    if (error) {
      console.warn('fn_get_agent_workspace_bootstrap failed', error)
      throw error
    }

    return (data as AgentWorkspaceBootstrap | null) ?? null
  }

  async createTeam(input: CreateAgentTeamInput): Promise<AgentTeamRecord | null> {
    const { data, error } = await supabase.rpc('fn_create_agent_team', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_name: input.name,
      p_description: input.description ?? null,
      p_initial_members: (input.initial_members ?? []).map((member, index) => ({
        agent_id: member.agent_id,
        role: member.role,
        responsibility: member.responsibility ?? null,
        lane: member.lane ?? 0,
        sort_order: member.sort_order ?? index,
      })),
    })

    if (error) throw error
    return (data as AgentTeamRecord | null) ?? null
  }

  async listTeamMembers(teamId: string): Promise<AgentTeamMemberRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_team_members', {
      p_team_id: teamId,
    })

    if (error) throw error
    return (data ?? []) as AgentTeamMemberRecord[]
  }

  async listTeamEdges(teamId: string): Promise<AgentTeamEdgeRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_team_edges', {
      p_team_id: teamId,
    })

    if (error) throw error
    return (data ?? []) as AgentTeamEdgeRecord[]
  }

  async createPersonalityProfile(
    input: CreateAgentPersonalityProfileInput
  ): Promise<AgentPersonalityProfileRecord | null> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'personality_profiles',
      p_data: {
        ...input,
        system_prompt_patch: input.system_prompt_patch ?? '',
      },
    })

    if (error) throw error
    return (data as AgentPersonalityProfileRecord | null) ?? null
  }

  async createMemoryProfile(
    input: CreateAgentMemoryProfileInput
  ): Promise<AgentMemoryProfileRecord | null> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'memory_profiles',
      p_data: input,
    })

    if (error) throw error
    return (data as AgentMemoryProfileRecord | null) ?? null
  }

  async createToolProfile(input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'tool_profiles',
      p_data: {
        ai_lenser_id: input.ai_lenser_id,
        name: input.name,
        allow_tools: input.allow_tools ?? [],
        deny_tools: input.deny_tools ?? [],
        tool_groups: input.tool_groups ?? [],
        provider_overrides: input.provider_overrides ?? {},
        requires_approval: input.requires_approval ?? true,
      },
    })

    if (error) throw error
    return (data as AgentToolProfileRecord | null) ?? null
  }

  async createModelProfile(input: CreateAgentModelProfileInput): Promise<AgentModelProfileRecord | null> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'model_profiles',
      p_data: {
        ai_lenser_id: input.ai_lenser_id,
        name: input.name,
        provider_key: input.provider_key ?? null,
        model_id: input.model_id ?? null,
        model_key: input.model_key ?? null,
        support_level: input.support_level ?? 'runnable',
        params: input.params ?? {},
      },
    })

    if (error) throw error
    return (data as AgentModelProfileRecord | null) ?? null
  }

  async listApprovalRequests(
    aiLenserId: string,
    options: ListApprovalRequestsOptions = {}
  ): Promise<ApprovalRequestView[]> {
    const { data, error } = await supabase.rpc('fn_list_approval_requests', {
      p_ai_lenser_id: aiLenserId,
      p_approval_status: options.status ?? null,
      p_limit: options.limit ?? 50,
    })

    if (error) throw error
    return (data ?? []) as ApprovalRequestView[]
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequestView | null> {
    const { data, error } = await supabase.rpc('fn_get_approval_request', {
      p_request_id: requestId,
    })

    if (error) throw error
    return (data?.[0] ?? null) as ApprovalRequestView | null
  }

  async decideApproval(input: ApprovalDecisionInput): Promise<ApprovalDecisionResult> {
    const { data, error } = await supabase.rpc('fn_decide_approval', {
      p_team_run_id: input.team_run_id,
      p_decision: input.decision,
      p_reason: input.reason ?? null,
      p_modifications: input.modifications ?? null,
    })
    if (error) throw error
    const rows = (data ?? []) as ApprovalDecisionResult[]
    if (rows.length === 0) {
      throw new Error('fn_decide_approval returned no rows.')
    }
    return rows[0]
  }

  async getHumanActivityFeed(
    humanLenserId: string,
    limit = 50,
    offset = 0
  ): Promise<CrossAgentFeedItem[]> {
    const { data, error } = await supabase.rpc('fn_get_human_activity_feed', {
      p_human_lenser_id: humanLenserId,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error
    return (data ?? []) as CrossAgentFeedItem[]
  }

  async getCostSummary(aiLenserId: string): Promise<CostSummary> {
    const { data, error } = await supabase.rpc('fn_get_agent_cost_summary', {
      p_ai_lenser_id: aiLenserId,
    })

    if (error) throw error

    type CostSummaryRpc = {
      today_credits: number
      seven_day_credits: number
      thirty_day_credits: number
      today_battles: number
      today_votes: number
      spending_limit_credits: number | null
      daily: Array<{
        period_date: string
        credits_spent: number
        battles_used: number
        votes_used: number
      }>
    }

    const result = (data ?? {}) as CostSummaryRpc

    return {
      ai_lenser_id: aiLenserId,
      today_credits: result.today_credits ?? 0,
      seven_day_credits: result.seven_day_credits ?? 0,
      thirty_day_credits: result.thirty_day_credits ?? 0,
      today_battles: result.today_battles ?? 0,
      today_votes: result.today_votes ?? 0,
      spending_limit_credits: result.spending_limit_credits ?? null,
      daily: (result.daily ?? []).map((row) => ({
        period_date: row.period_date,
        credits_spent: Number(row.credits_spent ?? 0),
        battles_used: row.battles_used,
        votes_used: row.votes_used,
      })),
    }
  }

  async listAgentOwnerships(aiLenserId: string): Promise<AgentOwnershipDelegateRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_ownerships', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data ?? []) as AgentOwnershipDelegateRecord[]
  }

  async upsertAgentOwnership(
    input: UpsertAgentOwnershipInput
  ): Promise<AgentOwnershipDelegateRecord> {
    const { data, error } = await supabase.rpc('fn_upsert_agent_ownership', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_owner_lenser_id: input.owner_lenser_id,
      p_role: input.role,
      p_permission_scope: input.permission_scope ?? [],
    })
    if (error) throw error
    return data as AgentOwnershipDelegateRecord
  }

  async revokeAgentOwnership(ownershipId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_revoke_agent_ownership', {
      p_ownership_id: ownershipId,
    })
    if (error) throw error
  }

  // ─── Scratchpad ────────────────────────────────────────────────────────────

  async listScratchpadRuns(
    aiLenserId: string,
    limit = 50
  ): Promise<ScratchpadRunRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_scratchpad_runs', {
      p_ai_lenser_id: aiLenserId,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as ScratchpadRunRecord[]
  }

  async createScratchpadRun(
    input: CreateScratchpadRunInput
  ): Promise<ScratchpadRunRecord> {
    const { data, error } = await supabase.rpc('fn_create_scratchpad_run', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_prompt: input.prompt,
      p_model_id: input.model_id ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) throw error
    return data as ScratchpadRunRecord
  }

  async completeScratchpadRun(
    input: CompleteScratchpadRunInput
  ): Promise<ScratchpadRunRecord> {
    const { data, error } = await supabase.rpc('fn_complete_scratchpad_run', {
      p_run_id: input.run_id,
      p_output: input.output,
      p_status: input.status ?? 'completed',
      p_cost_credits: input.cost_credits ?? 0,
      p_error: input.error ?? null,
    })
    if (error) throw error
    return data as ScratchpadRunRecord
  }

  async promoteScratchpadToMemory(
    runId: string,
    memoryProfileId: string
  ): Promise<AgentMemoryProfileRecord> {
    const { data, error } = await supabase.rpc('fn_promote_scratchpad_to_memory', {
      p_run_id: runId,
      p_memory_profile_id: memoryProfileId,
    })
    if (error) throw error
    return data as AgentMemoryProfileRecord
  }

  // ─── Evaluations ───────────────────────────────────────────────────────────

  async listEvaluations(ownerLenserId: string): Promise<EvaluationRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_evaluations', {
      p_owner_lenser_id: ownerLenserId,
    })
    if (error) throw error
    return (data ?? []) as EvaluationRecord[]
  }

  async createEvaluation(
    input: CreateEvaluationInput
  ): Promise<EvaluationRecord> {
    const cases = (input.cases ?? []).map((c) => ({
      input: c.input,
      expected: c.expected ?? null,
      weight: c.weight ?? 1,
      tags: c.tags ?? [],
    }))

    const { data, error } = await supabase.rpc('fn_create_evaluation_with_cases', {
      p_owner_lenser_id: input.owner_lenser_id,
      p_ai_lenser_id: input.ai_lenser_id ?? null,
      p_target_type: input.target_type,
      p_target_id: input.target_id,
      p_name: input.name,
      p_description: input.description ?? null,
      p_scoring_rules: input.scoring_rules ?? {},
      p_dataset_uri: input.dataset_uri ?? null,
      p_cases: JSON.stringify(cases),
    })
    if (error) throw error
    return data as EvaluationRecord
  }

  async runEvaluation(
    evaluationId: string,
    modelId?: string | null
  ): Promise<string> {
    const { data, error } = await supabase.rpc('fn_run_evaluation', {
      p_evaluation_id: evaluationId,
      p_model_id: modelId ?? null,
    })
    if (error) throw error
    return data as string
  }

  async getEvaluationResults(
    runId: string
  ): Promise<EvaluationCaseResultRow[]> {
    const { data, error } = await supabase.rpc('fn_get_evaluation_results', {
      p_run_id: runId,
    })
    if (error) throw error
    return (data ?? []) as EvaluationCaseResultRow[]
  }

  async listEvaluationRuns(
    evaluationId: string
  ): Promise<EvaluationRunRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_evaluation_runs', {
      p_evaluation_id: evaluationId,
    })
    if (error) throw error
    return (data ?? []) as EvaluationRunRecord[]
  }

  // ─── Tools registry ────────────────────────────────────────────────────────

  async listToolRegistry(
    ownerLenserId: string
  ): Promise<ToolRegistryRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_tools_registry', {
      p_owner_lenser_id: ownerLenserId,
    })
    if (error) throw error
    return (data ?? []) as ToolRegistryRecord[]
  }

  async registerTool(input: RegisterToolInput): Promise<ToolRegistryRecord> {
    const { data, error } = await supabase.rpc('fn_register_tool', {
      p_key: input.key,
      p_name: input.name,
      p_description: input.description ?? null,
      p_category: input.category ?? 'general',
      p_schema_input: input.schema_input ?? {},
      p_schema_output: input.schema_output ?? {},
      p_auth_method: input.auth_method ?? 'none',
      p_requires_approval: input.requires_approval ?? false,
      p_is_dangerous: input.is_dangerous ?? false,
    })
    if (error) throw error
    return data as ToolRegistryRecord
  }

  async assignTool(input: AssignToolInput): Promise<ToolAssignmentRecord> {
    const { data, error } = await supabase.rpc('fn_assign_tool', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_tool_id: input.tool_id,
      p_profile_id: input.profile_id ?? null,
      p_allowed: input.allowed ?? true,
    })
    if (error) throw error
    return data as ToolAssignmentRecord
  }

  async revokeTool(aiLenserId: string, toolId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_revoke_tool', {
      p_ai_lenser_id: aiLenserId,
      p_tool_id: toolId,
    })
    if (error) throw error
  }

  async listToolAssignments(
    aiLenserId: string
  ): Promise<ToolAssignmentRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_tool_assignments', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data ?? []) as ToolAssignmentRecord[]
  }

  // ─── Fleet aggregations ────────────────────────────────────────────────────

  async getFleetOverview(humanLenserId: string): Promise<FleetOverview | null> {
    const { data, error } = await supabase.rpc('fn_get_fleet_overview', {
      p_human_lenser_id: humanLenserId,
    })
    if (error) throw error
    return (data as FleetOverview | null) ?? null
  }

  async listFleetRuns(
    humanLenserId: string,
    opts: {
      status?: string
      agentId?: string
      since?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<FleetRunRow[]> {
    const { data, error } = await supabase.rpc('fn_human_fleet_runs', {
      p_human_lenser_id: humanLenserId,
      p_status: opts.status ?? null,
      p_agent_id: opts.agentId ?? null,
      p_since: opts.since ?? null,
      p_limit: opts.limit ?? 50,
      p_offset: opts.offset ?? 0,
    })
    if (error) throw error
    return (data ?? []) as FleetRunRow[]
  }

  async listFleetLogs(
    humanLenserId: string,
    opts: {
      runId?: string
      eventType?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<FleetLogRow[]> {
    const { data, error } = await supabase.rpc('fn_human_fleet_logs', {
      p_human_lenser_id: humanLenserId,
      p_run_id: opts.runId ?? null,
      p_event_type: opts.eventType ?? null,
      p_limit: opts.limit ?? 100,
      p_offset: opts.offset ?? 0,
    })
    if (error) throw error
    return (data ?? []) as FleetLogRow[]
  }

  async listAgentRunEvents(
    aiLenserId: string,
    opts: { runId?: string; eventType?: string; limit?: number } = {}
  ): Promise<AgentRunEventRecord[]> {
    const { data, error } = await supabase.rpc('fn_agent_run_events', {
      p_ai_lenser_id: aiLenserId,
      p_run_id: opts.runId ?? null,
      p_event_type: opts.eventType ?? null,
      p_limit: opts.limit ?? 100,
    })
    if (error) throw error
    return (data ?? []) as AgentRunEventRecord[]
  }

  // ─── Provider configs (BYOK) ───────────────────────────────────────────────

  async listProviderConfigs(aiLenserId: string): Promise<ProviderConfigRecord[]> {
    const { data, error } = await supabase.rpc('fn_get_provider_configs', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data ?? []) as ProviderConfigRecord[]
  }

  async configureProvider(
    aiLenserId: string,
    providerKey: string,
    apiKey: string,
    baseUrl?: string | null
  ): Promise<ProviderConfigRecord> {
    // Store key via existing fn_store_api_key (vault write, returns ai.keys.id)
    const { data: keyId, error: keyErr } = await supabase.rpc('fn_store_api_key', {
      p_provider: providerKey,
      p_label: `agent-byok-${providerKey}`,
      p_raw_key: apiKey,
    })
    if (keyErr) throw keyErr

    const { data, error } = await supabase.rpc('fn_upsert_provider_config', {
      p_ai_lenser_id: aiLenserId,
      p_provider_key: providerKey,
      p_base_url: baseUrl ?? null,
      p_status: 'unconfigured',
      p_ai_key_id: keyId as string,
    })
    if (error) throw error
    return data as ProviderConfigRecord
  }

  async testProvider(
    aiLenserId: string,
    providerKey: string
  ): Promise<{ status: 'healthy' | 'error'; message: string }> {
    const { data, error } = await supabase.functions.invoke('test-provider', {
      body: { ai_lenser_id: aiLenserId, provider_key: providerKey },
    })
    if (error) throw error
    return data as { status: 'healthy' | 'error'; message: string }
  }

  // ─── Workspace settings ────────────────────────────────────────────────────

  async getWorkspaceSettings(
    aiLenserId: string
  ): Promise<WorkspaceSettingsRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_workspace_settings', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data as WorkspaceSettingsRecord | null) ?? null
  }

  async updateWorkspaceSettings(
    aiLenserId: string,
    patch: UpdateWorkspaceSettingsPatch
  ): Promise<WorkspaceSettingsRecord> {
    const { data, error } = await supabase.rpc('fn_update_workspace_settings', {
      p_ai_lenser_id: aiLenserId,
      p_patch: patch as Record<string, unknown>,
    })
    if (error) throw error
    return data as WorkspaceSettingsRecord
  }

  async exportWorkspace(
    aiLenserId: string
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('fn_export_workspace', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data as Record<string, unknown>) ?? {}
  }

  async requestWorkspaceDeletion(
    aiLenserId: string,
    reason?: string | null
  ): Promise<WorkspaceSettingsRecord> {
    const { data, error } = await supabase.rpc('fn_request_workspace_deletion', {
      p_ai_lenser_id: aiLenserId,
      p_reason: reason ?? null,
    })
    if (error) throw error
    return data as WorkspaceSettingsRecord
  }

  // ─── Profile mutations (Memory / Personality / Tool / Model) ───────────────

  private async updateInTable<T>(
    table: string,
    id: string,
    patch: Partial<T>
  ): Promise<T> {
    const { data, error } = await supabase.rpc('fn_upsert_workspace_item', {
      p_table_name: table,
      p_id: id,
      p_patch: JSON.stringify(patch as Record<string, unknown>),
    })
    if (error) throw error
    return data as T
  }

  private async deleteFromTable(table: string, id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_workspace_item', {
      p_table_name: table,
      p_id: id,
    })
    if (error) throw error
  }

  async listMemoryProfiles(aiLenserId: string): Promise<AgentMemoryProfileRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_memory_profiles', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data ?? []) as AgentMemoryProfileRecord[]
  }

  updateMemoryProfile(id: string, patch: Partial<AgentMemoryProfileRecord>) {
    return this.updateInTable<AgentMemoryProfileRecord>(
      'memory_profiles',
      id,
      patch
    )
  }
  deleteMemoryProfile(id: string) {
    return this.deleteFromTable('memory_profiles', id)
  }
  updatePersonalityProfile(
    id: string,
    patch: Partial<AgentPersonalityProfileRecord>
  ) {
    return this.updateInTable<AgentPersonalityProfileRecord>(
      'personality_profiles',
      id,
      patch
    )
  }
  deletePersonalityProfile(id: string) {
    return this.deleteFromTable('personality_profiles', id)
  }
  updateToolProfile(id: string, patch: Partial<AgentToolProfileRecord>) {
    return this.updateInTable<AgentToolProfileRecord>(
      'tool_profiles',
      id,
      patch
    )
  }
  deleteToolProfile(id: string) {
    return this.deleteFromTable('tool_profiles', id)
  }
  updateModelProfile(id: string, patch: Partial<AgentModelProfileRecord>) {
    return this.updateInTable<AgentModelProfileRecord>(
      'model_profiles',
      id,
      patch
    )
  }
  deleteModelProfile(id: string) {
    return this.deleteFromTable('model_profiles', id)
  }

  // ─── Team mutations ────────────────────────────────────────────────────────

  updateTeam(id: string, patch: Partial<AgentTeamRecord>) {
    return this.updateInTable<AgentTeamRecord>('teams', id, patch)
  }
  deleteTeam(id: string) {
    return this.deleteFromTable('teams', id)
  }

  async addTeamMember(input: {
    team_id: string
    agent_id: string
    role: string
    responsibility?: string | null
    lane?: number
    sort_order?: number
  }): Promise<AgentTeamMemberRecord> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'team_members',
      p_data: {
        team_id: input.team_id,
        agent_id: input.agent_id,
        role: input.role,
        responsibility: input.responsibility ?? null,
        lane: input.lane ?? 0,
        sort_order: input.sort_order ?? 0,
        is_active: true,
      },
    })
    if (error) throw error
    return data as AgentTeamMemberRecord
  }

  updateTeamMember(id: string, patch: Partial<AgentTeamMemberRecord>) {
    return this.updateInTable<AgentTeamMemberRecord>('team_members', id, patch)
  }
  deleteTeamMember(id: string) {
    return this.deleteFromTable('team_members', id)
  }

  async upsertTeamEdge(input: {
    team_id: string
    source_member_id: string
    target_member_id: string
    edge_type: string
    is_blocking?: boolean
  }): Promise<AgentTeamEdgeRecord> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'team_edges',
      p_data: {
        team_id: input.team_id,
        source_member_id: input.source_member_id,
        target_member_id: input.target_member_id,
        edge_type: input.edge_type,
        is_blocking: input.is_blocking ?? false,
      },
    })
    if (error) throw error
    return data as AgentTeamEdgeRecord
  }

  deleteTeamEdge(id: string) {
    return this.deleteFromTable('team_edges', id)
  }

  async listAgentRunSteps(aiLenserId: string, runId: string): Promise<AgentRunStepRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_agent_run_steps', {
      p_team_run_id: runId,
    })
    if (error) throw error
    return (data ?? []) as AgentRunStepRecord[]
  }

  async cancelAgentRun(aiLenserId: string, runId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_cancel_agent_run', {
      p_team_run_id: runId,
    })
    if (error) throw error
  }

  async retryAgentRun(aiLenserId: string, runId: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_retry_agent_run', {
      p_ai_lenser_id: aiLenserId,
      p_run_id: runId,
    })
    if (error) throw error
    return data as string
  }

  async listWorkflowAssignments(aiLenserId: string): Promise<AgentWorkflowAssignmentRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_workflow_assignments', {
      p_ai_lenser_id: aiLenserId,
    })
    if (error) throw error
    return (data ?? []) as AgentWorkflowAssignmentRecord[]
  }

  async createWorkflowAssignment(input: CreateWorkflowAssignmentInput): Promise<AgentWorkflowAssignmentRecord> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'workflow_assignments',
      p_data: {
        ai_lenser_id: input.ai_lenser_id,
        workflow_id: input.workflow_id,
        assignee_kind: input.assignee_kind,
        assignee_ai_lenser_id: input.assignee_ai_lenser_id ?? null,
        assignee_team_id: input.assignee_team_id ?? null,
        approval_policy: input.approval_policy ?? {},
        retry_policy: input.retry_policy ?? {},
        failure_policy: input.failure_policy ?? {},
        is_active: input.is_active ?? true,
      },
    })
    if (error) throw error
    return data as AgentWorkflowAssignmentRecord
  }

  updateWorkflowAssignment(id: string, patch: Partial<AgentWorkflowAssignmentRecord>) {
    return this.updateInTable<AgentWorkflowAssignmentRecord>('workflow_assignments', id, patch)
  }

  deleteWorkflowAssignment(id: string) {
    return this.deleteFromTable('workflow_assignments', id)
  }

  async createTeamRun(input: CreateTeamRunInput): Promise<AgentTeamRunRecord> {
    const { data, error } = await supabase.rpc('fn_create_team_run', {
      p_ai_lenser_id: input.ai_lenser_id,
      p_workflow_id: input.workflow_id,
      p_workflow_run_id: input.workflow_run_id,
      p_workflow_assignment_id: input.workflow_assignment_id,
      p_team_id: input.team_id ?? null,
      p_approval_status: input.approval_status,
    })
    if (error) throw error
    return data as AgentTeamRunRecord
  }

  async updateTeamRunStatus(runId: string, status: string, completedAt?: string): Promise<void> {
    const { error } = await supabase.rpc('fn_update_team_run_status', {
      p_team_run_id: runId,
      p_status: status,
      p_completed_at: completedAt ?? null,
    })
    if (error) throw error
  }

  async appendTeamRunEvent(teamRunId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.rpc('fn_append_team_run_event', {
      p_team_run_id: teamRunId,
      p_event_type: eventType,
      p_payload: payload,
    })
    if (error) throw error
  }

  async upsertAgentRunStep(input: UpsertAgentRunStepInput): Promise<AgentRunStepRecord> {
    const { data, error } = await supabase.rpc('fn_upsert_agent_run_step', {
      p_team_run_id: input.team_run_id,
      p_workflow_node_id: input.workflow_node_id,
      p_lane: input.lane,
      p_title: input.title,
      p_status: input.status,
      p_current_task: input.current_task ?? null,
      p_recent_output_summary: input.recent_output_summary ?? null,
      p_blocker_summary: input.blocker_summary ?? null,
      p_started_at: input.started_at ?? null,
      p_completed_at: input.completed_at ?? null,
    })
    if (error) throw error
    return data as AgentRunStepRecord
  }

  async listEvaluationCases(evaluationId: string): Promise<EvaluationCaseRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_evaluation_cases', {
      p_evaluation_id: evaluationId,
    })
    if (error) throw error
    return (data ?? []) as EvaluationCaseRecord[]
  }

  async createEvaluationCase(input: CreateEvaluationCaseInput): Promise<EvaluationCaseRecord> {
    const { data, error } = await supabase.rpc('fn_create_workspace_record', {
      p_table_name: 'evaluation_cases',
      p_data: {
        evaluation_id: input.evaluation_id,
        input: input.input,
        expected: input.expected ?? null,
        weight: input.weight ?? 1,
        tags: input.tags ?? [],
      },
    })
    if (error) throw error
    return data as EvaluationCaseRecord
  }

  deleteEvaluationCase(id: string) {
    return this.deleteFromTable('evaluation_cases', id)
  }

  // ─── Evaluation rubrics ────────────────────────────────────────────────────

  async listEvaluationRubrics(evaluationId: string): Promise<EvaluationRubricRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_evaluation_rubrics', {
      p_evaluation_id: evaluationId,
    })
    if (error) throw error
    return (data ?? []) as EvaluationRubricRecord[]
  }

  async createEvaluationRubric(
    evaluationId: string,
    criteria: EvaluationRubricCriterion[]
  ): Promise<EvaluationRubricRecord> {
    const { data, error } = await supabase.rpc('fn_create_evaluation_rubric', {
      p_evaluation_id: evaluationId,
      p_criteria: JSON.stringify(criteria),
    })
    if (error) throw error
    return data as EvaluationRubricRecord
  }

  // ─── Evaluation baselines ──────────────────────────────────────────────────

  async getEvaluationBaseline(evaluationId: string): Promise<EvaluationBaselineRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_evaluation_baseline', {
      p_evaluation_id: evaluationId,
    })
    if (error) throw error
    return (data as EvaluationBaselineRecord | null) ?? null
  }

  async setEvaluationBaseline(
    evaluationId: string,
    runId: string
  ): Promise<EvaluationBaselineRecord> {
    const { data, error } = await supabase.rpc('fn_set_evaluation_baseline', {
      p_evaluation_id: evaluationId,
      p_run_id: runId,
    })
    if (error) throw error
    return data as EvaluationBaselineRecord
  }

  // ─── Post-run evaluation trigger ──────────────────────────────────────────

  async triggerPostRunEvaluations(workflowId: string, teamRunId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_trigger_post_run_evaluations', {
      p_workflow_id: workflowId,
      p_team_run_id: teamRunId,
    })
    if (error) throw error
  }
}
