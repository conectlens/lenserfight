import { hydrateVersionParams } from '@lenserfight/domain/lens-parameters'
import { supabase } from '@lenserfight/data/supabase'
import { isValidUUID } from '@lenserfight/utils/validation'
import {
  AuthorProfile,
  LensRecord,
  LensViewModel,
  PersonalLensFeedItem,
  CreateLensDTO,
  TagRecord,
  LensVersion,
  CreateLensVersionDTO,
  ForkNode,
  ToolRecord,
} from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from '@lenserfight/api/contracts'

// --- Port (Interface) ---
export interface LensesRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<ApiResponseEnvelope<LensRecord[]>>
  search(
    query: string,
    offset?: number,
    limit?: number,
    ownerId?: string | null
  ): Promise<ApiResponseEnvelope<LensRecord[]>>
  filterByTag(
    tagSlug: string | null,
    sort?: string,
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<LensRecord[]>>
  sort(
    order: 'newest' | 'popular',
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<LensRecord[]>>
  getTopLenses(limit: number): Promise<LensRecord[]>
  getTrendingLenses(
    lang?: string,
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<LensViewModel[]>>
  getPersonalFeed(
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>>
  getFollowingFeed(
    lenserId: string,
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<LensViewModel[]>>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<LensRecord[]>
  getById(id: string, viewerLenserId?: string): Promise<LensRecord | null>
  getTags(templateId: string): Promise<TagRecord[]>
  createLens(input: CreateLensDTO): Promise<LensRecord>
  updateLens(id: string, input: Partial<CreateLensDTO>): Promise<LensRecord>
  deleteLens(id: string): Promise<void>
  // ─── Versioning ───────────────────────────────────────────────────────────
  getVersions(lensId: string): Promise<LensVersion[]>
  getVersionsPaginated(lensId: string, limit: number, offset: number): Promise<LensVersion[]>
  getVersionById(versionId: string): Promise<LensVersion | null>
  getLatestVersionId(lensId: string): Promise<string | null>
  getLatestPublishedVersion(lensId: string): Promise<LensVersion | null>
  getHeadVersion(lensId: string): Promise<LensVersion | null>
  createVersion(input: CreateLensVersionDTO): Promise<LensVersion>
  publishVersion(versionId: string): Promise<void>
  cloneLens(sourceLensId: string, versionId?: string | null): Promise<string>
  getForkTree(lensId: string, limit?: number): Promise<ForkNode[]>
  getTools(category?: string): Promise<ToolRecord[]>
  getMyLenses(offset?: number, limit?: number): Promise<ApiResponseEnvelope<LensRecord[]>>
  getLatestVersion(lensId: string): Promise<LensVersion | null>
  updateVersionParams(
    versionId: string,
    params: Array<{ label: string; toolId: string }>
  ): Promise<void>
}

// Fallback data for Mock Mode

// --- Mock Implementation ---

// --- Supabase Implementation ---
// --- Supabase Implementation ---
export class SupabaseLensesRepository implements LensesRepositoryPort {
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (!error) return
    if (
      normalizedError.code === '42501' ||
      normalizedError.message?.includes('permission denied')
    ) {
      throw new Error(
        'This lens or its associated data is private or hidden and cannot be accessed.'
      )
    }
    if (normalizedError.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }
    throw error
  }

  // Narrow column list for list queries — excludes heavy/unused columns:
  //   content           — full template body; only needed on the detail page
  //   updated_at        — not shown in list cards
  //   parent_lens_id    — fork metadata; resolved on demand in detail
  //   forked_from_execution_id — fork metadata; not needed in feed
  //   head_version_id   — version metadata; resolved on demand
  // Single-item reads (create, update, detail) still use '*' via direct .select('*').
  private readonly listLensSelect =
    'id, title, description, lenser_id, author_profile, tags, reaction_totals, visibility, created_at'

  private async getProfileByHandle(handle: string): Promise<AuthorProfile | null> {
    const { data, error } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_handle: handle,
    })
    if (error) this.handleError(error)
    const row = (Array.isArray(data) ? data[0] : null) as Partial<AuthorProfile> | null
    if (!row) return null
    return this.mapProfileToAuthor(row, (row as { id: string }).id)
  }

  private mapProfileToAuthor(
    profile: Partial<AuthorProfile> | null | undefined,
    fallbackId: string
  ): AuthorProfile {
    return {
      id: profile?.id || fallbackId,
      handle: profile?.handle || 'unknown',
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url || null,
    } as AuthorProfile
  }

  private async getProfileById(lenserId: string): Promise<AuthorProfile> {
    const { data } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_lenser_id: lenserId,
    })
    const row = (Array.isArray(data) ? data[0] : null) as Partial<AuthorProfile> | null
    return this.mapProfileToAuthor(row, lenserId)
  }

  private async getTagsForLens(lensId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase.rpc('fn_get_entity_tag_ids', {
      p_entity_type: 'lens',
      p_entity_id: lensId,
    })

    if (tagMapError) this.handleError(tagMapError)

    const tagIds = ((tagMapRows ?? []) as { tag_id: string }[])
      .map((row) => row.tag_id)
      .filter(Boolean)
    if (tagIds.length === 0) return []

    const { data: tags, error: tagsError } = await supabase
      .from('vw_tags_public_stats')
      .select('id, slug, name')
      .in('id', tagIds)

    if (tagsError) this.handleError(tagsError)

    const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]))
    return tagIds
      .map((id) => tagById.get(id))
      .filter((tag): tag is NonNullable<typeof tag> => tag != null)
      .map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      }))
  }

  private async getLensReactionTotals(lensId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('fn_get_entity_reaction_counts', {
      p_entity_type: 'lens',
      p_entity_id: lensId,
    })
    if (error) this.handleError(error)
    return (data ?? {}) as Record<string, number>
  }

  private async buildOwnerLensRecord(
    baseLens: Pick<LensRecord, 'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'>
  ): Promise<LensRecord> {
    const [translationResult, authorProfile, tags] = await Promise.all([
      supabase.rpc('fn_get_entity_translation', {
        p_entity_type: 'lens',
        p_entity_id: baseLens.id,
      }),
      this.getProfileById(baseLens.lenser_id),
      this.getTagsForLens(baseLens.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)
    const translationRow = (
      Array.isArray(translationResult.data) ? translationResult.data[0] : null
    ) as { title?: string; description?: string; content?: string } | null
    const reactionTotals = await this.getLensReactionTotals(baseLens.id)

    return {
      id: baseLens.id,
      lenser_id: baseLens.lenser_id,
      visibility: baseLens.visibility,
      created_at: baseLens.created_at,
      updated_at: baseLens.updated_at,
      title: translationRow?.title || 'Untitled',
      description: translationRow?.description ?? null,
      content: translationRow?.content || '',
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
    } as LensRecord
  }

  private async hydrateLensRecords(
    baseLenses: Pick<LensRecord, 'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'>[]
  ): Promise<LensRecord[]> {
    return Promise.all(baseLenses.map((lens) => this.buildOwnerLensRecord(lens)))
  }

  // -----------------------------------------------------
  // READ OPERATIONS (Views only, never touching base tables)
  // -----------------------------------------------------

  async getAll(offset = 0, limit = 10): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select(this.listLensSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as LensRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async search(
    query: string,
    offset = 0,
    limit = 10,
    ownerId?: string | null
  ): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    let publicQuery = supabase
      .from('vw_lenses_public')
      .select(this.listLensSelect)
      .ilike('title', `%${query}%`)
    if (ownerId) publicQuery = publicQuery.eq('lenser_id', ownerId)
    const { data, error } = await publicQuery.range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    const publicResults = (data ?? []) as unknown as LensRecord[]

    let privateResults: LensRecord[] = []
    if (ownerId) {
      const { data: privData } = await supabase.rpc('fn_list_my_private_lenses', {
        p_limit: limit,
        p_cursor: null,
      })

      if (privData) {
        const privateRows = (privData as unknown as Array<{ id: string; title?: string }>).filter(
          (r) =>
            (r as unknown as { title?: string }).title?.toLowerCase().includes(query.toLowerCase())
        )
        const publicIds = new Set(publicResults.map((r) => r.id))
        privateResults = (privateRows as unknown as LensRecord[]).filter(
          (r) => !publicIds.has(r.id)
        )
      }
    }

    const combined = [...privateResults, ...publicResults]
    return paginatedResponse(
      combined,
      { limit, offset, hasNextPage: combined.length >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async filterByTag(
    tagSlug: string | null,
    sort = 'newest',
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensRecord[]>> {
    if (!tagSlug) return this.getAll(offset, limit)

    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_lenses_by_tag', {
      p_tag_slug: tagSlug,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as LensRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async sort(
    order: 'newest' | 'popular',
    offset = 0,
    limit = 10
  ): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()

    if (order === 'newest') {
      const { data, error } = await supabase
        .from('vw_lenses_public')
        .select(this.listLensSelect)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) this.handleError(error)
      return paginatedResponse(
        (data ?? []) as unknown as LensRecord[],
        { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
        { durationMs: Date.now() - start }
      )
    }

    // popular: fn_content_get_popular_lenses orders by hot_score (pre-computed
    // batch aggregate) — avoids a full 765K-row scan on the computed copy_count column.
    const { data, error } = await supabase.rpc('fn_content_get_popular_lenses', {
      p_limit: limit,
      p_offset: offset,
    })
    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as LensRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async getTopLenses(limit: number): Promise<LensRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_get_popular_lenses', {
      p_limit: limit,
      p_offset: 0,
    })
    if (error) this.handleError(error)
    return (data ?? []) as unknown as LensRecord[]
  }

  /**
   * Trending lenses via hot score RPC with optional language boost.
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getTrendingLenses(
    lang?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_trending_lenses', {
      p_lang: lang ?? null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: LensViewModel[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        usageCount: reactionTotals['copy'] ?? 0,
        createdAt: row.created_at as string,
        visibility: 'public' as const,
        status: 'published' as const,
      }
    })
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start }
    )
  }

  /**
   * Personalized lens feed for an authenticated lenser (Phase 3+4).
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getPersonalFeed(
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_personal_lenses', {
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: PersonalLensFeedItem[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        usageCount: reactionTotals['copy'] ?? 0,
        createdAt: row.created_at as string,
        visibility: 'public' as const,
        status: 'published' as const,
        hotScore: (row.hot_score as number) ?? undefined,
        primaryLanguage: (row.primary_language as string) ?? undefined,
        personalScore: (row.personal_score as number) ?? 0,
      }
    })
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async getFollowingFeed(
    lenserId: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_following_lenses', {
      p_lenser_id: lenserId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: LensViewModel[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        usageCount: reactionTotals['copy'] ?? 0,
        createdAt: row.created_at as string,
        visibility: 'public' as const,
        status: 'published' as const,
      }
    })

    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async getMyLenses(offset = 0, limit = 20): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_get_my_lenses', {
      p_offset: offset,
      p_limit: limit,
    })
    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as LensRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start }
    )
  }

  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false
  ): Promise<LensRecord[]> {
    if (includePrivate) {
      const { data: baseLenses, error } = await supabase.rpc('fn_list_my_private_lenses', {
        p_limit: limit,
        p_cursor: null,
      })

      if (error) this.handleError(error)
      return this.hydrateLensRecords((baseLenses ?? []) as LensRecord[])
    }

    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select(this.listLensSelect)
      .eq('lenser_handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as LensRecord[]
  }

  async getById(id: string, _viewerLenserId?: string): Promise<LensRecord | null> {
    if (!isValidUUID(id)) return null
    const { data, error } = await supabase.rpc('fn_get_lens_detail_bootstrap', {
      p_lens_id: id,
    })
    if (error) this.handleError(error)

    const row = (typeof data === 'object' && data !== null ? data : null) as Record<
      string,
      unknown
    > | null
    if (!row || row['error'] === 'not_found') return null

    const authorRaw = (row['author_profile'] as Record<string, string | null>) ?? {}
    const authorProfile: AuthorProfile = {
      id: authorRaw['id'] ?? id,
      handle: authorRaw['handle'] ?? 'unknown',
      display_name: authorRaw['display_name'] ?? 'Unknown',
      avatar_url: authorRaw['avatar_url'] ?? null,
    }

    const latestVersionRaw = row['latest_published_version'] as Record<string, unknown> | null
    const latestVersion = latestVersionRaw
      ? this.mapBootstrapVersion(latestVersionRaw, row['id'] as string)
      : null

    return {
      id: row['id'] as string,
      lenser_id: row['lenser_id'] as string,
      visibility: row['visibility'] as string,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      parent_lens_id: (row['parent_lens_id'] as string | null) ?? null,
      forked_from_execution_id: (row['forked_from_execution_id'] as string | null) ?? null,
      head_version_id: (row['head_version_id'] as string | null) ?? null,
      title: row['title'] as string,
      description: (row['description'] as string | null) ?? null,
      content: latestVersionRaw
        ? ((latestVersionRaw['template_body'] as string) ?? (row['content'] as string) ?? '')
        : ((row['content'] as string) ?? ''),
      author_profile: authorProfile,
      tags: (row['tags'] as TagRecord[]) ?? [],
      reaction_totals: (row['reaction_totals'] as Record<string, number>) ?? {},
      // Carry bootstrap-derived data for the service layer to consume
      _bootstrap: row,
      _latestPublishedVersion: latestVersion,
    } as unknown as LensRecord
  }

  private mapBootstrapVersion(versionRaw: Record<string, unknown>, lensId: string): LensVersion {
    const version = this.mapVersion({ ...versionRaw, lens_id: lensId })
    version.parameters = hydrateVersionParams(versionRaw['parameters'])
    return version
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select('tags')
      .eq('id', templateId)
      .maybeSingle()

    if (error) return []
    return (data?.tags as TagRecord[]) || []
  }

  // -----------------------------------------------------
  // WRITE OPERATIONS (RPC-only, secure, RLS-safe)
  // -----------------------------------------------------

  async createLens(input: CreateLensDTO): Promise<LensRecord> {
    // Resolve the content language from the authenticated user's profile.
    let languageCode = 'en'
    const { data: profileData } = await supabase.rpc('fn_lensers_get_active_profile')
    const lang = (profileData as Record<string, unknown> | null)?.['language'] as string | undefined
    if (lang) {
      languageCode = lang
    }

    // Atomic RPC: creates lens + version 1 + version_parameters + translation + tags in one transaction
    const { data: lensId, error: rpcError } = await supabase.rpc('fn_create_lens', {
      p_visibility: input.visibility,
      p_template_body: input.content,
      p_title: input.title,
      p_description: input.description ?? null,
      p_language_code: languageCode,
      p_params: (input.params ?? []).map((p) => ({
        label: p.label,
        tool_id: p.toolId,
        optional: p.optional ?? false,
        ...(p.options?.length ? { options: p.options } : {}),
      })),
      p_tag_ids: input.tagIds ?? [],
      p_parent_lens_id: input.parentLensId ?? null,
      p_forked_from_execution_id: input.forkedFromExecutionId ?? null,
    })

    if (rpcError) this.handleError(rpcError)
    if (!lensId) throw new Error('Failed to create lens')

    // Fetch from view
    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select('*')
      .eq('id', lensId)
      .maybeSingle()

    if (error) this.handleError(error)

    if (!data) {
      // If lens is private, it won't show in the public view.
      return {
        id: lensId,
        visibility: input.visibility,
        created_at: new Date().toISOString(),
        title: input.title,
        description: input.description,
        content: input.content,
        reaction_totals: {},
        author_profile: {},
        tags: [],
      } as unknown as LensRecord
    }

    return data as unknown as LensRecord
  }

  async updateLens(id: string, input: Partial<CreateLensDTO>): Promise<LensRecord> {
    // Atomic RPC: updates visibility, template body (via version upsert),
    // version_parameters, translation, and tags in one transaction
    const { error: rpcError } = await supabase.rpc('fn_update_lens', {
      p_lens_id: id,
      p_template_body: input.content ?? null,
      p_visibility: input.visibility ?? null,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_tag_ids: input.tagIds ?? null,
      p_params: input.params
        ? input.params.map((p) => ({
            label: p.label,
            tool_id: p.toolId,
            optional: p.optional ?? false,
            ...(p.options?.length ? { options: p.options } : {}),
          }))
        : null,
    })

    if (rpcError) this.handleError(rpcError)

    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)

    if (!data) {
      // Fallback for private update
      return {
        id,
        visibility: input.visibility,
        title: input.title,
        description: input.description,
        content: input.content,
      } as unknown as LensRecord
    }

    return data as unknown as LensRecord
  }

  async deleteLens(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_lens', {
      p_lens_id: id,
    })
    if (error) this.handleError(error)
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  private mapVersion(row: Record<string, unknown>): LensVersion {
    return {
      id: row.id as string,
      lensId: row.lens_id as string,
      versionNumber: row.version_number as number,
      templateBody: row.template_body as string,
      status: row.status as LensVersion['status'],
      changelog: (row.changelog as string | null) ?? null,
      parentVersionId: (row.parent_version_id as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      createdAt: row.created_at as string,
      parameterCount: (row.parameter_count as number | null) ?? undefined,
    }
  }

  async getHeadVersion(lensId: string): Promise<LensVersion | null> {
    if (!isValidUUID(lensId)) return null
    const { data, error } = await supabase.rpc('fn_get_lens_for_execution', {
      p_lens_id: lensId,
    })
    if (error) this.handleError(error)
    const row = (Array.isArray(data) ? data[0] : data) as { head_version_id?: string } | null
    const headId = row?.head_version_id
    if (!headId) return null
    return this.getVersionById(headId)
  }

  async getVersions(lensId: string): Promise<LensVersion[]> {
    const { data, error } = await supabase.rpc('fn_list_lens_versions', {
      p_lens_id: lensId,
      p_include_archived: false,
    })
    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapVersion(row))
  }

  async getVersionsPaginated(
    lensId: string,
    limit: number,
    offset: number
  ): Promise<LensVersion[]> {
    const { data, error } = await supabase.rpc('fn_list_lens_versions', {
      p_lens_id: lensId,
      p_include_archived: false,
    })
    if (error) this.handleError(error)
    const rows = ((data ?? []) as Record<string, unknown>[]).slice(offset, offset + limit)
    return rows.map((row) => ({
      id: row.id as string,
      lensId: row.lens_id as string,
      versionNumber: row.version_number as number,
      templateBody: '',
      status: row.status as LensVersion['status'],
      changelog: (row.changelog as string | null) ?? null,
      createdAt: row.created_at as string,
      parameterCount: (row.parameter_count as number | null) ?? undefined,
    }))
  }

  async getVersionById(versionId: string): Promise<LensVersion | null> {
    const { data: versionData, error: vError } = await supabase.rpc('fn_get_lens_version_detail', {
      p_version_id: versionId,
    })
    if (vError) this.handleError(vError)
    const vRow = (Array.isArray(versionData) ? versionData[0] : versionData) as
      | Record<string, unknown>
      | undefined
    if (!vRow) return null

    const { data: paramsJson, error: pError } = await supabase.rpc(
      'fn_get_lens_version_parameters',
      {
        p_version_id: versionId,
      }
    )
    if (pError) this.handleError(pError)

    const version = this.mapVersion(vRow)
    version.parameters = hydrateVersionParams(paramsJson)
    return version
  }

  async getLatestVersionId(lensId: string): Promise<string | null> {
    const { data } = await supabase.rpc('fn_list_lens_versions', {
      p_lens_id: lensId,
      p_include_archived: false,
    })
    const rows = (data ?? []) as Array<{ id: string; version_number: number }>
    if (rows.length === 0) return null
    return rows.reduce(
      (best, row) => (row.version_number > best.version_number ? row : best),
      rows[0]
    ).id
  }

  /** Returns the latest non-archived version regardless of publish status (draft OK). */
  async getLatestVersion(lensId: string): Promise<LensVersion | null> {
    const { data, error } = await supabase.rpc('fn_list_lens_versions', {
      p_lens_id: lensId,
      p_include_archived: false,
    })
    if (error) this.handleError(error)
    const rows = (data ?? []) as Record<string, unknown>[]
    if (rows.length === 0) return null
    const latestRow = rows.reduce(
      (best: Record<string, unknown>, row: Record<string, unknown>) =>
        (row.version_number as number) > (best.version_number as number) ? row : best,
      rows[0]
    )
    const version = this.mapVersion(latestRow)
    const { data: paramsJson } = await supabase.rpc('fn_get_lens_version_parameters', {
      p_version_id: version.id,
    })
    version.parameters = hydrateVersionParams(paramsJson)
    return version
  }

  async getLatestPublishedVersion(lensId: string): Promise<LensVersion | null> {
    if (!isValidUUID(lensId)) return null
    // Use the bootstrap RPC to get the latest published version + params in one call.
    const { data, error } = await supabase.rpc('fn_get_lens_detail_bootstrap', {
      p_lens_id: lensId,
    })
    if (error) this.handleError(error)

    const row = (typeof data === 'object' && data !== null ? data : null) as Record<
      string,
      unknown
    > | null
    if (!row || row['error'] === 'not_found') return null

    const latestVersion = row['latest_published_version'] as Record<string, unknown> | null
    if (!latestVersion) return null

    const version = this.mapVersion({
      ...latestVersion,
      lens_id: lensId,
    })
    version.parameters = hydrateVersionParams(latestVersion['parameters'])
    return version
  }

  async createVersion(input: CreateLensVersionDTO): Promise<LensVersion> {
    const { data: vRow, error: vError } = await supabase.rpc('fn_create_draft_version', {
      p_lens_id: input.lensId,
      p_template_body: input.templateBody,
      p_changelog: input.changelog ?? null,
      p_parent_version_id: input.parentVersionId ?? null,
    })
    if (vError) this.handleError(vError)

    const version = this.mapVersion(vRow as Record<string, unknown>)

    if (input.parameters?.length) {
      const { data: paramsJson } = await supabase.rpc('fn_get_lens_version_parameters', {
        p_version_id: version.id,
      })
      version.parameters = hydrateVersionParams(paramsJson)
    }

    return version
  }

  async publishVersion(versionId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_publish_version', { p_version_id: versionId })
    if (error) this.handleError(error)
  }

  /** Replace the parameter definitions for a lens version (full replace). */
  async updateVersionParams(
    versionId: string,
    params: Array<{ label: string; toolId: string; optional?: boolean }>
  ): Promise<void> {
    const { error } = await supabase.rpc('fn_update_lens_version_params', {
      p_version_id: versionId,
      p_params: params.map((p) => ({ label: p.label, tool_id: p.toolId, optional: p.optional ?? false })),
    })
    if (error) this.handleError(error)
  }

  async cloneLens(sourceLensId: string, versionId?: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('fn_clone_lens', {
      p_source_lens_id: sourceLensId,
      p_version_id: versionId ?? null,
    })
    if (error) this.handleError(error)
    return data as string
  }

  async getTools(category?: string): Promise<ToolRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_tools', { p_category: category ?? null })
    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((t) => ({
      id: t.id as string,
      key: t.key as string,
      label: (t.label as string | null) ?? null,
      description: (t.description as string | null) ?? null,
      category: (t.category as ToolRecord['category']) ?? 'input',
      type: (t.type as ToolRecord['type']) ?? 'text',
      required: (t.required as boolean) ?? true,
      minLength: (t.min_length as number) ?? 0,
      maxLength: (t.max_length as number) ?? 10000,
      placeholder: (t.placeholder as string | null) ?? null,
      helpText: (t.help_text as string | null) ?? null,
      validationSchema: (t.validation_schema as ToolRecord['validationSchema']) ?? null,
      options: (t.options as ToolRecord['options']) ?? null,
      sortOrder: (t.sort_order as number) ?? 0,
      isSystem: (t.is_system as boolean) ?? false,
      icon: (t.icon as string | null) ?? null,
      color: (t.color as string | null) ?? null,
    }))
  }

  async getForkTree(lensId: string, limit = 100): Promise<ForkNode[]> {
    const { data, error } = await supabase.rpc('fn_get_lens_fork_tree', {
      p_lens_id: lensId,
    })
    if (error) this.handleError(error)
    const tree = (Array.isArray(data) ? data : [data]).filter(Boolean) as Record<string, unknown>[]
    return tree.slice(0, limit).map((row) => ({
      lensId: row.lens_id as string,
      forkedFromLensId: row.forked_from_lens_id as string,
      forkedFromTitle: row.forked_from_title as string,
      depth: row.depth as number,
      forkedFromLenserId: row.forked_from_lenser_id as string,
      forkedFromLenserName: row.forked_from_lenser_name as string,
      forkedFromLenserHandle: row.forked_from_lenser_handle as string,
      forkedFromLenserAvatarUrl: (row.forked_from_lenser_avatar_url as string | null) ?? null,
      forkedFromVersionId: (row.forked_from_version_id as string | null) ?? null,
      forkedFromVersionNumber: (row.forked_from_version_number as number | null) ?? null,
    }))
  }
}
