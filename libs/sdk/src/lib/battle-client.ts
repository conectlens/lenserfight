import type { SupabaseLikeRpcClient } from './client'
import type { BrowseBattle, BrowseCursor, BrowseFilters } from './types'

const MAX_LIMIT = 100

export class BattleClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Browse public battles. Calls `public.fn_browse_battles` (SECURITY DEFINER,
   * grants EXECUTE to anon + authenticated). Returns at most 100 rows per call
   * regardless of `limit` — the server clamps too.
   *
   * For deeper paging, pass the last row's `{created_at, id}` as `cursor`.
   */
  async browse(
    filters: BrowseFilters = {},
    cursor?: BrowseCursor,
    limit = 20,
  ): Promise<BrowseBattle[]> {
    const clamped = Math.max(1, Math.min(limit, MAX_LIMIT))
    const params: Record<string, unknown> = {
      p_search: filters.search ?? null,
      p_category: filters.category ?? null,
      p_status: filters.status ?? null,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: clamped,
    }
    const { data, error } = await this.rpcClient.rpc('fn_browse_battles', params)
    if (error) {
      throw new Error(
        `@lenserfight/sdk: browse failed — ${JSON.stringify(error)}`,
      )
    }
    return Array.isArray(data) ? (data as BrowseBattle[]) : []
  }
}
