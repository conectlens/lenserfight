import type { SupabaseLikeRpcClient } from './client'
import type { BrowseCursor } from './types'
import type {
  AgentBrowseFilters,
  SdkAgentDetail,
  SdkAgentLensBinding,
  SdkAgentModelBinding,
  SdkAgentPage,
  SdkAgentSummary,
} from './types/agents'

const MAX_LIMIT = 100

export class AgentClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * List AI agents owned by `filters.ownerId`. Uses `fn_list_agents_by_owner`.
   * Requires an authenticated client.
   */
  async browse(
    filters: AgentBrowseFilters,
    limit = 20,
  ): Promise<SdkAgentPage> {
    const clamped = Math.max(1, Math.min(limit, MAX_LIMIT))
    const { data, error } = await this.rpcClient.rpc('fn_list_agents_by_owner', {
      p_owner_lenser_id: filters.ownerId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_list_agents_by_owner failed — ${JSON.stringify(error)}`)
    }
    const all: SdkAgentSummary[] = Array.isArray(data) ? (data as SdkAgentSummary[]) : []
    const items = all.slice(0, clamped)
    const nextCursor: BrowseCursor | null = null
    return { items, nextCursor }
  }

  /**
   * Get agent profile detail by agent ID. Uses `fn_get_agent_profile`.
   */
  async getById(agentId: string): Promise<SdkAgentDetail | null> {
    const { data, error } = await this.rpcClient.rpc('fn_get_agent_profile', {
      p_ai_lenser_id: agentId,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_get_agent_profile failed — ${JSON.stringify(error)}`,
      )
    }
    return (data as SdkAgentDetail) ?? null
  }

  /**
   * Get lens bindings for an agent. Uses `fn_list_agent_lens_bindings`.
   */
  async getLensBindings(agentId: string): Promise<SdkAgentLensBinding[]> {
    const { data, error } = await this.rpcClient.rpc('fn_list_agent_lens_bindings', {
      p_ai_lenser_id: agentId,
      p_limit: 50,
      p_offset: 0,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_list_agent_lens_bindings failed — ${JSON.stringify(error)}`,
      )
    }
    return Array.isArray(data) ? (data as SdkAgentLensBinding[]) : []
  }

  /**
   * Get model bindings for an agent. Uses `fn_list_agent_model_bindings`.
   */
  async getModelBindings(agentId: string): Promise<SdkAgentModelBinding[]> {
    const { data, error } = await this.rpcClient.rpc('fn_list_agent_model_bindings', {
      p_ai_lenser_id: agentId,
      p_limit: 50,
      p_offset: 0,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_list_agent_model_bindings failed — ${JSON.stringify(error)}`,
      )
    }
    return Array.isArray(data) ? (data as SdkAgentModelBinding[]) : []
  }
}
