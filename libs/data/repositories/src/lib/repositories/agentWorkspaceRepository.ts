import { supabase } from '@lenserfight/data/supabase'
import type {
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentPersonalityProfileRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentToolProfileRecord,
  AgentWorkspaceBootstrap,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
  ApprovalRequestView,
  ApprovalStatus,
  CostSummary,
  CrossAgentFeedItem,
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
}
