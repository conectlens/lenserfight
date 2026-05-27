import type { SupabaseLikeRpcClient } from './client'
import type { BrowseCursor } from './types'
import type {
  LensBrowseFilters,
  SdkLensDetail,
  SdkLensSummary,
  SdkLensVersion,
  SdkLensVersionSummary,
} from './types/lenses'
import type { SdkParameterContract } from './types/protocols'

const MAX_LIMIT = 100

export class LensClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Browse public lenses. Keyset pagination on (created_at DESC, id DESC).
   */
  async browse(
    filters: LensBrowseFilters = {},
    cursor?: BrowseCursor,
    limit = 20,
  ): Promise<SdkLensSummary[]> {
    const clamped = Math.max(1, Math.min(limit, MAX_LIMIT))
    const { data, error } = await this.rpcClient.rpc('fn_sdk_browse_lenses', {
      p_search: filters.search ?? null,
      p_tag: filters.tag ?? null,
      p_kind: filters.kind ?? null,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: clamped,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_sdk_browse_lenses failed — ${JSON.stringify(error)}`)
    }
    return Array.isArray(data) ? (data as SdkLensSummary[]) : []
  }

  /**
   * Full-text search across public lenses.
   */
  async search(
    query: string,
    filters: Omit<LensBrowseFilters, 'search'> = {},
    cursor?: BrowseCursor,
    limit = 20,
  ): Promise<SdkLensSummary[]> {
    return this.browse({ ...filters, search: query }, cursor, limit)
  }

  /**
   * Get full lens detail. Reuses existing `fn_get_lens_detail_bootstrap`.
   */
  async getById(lensId: string): Promise<SdkLensDetail | null> {
    const { data, error } = await this.rpcClient.rpc('fn_get_lens_detail_bootstrap', {
      p_lens_id: lensId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_get_lens_detail_bootstrap failed — ${JSON.stringify(error)}`)
    }
    if (!data || (data as Record<string, unknown>)['error']) return null
    return data as SdkLensDetail
  }

  /**
   * Get a specific version with parameters. Combines existing RPCs:
   * `fn_get_lens_version_detail` + `fn_get_lens_version_parameters`.
   */
  async getVersion(versionId: string): Promise<SdkLensVersion | null> {
    const [detailRes, paramsRes] = await Promise.all([
      this.rpcClient.rpc('fn_get_lens_version_detail', { p_version_id: versionId }),
      this.rpcClient.rpc('fn_get_lens_version_parameters', { p_version_id: versionId }),
    ])
    if (detailRes.error) {
      throw new Error(`@lenserfight/sdk: fn_get_lens_version_detail failed — ${JSON.stringify(detailRes.error)}`)
    }
    if (!detailRes.data) return null
    const detail = Array.isArray(detailRes.data) ? detailRes.data[0] : detailRes.data
    if (!detail) return null
    return {
      ...(detail as SdkLensVersionSummary),
      parameters: Array.isArray(paramsRes.data) ? paramsRes.data : (paramsRes.data ?? []),
    } as SdkLensVersion
  }

  /**
   * Get parameter contracts for a version via `fn_get_version_contracts`.
   * Returns the input_contract's parameter array if present.
   */
  async getParameterContracts(versionId: string): Promise<SdkParameterContract[]> {
    const { data, error } = await this.rpcClient.rpc('fn_get_version_contracts', {
      p_version_id: versionId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_get_version_contracts failed — ${JSON.stringify(error)}`)
    }
    if (!data) return []
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return []
    const inputContract = (row as Record<string, unknown>)['input_contract'] as Record<string, unknown> | null
    if (!inputContract) return []
    const params = (inputContract as Record<string, unknown>)['parameters'] ?? (inputContract as Record<string, unknown>)['inputs']
    return Array.isArray(params) ? (params as SdkParameterContract[]) : []
  }
}
