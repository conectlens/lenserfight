import type { SupabaseLikeRpcClient } from './client'
import type {
  LensBrowseFilters,
  SdkContentStatus,
  SdkLensAuthor,
  SdkLensDetail,
  SdkLensParameter,
  SdkLensSummary,
  SdkLensTag,
  SdkLensVersion,
  SdkParameterTool,
  SdkResolvedTemplate,
  SdkVisibility,
} from './types/lenses'
import type { SdkParameterContract } from './types/protocols'

const MAX_LIMIT = 100

type ListRow = Record<string, unknown>

function extractRows(data: unknown): ListRow[] {
  if (!data) return []
  const asObj = data as { data?: unknown[] }
  if (Array.isArray(asObj.data)) return asObj.data as ListRow[]
  if (Array.isArray(data)) return data as ListRow[]
  return []
}

function mapTool(t: ListRow): SdkParameterTool {
  return {
    id: t['id'] as string,
    key: t['key'] as string,
    label: (t['label'] as string | null) ?? null,
    description: (t['description'] as string | null) ?? null,
    category: t['category'] as SdkParameterTool['category'],
    type: t['type'] as string,
    required: (t['required'] as boolean) ?? true,
    placeholder: (t['placeholder'] as string | null) ?? null,
    helpText: (t['help_text'] as string | null) ?? null,
    options: (t['options'] as Array<{ label: string; value: string }> | null) ?? null,
    validationSchema: (t['validation_schema'] as Record<string, unknown> | null) ?? null,
    icon: (t['icon'] as string | null) ?? null,
    color: (t['color'] as string | null) ?? null,
    isSystem: (t['is_system'] as boolean) ?? false,
    maxLength: (t['max_length'] as number | null) ?? null,
    minLength: (t['min_length'] as number | null) ?? null,
    sortOrder: (t['sort_order'] as number) ?? 0,
  }
}

function mapParameter(row: ListRow): SdkLensParameter {
  const toolRaw = row['tool'] as ListRow | null | undefined
  return {
    id: row['id'] as string,
    label: row['label'] as string,
    toolId: (row['tool_id'] as string) ?? '',
    optional: (row['optional'] as boolean) ?? false,
    tool: toolRaw ? mapTool(toolRaw) : null,
  }
}

function mapRow(row: ListRow): SdkLensSummary {
  return {
    id: row['id'] as string,
    title: (row['title'] as string) ?? '',
    description: (row['description'] as string | null) ?? null,
    author: {
      id: (row['lenser_id'] as string) ?? '',
      handle: (row['author_handle'] as string) ?? '',
      displayName: (row['author_handle'] as string) ?? '',
      avatarUrl: null,
    } as SdkLensAuthor,
    tags: Array.isArray(row['tags']) ? (row['tags'] as SdkLensTag[]) : [],
    visibility: (row['visibility'] as SdkVisibility) ?? 'public',
    status: (row['status'] as SdkContentStatus) ?? 'published',
    outputKind: null,
    latestVersionNumber: null,
    createdAt: (row['created_at'] as string) ?? '',
  }
}

export class LensClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Browse public lenses. Uses fn_mcp_lens_list (offset pagination).
   * For text search, uses fn_mcp_lens_search instead.
   * Requires an authenticated client.
   */
  async browse(
    filters: LensBrowseFilters = {},
    offset = 0,
    limit = 20,
  ): Promise<SdkLensSummary[]> {
    const clamped = Math.max(1, Math.min(limit, MAX_LIMIT))

    if (filters.search) {
      const { data, error } = await this.rpcClient.rpc('fn_mcp_lens_search', {
        p_query: filters.search,
        p_visibility: 'public',
        p_limit: clamped,
        p_offset: Math.max(0, offset),
      })
      if (error) {
        throw new Error(`@lenserfight/sdk: fn_mcp_lens_search failed — ${JSON.stringify(error)}`)
      }
      return extractRows(data).map(mapRow)
    }

    const { data, error } = await this.rpcClient.rpc('fn_mcp_lens_list', {
      p_limit: clamped,
      p_offset: Math.max(0, offset),
      p_visibility: 'public',
      p_status: filters.status ?? null,
      p_lenser_id: null,
      p_include_archived: false,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_lens_list failed — ${JSON.stringify(error)}`)
    }
    return extractRows(data).map(mapRow)
  }

  /**
   * Full-text search across public lenses.
   */
  async search(
    query: string,
    filters: Omit<LensBrowseFilters, 'search'> = {},
    offset = 0,
    limit = 20,
  ): Promise<SdkLensSummary[]> {
    return this.browse({ ...filters, search: query }, offset, limit)
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
    if (paramsRes.error) {
      throw new Error(`@lenserfight/sdk: fn_get_lens_version_parameters failed — ${JSON.stringify(paramsRes.error)}`)
    }
    if (!detailRes.data) return null
    const raw = (Array.isArray(detailRes.data) ? detailRes.data[0] : detailRes.data) as ListRow | undefined
    if (!raw) return null
    const paramRows = (Array.isArray(paramsRes.data) ? paramsRes.data : []) as ListRow[]
    const parameters = paramRows.map(mapParameter)
    return {
      id: raw['id'] as string,
      lensId: raw['lens_id'] as string,
      versionNumber: raw['version_number'] as number,
      status: raw['status'] as SdkContentStatus,
      changelog: (raw['changelog'] as string | null) ?? null,
      parameterCount: parameters.length,
      createdAt: raw['created_at'] as string,
      templateBody: raw['template_body'] as string,
      publishedAt: (raw['published_at'] as string | null) ?? null,
      parameters,
    }
  }

  /**
   * Get the latest (HEAD) version of a lens with its parameters.
   * Convenience wrapper: resolves `head_version_id` via `fn_get_lens_detail_bootstrap`,
   * then delegates to `getVersion()`.
   */
  async getLatestVersion(lensId: string): Promise<SdkLensVersion | null> {
    const { data, error } = await this.rpcClient.rpc('fn_get_lens_detail_bootstrap', {
      p_lens_id: lensId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_get_lens_detail_bootstrap failed — ${JSON.stringify(error)}`)
    }
    if (!data || (data as Record<string, unknown>)['error']) return null
    const headVersionId = (data as Record<string, unknown>)['head_version_id'] as string | null
    if (!headVersionId) return null
    return this.getVersion(headVersionId)
  }

  /**
   * Resolve a lens template by substituting `[[:paramId]]` tokens with the
   * supplied values (matched by parameter label, case-insensitive). Returns the
   * filled prompt and lists which parameters were used or missing.
   *
   * Requires an authenticated client (`apiKey` in `createClient`).
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
   * Extract the parameters declared by a lens version — the contracts plus their labels.
   */
  async extractParams(
    versionId: string,
  ): Promise<{ params: SdkParameterContract[]; labels: string[] }> {
    const params = await this.getParameterContracts(versionId)
    return { params, labels: params.map((p) => p.label) }
  }

  /**
   * Validate supplied values against a lens version's parameter contracts.
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
