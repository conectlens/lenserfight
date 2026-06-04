import type { SupabaseLikeRpcClient } from './client'
import type { BrowseCursor } from './types'
import type {
  LensBrowseFilters,
  SdkLensDetail,
  SdkLensSummary,
  SdkLensVersion,
  SdkLensVersionSummary,
  SdkResolvedTemplate,
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
   * Resolve a lens template by substituting `[[:paramId]]` tokens with the
   * supplied values (matched by parameter label, case-insensitive). Returns the
   * filled prompt and lists which parameters were used or missing.
   *
   * Requires an authenticated client (`apiKey` in `createClient`).
   *
   * @example
   *   const result = await lf.lenses.resolveTemplate(lensId, { Topic: 'TypeScript' });
   *   if (result.missing.length === 0) {
   *     // pass result.resolvedPrompt to your AI model
   *   }
   */
  async resolveTemplate(
    lensId: string,
    params: Record<string, string>,
    options?: { versionId?: string },
  ): Promise<SdkResolvedTemplate> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_lens_resolve_template', {
      p_lens_id: lensId,
      p_version_id: options?.versionId ?? null,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_lens_resolve_template failed — ${JSON.stringify(error)}`)
    }
    if (!data) {
      throw new Error(`@lenserfight/sdk: lens ${lensId} not found`)
    }
    const row = data as {
      lens_id: string
      version_id: string
      title: string | null
      description: string | null
      template_body: string
      parameters: Array<{ id: string; label: string; optional: boolean }> | null
    }

    let resolved = row.template_body
    const missing: string[] = []
    const used: string[] = []
    for (const param of row.parameters ?? []) {
      const token = `[[:${param.id}]]`
      const value =
        params[param.label] ??
        params[param.label.toLowerCase()] ??
        Object.entries(params).find(([k]) => k.toLowerCase() === param.label.toLowerCase())?.[1]
      if (value !== undefined) {
        resolved = resolved.split(token).join(value)
        used.push(param.label)
      } else if (!param.optional) {
        missing.push(param.label)
      } else {
        resolved = resolved.split(token).join('')
      }
    }

    return {
      resolvedPrompt: resolved,
      lensId: row.lens_id,
      versionId: row.version_id,
      lensTitle: row.title ?? lensId,
      lensDescription: row.description ?? null,
      paramsUsed: used,
      missing,
    }
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

  /**
   * Extract the parameters declared by a lens version — the contracts plus their
   * labels. Use this to know which values a lens needs before resolving it.
   */
  async extractParams(
    versionId: string,
  ): Promise<{ params: SdkParameterContract[]; labels: string[] }> {
    const params = await this.getParameterContracts(versionId)
    return { params, labels: params.map((p) => p.label) }
  }

  /**
   * Validate supplied values against a lens version's parameter contracts.
   * - `missing`: required parameter labels with no value
   * - `unknown`: provided keys that match no contract label (case-insensitive)
   */
  async validateParams(
    versionId: string,
    values: Record<string, string>,
  ): Promise<{
    valid: boolean
    missing: string[]
    unknown: string[]
    total: number
    provided: number
  }> {
    const contracts = await this.getParameterContracts(versionId)
    const providedKeys = new Set(Object.keys(values).map((k) => k.toLowerCase()))
    const contractLabels = new Set(contracts.map((c) => c.label.toLowerCase()))

    const missing = contracts
      .filter((c) => c.required && !providedKeys.has(c.label.toLowerCase()))
      .map((c) => c.label)
    const unknown = Object.keys(values).filter(
      (k) => !contractLabels.has(k.toLowerCase()),
    )

    return {
      valid: missing.length === 0 && unknown.length === 0,
      missing,
      unknown,
      total: contracts.length,
      provided: Object.keys(values).length,
    }
  }
}
