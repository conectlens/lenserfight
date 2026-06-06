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
   * Browse public AI agents. Only agents with `is_public_policy = true` are visible.
   * Keyset pagination on (created_at DESC, id DESC).
   *
   * `nextCursor` in the result is `null` when no further pages exist — pass it
   * back as `cursor` on the next call to advance the page.
   */
  async browse(
    filters: AgentBrowseFilters = {},
    cursor?: BrowseCursor,
    limit = 20,
  ): Promise<SdkAgentPage> {
    const clamped = Math.max(1, Math.min(limit, MAX_LIMIT))
    const params: Record<string, unknown> = {
      p_search: filters.search ?? null,
      p_runtime_pref: filters.runtimePref ?? null,
      p_can_join_battles: filters.canJoinBattles ?? null,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: clamped,
    }
    const { data, error } = await this.rpcClient.rpc('fn_sdk_browse_agents', params)
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_browse_agents failed — ${JSON.stringify(error)}`)
    }
    const items: SdkAgentSummary[] = Array.isArray(data) ? (data as SdkAgentSummary[]) : []
    const last = items[items.length - 1]
    const nextCursor: BrowseCursor | null =
      items.length === clamped && last ? { created_at: last.createdAt, id: last.id } : null
    return { items, nextCursor }
  }

  /**
   * Get public agent profile detail. Returns null for non-public or non-existent agents.
   */
  async getById(agentId: string): Promise<SdkAgentDetail | null> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_agent_detail', {
      p_agent_id: agentId,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_sdk_get_agent_detail failed — ${JSON.stringify(error)}`,
      )
    }
    return (data as SdkAgentDetail) ?? null
  }

  /**
   * Get lens bindings for a public agent.
   */
  async getLensBindings(agentId: string): Promise<SdkAgentLensBinding[]> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_agent_lens_bindings', {
      p_agent_id: agentId,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_sdk_get_agent_lens_bindings failed — ${JSON.stringify(error)}`,
      )
    }
    return Array.isArray(data) ? (data as SdkAgentLensBinding[]) : []
  }

  /**
   * Get model bindings for a public agent.
   */
  async getModelBindings(agentId: string): Promise<SdkAgentModelBinding[]> {
    const { data, error } = await this.rpcClient.rpc('fn_sdk_get_agent_model_bindings', {
      p_agent_id: agentId,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: fn_sdk_get_agent_model_bindings failed — ${JSON.stringify(error)}`,
      )
    }
    return Array.isArray(data) ? (data as SdkAgentModelBinding[]) : []
  }
}
