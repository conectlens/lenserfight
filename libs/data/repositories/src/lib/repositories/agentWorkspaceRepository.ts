import { supabase } from '@lenserfight/data/supabase'
import type {
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
  agent_id: string
  name: string
  description?: string | null
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
    const { data, error } = await supabase
      .schema('agents')
      .from('teams')
      .insert({
        ai_lenser_id: input.ai_lenser_id,
        name: input.name,
        description: input.description ?? null,
      })
      .select('*')
      .single()

    if (error) throw error

    const team = data as AgentTeamRecord
    const { error: memberError } = await supabase
      .schema('agents')
      .from('team_members')
      .insert({
        team_id: team.id,
        agent_id: input.agent_id,
        role: 'lead',
        responsibility: 'Primary operator',
        lane: 0,
        sort_order: 0,
        is_active: true,
      })

    if (memberError) throw memberError
    return team
  }

  async listTeamMembers(teamId: string): Promise<AgentTeamMemberRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('lane', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as AgentTeamMemberRecord[]
  }

  async listTeamEdges(teamId: string): Promise<AgentTeamEdgeRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('team_edges')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as AgentTeamEdgeRecord[]
  }

  async createPersonalityProfile(
    input: CreateAgentPersonalityProfileInput
  ): Promise<AgentPersonalityProfileRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('personality_profiles')
      .insert({
        ...input,
        system_prompt_patch: input.system_prompt_patch ?? '',
      })
      .select('*')
      .single()

    if (error) throw error
    return (data as AgentPersonalityProfileRecord | null) ?? null
  }

  async createMemoryProfile(
    input: CreateAgentMemoryProfileInput
  ): Promise<AgentMemoryProfileRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('memory_profiles')
      .insert(input)
      .select('*')
      .single()

    if (error) throw error
    return (data as AgentMemoryProfileRecord | null) ?? null
  }

  async createToolProfile(input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('tool_profiles')
      .insert({
        ai_lenser_id: input.ai_lenser_id,
        name: input.name,
        allow_tools: input.allow_tools ?? [],
        deny_tools: input.deny_tools ?? [],
        tool_groups: input.tool_groups ?? [],
        provider_overrides: input.provider_overrides ?? {},
        requires_approval: input.requires_approval ?? true,
      })
      .select('*')
      .single()

    if (error) throw error
    return (data as AgentToolProfileRecord | null) ?? null
  }

  async createModelProfile(input: CreateAgentModelProfileInput): Promise<AgentModelProfileRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('model_profiles')
      .insert({
        ai_lenser_id: input.ai_lenser_id,
        name: input.name,
        provider_key: input.provider_key ?? null,
        model_id: input.model_id ?? null,
        model_key: input.model_key ?? null,
        support_level: input.support_level ?? 'runnable',
        params: input.params ?? {},
      })
      .select('*')
      .single()

    if (error) throw error
    return (data as AgentModelProfileRecord | null) ?? null
  }

  async listApprovalRequests(
    aiLenserId: string,
    options: ListApprovalRequestsOptions = {}
  ): Promise<ApprovalRequestView[]> {
    let query = supabase
      .schema('agents')
      .from('approval_requests_v')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('requested_at', { ascending: false })

    if (options.status) {
      query = query.eq('approval_status', options.status)
    } else {
      query = query.eq('approval_status', 'pending')
    }

    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ApprovalRequestView[]
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequestView | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('approval_requests_v')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle()

    if (error) throw error
    return (data as ApprovalRequestView | null) ?? null
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
    const { data: snapshots, error } = await supabase
      .schema('agents')
      .from('quota_snapshots')
      .select('period_date, credits_spent, battles_used, votes_used')
      .eq('ai_lenser_id', aiLenserId)
      .order('period_date', { ascending: false })
      .limit(30)

    if (error) throw error

    const { data: policy, error: policyError } = await supabase
      .schema('agents')
      .from('policies')
      .select('spending_limit_credits')
      .eq('ai_lenser_id', aiLenserId)
      .maybeSingle()

    if (policyError) throw policyError

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayIso = today.toISOString().slice(0, 10)
    const sevenDaysAgo = new Date(today.getTime() - 6 * 86400_000).toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(today.getTime() - 29 * 86400_000).toISOString().slice(0, 10)

    type Snapshot = {
      period_date: string
      credits_spent: number | string
      battles_used: number
      votes_used: number
    }
    const rows = (snapshots ?? []) as Snapshot[]

    const sumCredits = (since: string) =>
      rows
        .filter((row) => row.period_date >= since)
        .reduce((acc, row) => acc + Number(row.credits_spent ?? 0), 0)

    const todayRow = rows.find((row) => row.period_date === todayIso)

    return {
      ai_lenser_id: aiLenserId,
      today_credits: Number(todayRow?.credits_spent ?? 0),
      seven_day_credits: sumCredits(sevenDaysAgo),
      thirty_day_credits: sumCredits(thirtyDaysAgo),
      today_battles: todayRow?.battles_used ?? 0,
      today_votes: todayRow?.votes_used ?? 0,
      spending_limit_credits:
        (policy as { spending_limit_credits?: number } | null)?.spending_limit_credits ?? null,
      daily: rows.map((row) => ({
        period_date: row.period_date,
        credits_spent: Number(row.credits_spent ?? 0),
        battles_used: row.battles_used,
        votes_used: row.votes_used,
      })),
    }
  }

  // ─── Scratchpad ────────────────────────────────────────────────────────────

  async listScratchpadRuns(
    aiLenserId: string,
    limit = 50
  ): Promise<ScratchpadRunRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('scratchpad_runs')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('started_at', { ascending: false })
      .limit(limit)
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
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluations')
      .select('*')
      .eq('owner_lenser_id', ownerLenserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as EvaluationRecord[]
  }

  async createEvaluation(
    input: CreateEvaluationInput
  ): Promise<EvaluationRecord> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluations')
      .insert({
        owner_lenser_id: input.owner_lenser_id,
        ai_lenser_id: input.ai_lenser_id ?? null,
        target_type: input.target_type,
        target_id: input.target_id,
        name: input.name,
        description: input.description ?? null,
        scoring_rules: input.scoring_rules ?? {},
        dataset_uri: input.dataset_uri ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    const evalRow = data as EvaluationRecord
    if (input.cases && input.cases.length > 0) {
      const cases = input.cases.map((c) => ({
        evaluation_id: evalRow.id,
        input: c.input,
        expected: c.expected ?? null,
        weight: c.weight ?? 1,
        tags: c.tags ?? [],
      }))
      const { error: casesError } = await supabase
        .schema('agents')
        .from('evaluation_cases')
        .insert(cases)
      if (casesError) throw casesError
    }
    return evalRow
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
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_results_v')
      .select('*')
      .eq('run_id', runId)
    if (error) throw error
    return (data ?? []) as EvaluationCaseResultRow[]
  }

  async listEvaluationRuns(
    evaluationId: string
  ): Promise<EvaluationRunRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_runs')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('started_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as EvaluationRunRecord[]
  }

  // ─── Tools registry ────────────────────────────────────────────────────────

  async listToolRegistry(
    ownerLenserId: string
  ): Promise<ToolRegistryRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('tools_registry')
      .select('*')
      .eq('owner_lenser_id', ownerLenserId)
      .order('name', { ascending: true })
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
    const { data, error } = await supabase
      .schema('agents')
      .from('tool_assignments')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
    if (error) throw error
    return (data ?? []) as ToolAssignmentRecord[]
  }

  // ─── Fleet aggregations ────────────────────────────────────────────────────

  async getFleetOverview(humanLenserId: string): Promise<FleetOverview | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('v_human_fleet_overview')
      .select('*')
      .eq('human_lenser_id', humanLenserId)
      .maybeSingle()
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
    const { data, error } = await supabase
      .schema('agents')
      .from('workspace_settings')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .maybeSingle()
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
    const { data, error } = await supabase
      .schema('agents')
      .from(table)
      .update(patch as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as T
  }

  private async deleteFromTable(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .schema('agents')
      .from(table)
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async listMemoryProfiles(aiLenserId: string): Promise<AgentMemoryProfileRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('memory_profiles')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('created_at', { ascending: false })
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
    const { data, error } = await supabase
      .schema('agents')
      .from('team_members')
      .insert({
        team_id: input.team_id,
        agent_id: input.agent_id,
        role: input.role,
        responsibility: input.responsibility ?? null,
        lane: input.lane ?? 0,
        sort_order: input.sort_order ?? 0,
        is_active: true,
      })
      .select('*')
      .single()
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
    const { data, error } = await supabase
      .schema('agents')
      .from('team_edges')
      .insert({
        team_id: input.team_id,
        source_member_id: input.source_member_id,
        target_member_id: input.target_member_id,
        edge_type: input.edge_type,
        is_blocking: input.is_blocking ?? false,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as AgentTeamEdgeRecord
  }

  deleteTeamEdge(id: string) {
    return this.deleteFromTable('team_edges', id)
  }

  async listAgentRunSteps(aiLenserId: string, runId: string): Promise<AgentRunStepRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('agent_run_steps')
      .select('*')
      .eq('team_run_id', runId)
      .order('started_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as AgentRunStepRecord[]
  }

  async cancelAgentRun(aiLenserId: string, runId: string): Promise<void> {
    const { error } = await supabase
      .schema('agents')
      .from('team_runs')
      .update({ status: 'cancelled' })
      .eq('id', runId)
      .eq('ai_lenser_id', aiLenserId)
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
    const { data, error } = await supabase
      .schema('agents')
      .from('workflow_assignments')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AgentWorkflowAssignmentRecord[]
  }

  async createWorkflowAssignment(input: CreateWorkflowAssignmentInput): Promise<AgentWorkflowAssignmentRecord> {
    const { data, error } = await supabase
      .schema('agents')
      .from('workflow_assignments')
      .insert({
        ai_lenser_id: input.ai_lenser_id,
        workflow_id: input.workflow_id,
        assignee_kind: input.assignee_kind,
        assignee_ai_lenser_id: input.assignee_ai_lenser_id ?? null,
        assignee_team_id: input.assignee_team_id ?? null,
        approval_policy: input.approval_policy ?? {},
        retry_policy: input.retry_policy ?? {},
        failure_policy: input.failure_policy ?? {},
        is_active: input.is_active ?? true,
      })
      .select('*')
      .single()
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
    const { data, error } = await supabase
      .schema('agents')
      .from('team_runs')
      .insert({
        ai_lenser_id: input.ai_lenser_id,
        workflow_id: input.workflow_id,
        workflow_run_id: input.workflow_run_id,
        workflow_assignment_id: input.workflow_assignment_id,
        team_id: input.team_id ?? null,
        status: 'running',
        approval_status: input.approval_status,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw error
    return data as AgentTeamRunRecord
  }

  async updateTeamRunStatus(runId: string, status: string, completedAt?: string): Promise<void> {
    const patch: Record<string, unknown> = { status }
    if (completedAt) patch['completed_at'] = completedAt
    const { error } = await supabase
      .schema('agents')
      .from('team_runs')
      .update(patch)
      .eq('id', runId)
    if (error) throw error
  }

  async appendTeamRunEvent(teamRunId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .schema('agents')
      .from('agent_run_events')
      .insert({
        team_run_id: teamRunId,
        event_type: eventType,
        payload,
        occurred_at: new Date().toISOString(),
      })
    if (error) throw error
  }

  async upsertAgentRunStep(input: UpsertAgentRunStepInput): Promise<AgentRunStepRecord> {
    const existing = await supabase
      .schema('agents')
      .from('agent_run_steps')
      .select('id')
      .eq('team_run_id', input.team_run_id)
      .eq('workflow_node_id', input.workflow_node_id)
      .maybeSingle()

    if (existing.data) {
      const patch: Record<string, unknown> = {
        status: input.status,
        title: input.title,
      }
      if (input.current_task !== undefined) patch['current_task'] = input.current_task
      if (input.recent_output_summary !== undefined) patch['recent_output_summary'] = input.recent_output_summary
      if (input.blocker_summary !== undefined) patch['blocker_summary'] = input.blocker_summary
      if (input.completed_at) patch['completed_at'] = input.completed_at
      const { data, error } = await supabase
        .schema('agents')
        .from('agent_run_steps')
        .update(patch)
        .eq('id', (existing.data as { id: string }).id)
        .select('*')
        .single()
      if (error) throw error
      return data as AgentRunStepRecord
    }

    const { data, error } = await supabase
      .schema('agents')
      .from('agent_run_steps')
      .insert({
        team_run_id: input.team_run_id,
        workflow_node_id: input.workflow_node_id,
        lane: input.lane,
        title: input.title,
        status: input.status,
        current_task: input.current_task ?? null,
        recent_output_summary: input.recent_output_summary ?? null,
        blocker_summary: input.blocker_summary ?? null,
        started_at: input.started_at ?? new Date().toISOString(),
        completed_at: input.completed_at ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as AgentRunStepRecord
  }

  async listEvaluationCases(evaluationId: string): Promise<EvaluationCaseRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_cases')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as EvaluationCaseRecord[]
  }

  async createEvaluationCase(input: CreateEvaluationCaseInput): Promise<EvaluationCaseRecord> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_cases')
      .insert({
        evaluation_id: input.evaluation_id,
        input: input.input,
        expected: input.expected ?? null,
        weight: input.weight ?? 1,
        tags: input.tags ?? [],
      })
      .select('*')
      .single()
    if (error) throw error
    return data as EvaluationCaseRecord
  }

  deleteEvaluationCase(id: string) {
    return this.deleteFromTable('evaluation_cases', id)
  }

  // ─── Evaluation rubrics ────────────────────────────────────────────────────

  async listEvaluationRubrics(evaluationId: string): Promise<EvaluationRubricRecord[]> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_rubrics')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('version', { ascending: false })
    if (error) throw error
    return (data ?? []) as EvaluationRubricRecord[]
  }

  async createEvaluationRubric(
    evaluationId: string,
    criteria: EvaluationRubricCriterion[]
  ): Promise<EvaluationRubricRecord> {
    // Mark all existing rubrics for this evaluation as not current
    await supabase
      .schema('agents')
      .from('evaluation_rubrics')
      .update({ is_current: false })
      .eq('evaluation_id', evaluationId)

    // Determine next version number
    const { data: existing } = await supabase
      .schema('agents')
      .from('evaluation_rubrics')
      .select('version')
      .eq('evaluation_id', evaluationId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = ((existing as { version: number } | null)?.version ?? 0) + 1

    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_rubrics')
      .insert({ evaluation_id: evaluationId, version: nextVersion, criteria, is_current: true })
      .select('*')
      .single()
    if (error) throw error
    return data as EvaluationRubricRecord
  }

  // ─── Evaluation baselines ──────────────────────────────────────────────────

  async getEvaluationBaseline(evaluationId: string): Promise<EvaluationBaselineRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_baselines')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .maybeSingle()
    if (error) throw error
    return (data as EvaluationBaselineRecord | null) ?? null
  }

  async setEvaluationBaseline(
    evaluationId: string,
    runId: string
  ): Promise<EvaluationBaselineRecord> {
    // Fetch the run to capture its score
    const { data: runData, error: runError } = await supabase
      .schema('agents')
      .from('evaluation_runs')
      .select('score')
      .eq('id', runId)
      .single()
    if (runError) throw runError
    const score = (runData as { score: number | null }).score

    const { data, error } = await supabase
      .schema('agents')
      .from('evaluation_baselines')
      .upsert(
        { evaluation_id: evaluationId, run_id: runId, score },
        { onConflict: 'evaluation_id' }
      )
      .select('*')
      .single()
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
