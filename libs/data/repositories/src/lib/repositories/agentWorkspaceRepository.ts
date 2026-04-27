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

export interface AgentWorkspaceRepositoryPort {
  getWorkspaceBootstrap(handle: string): Promise<AgentWorkspaceBootstrap | null>
  createTeam(input: CreateAgentTeamInput): Promise<AgentTeamRecord | null>
  listTeamMembers(teamId: string): Promise<AgentTeamMemberRecord[]>
  listTeamEdges(teamId: string): Promise<AgentTeamEdgeRecord[]>
  createPersonalityProfile(input: CreateAgentPersonalityProfileInput): Promise<AgentPersonalityProfileRecord | null>
  createMemoryProfile(input: CreateAgentMemoryProfileInput): Promise<AgentMemoryProfileRecord | null>
  createToolProfile(input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null>
  createModelProfile(input: CreateAgentModelProfileInput): Promise<AgentModelProfileRecord | null>
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
}
