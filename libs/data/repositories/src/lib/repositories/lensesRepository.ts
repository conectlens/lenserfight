import { supabase } from '@lenserfight/data/supabase'
import { AuthorProfile, LensRecord, LensViewModel, PersonalLensFeedItem, CreateLensDTO, TagRecord, LensVersion, LensVersionParam, CreateLensVersionDTO, ForkNode, ToolRecord } from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

// --- Port (Interface) ---
export interface LensesRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<ApiResponseEnvelope<LensRecord[]>>
  search(query: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<LensRecord[]>>
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
  getTrendingLenses(lang?: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<LensViewModel[]>>
  getPersonalFeed(offset?: number, limit?: number): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>>
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
  getVersionById(versionId: string): Promise<LensVersion | null>
  getLatestVersionId(lensId: string): Promise<string | null>
  getLatestPublishedVersion(lensId: string): Promise<LensVersion | null>
  createVersion(input: CreateLensVersionDTO): Promise<LensVersion>
  publishVersion(versionId: string): Promise<void>
  cloneLens(sourceLensId: string, versionId?: string | null): Promise<string>
  getForkTree(lensId: string, limit?: number): Promise<ForkNode[]>
  getTools(category?: string): Promise<ToolRecord[]>
}

// Fallback data for Mock Mode


// --- Mock Implementation ---

// --- Supabase Implementation ---
// --- Supabase Implementation ---
export class SupabaseLensesRepository implements LensesRepositoryPort {
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (!error) return
    if (normalizedError.code === '42501' || normalizedError.message?.includes('permission denied')) {
      throw new Error(
        'This lens or its associated data is private or hidden and cannot be accessed.'
      )
    }
    if (normalizedError.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }
    throw error
  }

  // Narrow column list for list queries — excludes heavy/unused columns.
  // Single-item reads (create, update, detail) still use '*' via direct .select('*').
  private readonly listLensSelect =
    'id, title, description, lenser_id, author_profile, tags, reaction_totals, visibility, created_at'

  private async getProfileByHandle(handle: string): Promise<AuthorProfile | null> {
    const { data: profile, error } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('handle', handle)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!profile) return null

    return this.mapProfileToAuthor(profile as Partial<AuthorProfile>, profile.id)
  }

  private mapProfileToAuthor(profile: Partial<AuthorProfile> | null | undefined, fallbackId: string): AuthorProfile {
    return {
      id: profile?.id || fallbackId,
      handle: profile?.handle || 'unknown',
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url || null,
    } as AuthorProfile
  }

  private async getProfileById(lenserId: string): Promise<AuthorProfile> {
    const { data: profile } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('id', lenserId)
      .maybeSingle()

    return this.mapProfileToAuthor(profile as Partial<AuthorProfile> | null, lenserId)
  }

  private async getTagsForLens(lensId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase
      .schema('content')
      .from('tag_map')
      .select('tag_id')
      .eq('entity_type', 'lens')
      .eq('entity_id', lensId)

    if (tagMapError) this.handleError(tagMapError)

    const tagIds = (tagMapRows ?? []).map((row) => row.tag_id).filter(Boolean)
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
    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('reaction')
      .eq('entity_type', 'lens')
      .eq('entity_id', lensId)

    if (error) this.handleError(error)

    return (data ?? []).reduce<Record<string, number>>((totals, row) => {
      totals[row.reaction] = (totals[row.reaction] ?? 0) + 1
      return totals
    }, {})
  }

  private async buildOwnerLensRecord(
    baseLens: Pick<LensRecord, 'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'>
  ): Promise<LensRecord> {
    const [translationResult, authorProfile, tags] = await Promise.all([
      supabase
        .schema('content')
        .from('entity_translations')
        .select('title, description, content')
        .eq('entity_type', 'lens')
        .eq('entity_id', baseLens.id)
        .eq('is_original', true)
        .maybeSingle(),
      this.getProfileById(baseLens.lenser_id),
      this.getTagsForLens(baseLens.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)
    const reactionTotals = await this.getLensReactionTotals(baseLens.id)

    return {
      id: baseLens.id,
      lenser_id: baseLens.lenser_id,
      visibility: baseLens.visibility,
      created_at: baseLens.created_at,
      updated_at: baseLens.updated_at,
      title: translationResult.data?.title || 'Untitled',
      description: translationResult.data?.description ?? null,
      content: translationResult.data?.content || '',
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
    } as LensRecord
  }

  private async hydrateLensRecords(
    baseLenses: Pick<
      LensRecord,
      'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'
    >[]
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
      { durationMs: Date.now() - start },
    )
  }

  async search(query: string, offset = 0, limit = 10): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select(this.listLensSelect)
      .ilike('title', `%${query}%`)
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as LensRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
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
      { durationMs: Date.now() - start },
    )
  }

  async sort(order: 'newest' | 'popular', offset = 0, limit = 10): Promise<ApiResponseEnvelope<LensRecord[]>> {
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
        { durationMs: Date.now() - start },
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
      { durationMs: Date.now() - start },
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
  async getTrendingLenses(lang?: string, offset = 0, limit = 20): Promise<ApiResponseEnvelope<LensViewModel[]>> {
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
      { durationMs: Date.now() - start },
    )
  }

  /**
   * Personalized lens feed for an authenticated lenser (Phase 3+4).
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getPersonalFeed(offset = 0, limit = 20): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>> {
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
      { durationMs: Date.now() - start },
    )
  }

  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false
  ): Promise<LensRecord[]> {
    if (includePrivate) {
      const profile = await this.getProfileByHandle(handle)
      if (!profile?.id) return []

      const { data: baseLenses, error } = await supabase
        .schema('lenses')
        .from('lenses')
        .select('id, lenser_id, visibility, created_at, updated_at')
        .eq('lenser_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

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

  async getById(id: string, viewerLenserId?: string): Promise<LensRecord | null> {
    const { data: baseLens, error } = await supabase
      .schema('lenses')
      .from('lenses')
      .select('id, lenser_id, visibility, created_at, updated_at, parent_lens_id, forked_from_execution_id')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!baseLens) return null

    const { data: translation, error: translationError } = await supabase
      .schema('content')
      .from('entity_translations')
      .select('title, description, content')
      .eq('entity_type', 'lens')
      .eq('entity_id', id)
      .eq('is_original', true)
      .maybeSingle()

    if (translationError) this.handleError(translationError)

    const authorProfile = await this.getProfileById(baseLens.lenser_id)
    const tags = await this.getTagsForLens(baseLens.id)

    return {
      id: baseLens.id,
      lenser_id: baseLens.lenser_id,
      visibility: baseLens.visibility,
      created_at: baseLens.created_at,
      updated_at: baseLens.updated_at,
      parent_lens_id: (baseLens as Record<string, unknown>).parent_lens_id as string | null ?? null,
      forked_from_execution_id: (baseLens as Record<string, unknown>).forked_from_execution_id as string | null ?? null,
      title: translation?.title || 'Untitled',
      description: translation?.description ?? null,
      content: translation?.content || '',
      author_profile: authorProfile,
      reaction_totals: {},
      tags,
    } as unknown as LensRecord
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase
        .schema('lensers')
        .from('profiles')
        .select('preferences(language)')
        .eq('user_id', user.id)
        .maybeSingle()
      const lang = (profileData?.preferences as { language?: string } | null)?.language
      if (lang) {
        languageCode = lang
      }
    }

    // Atomic RPC: creates lens + version 1 + version_parameters + translation + tags in one transaction
    const { data: lensId, error: rpcError } = await supabase.schema('lenses').rpc('fn_create_lens', {
      p_visibility: input.visibility,
      p_template_body: input.content,
      p_title: input.title,
      p_description: input.description ?? null,
      p_language_code: languageCode,
      p_params: (input.params ?? []).map((p) => ({
        label: p.label,
        tool_id: p.toolId,
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
    const { error: rpcError } = await supabase.schema('lenses').rpc('fn_update_lens', {
      p_lens_id: id,
      p_template_body: input.content ?? null,
      p_visibility: input.visibility ?? null,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_tag_ids: input.tagIds ?? null,
      p_params: input.params
        ? input.params.map((p) => ({ label: p.label, tool_id: p.toolId }))
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
    const { error } = await supabase.schema('lenses').from('lenses').delete().eq('id', id)
    if (error) this.handleError(error)
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  private mapVersionParam(row: Record<string, unknown>): LensVersionParam {
    const t = (row.tool ?? row) as Record<string, unknown>
    const schema = (t.validation_schema as {
      min?: number | null
      max?: number | null
      urlScheme?: string[] | null
      allowedMimeTypes?: string[] | null
    } | null) ?? null

    const tool: ToolRecord = {
      id: t.id as string,
      key: t.key as string,
      label: (t.label as string | null) ?? null,
      description: (t.description as string | null) ?? null,
      category: (t.category as ToolRecord['category']) ?? 'input',
      type: (t.type as LensVersionParam['tool']['type']) ?? 'text',
      required: (t.required as boolean) ?? true,
      minLength: (t.min_length as number) ?? 0,
      maxLength: (t.max_length as number) ?? 10000,
      placeholder: (t.placeholder as string | null) ?? null,
      helpText: (t.help_text as string | null) ?? null,
      validationSchema: schema,
      options: (t.options as { label: string; value: string }[] | null) ?? null,
      sortOrder: (t.sort_order as number) ?? 0,
      isSystem: (t.is_system as boolean) ?? false,
      icon: (t.icon as string | null) ?? null,
      color: (t.color as string | null) ?? null,
    }

    return {
      id: row.id as string,
      versionId: (row.version_id as string) ?? (row.versionId as string),
      label: row.label as string,
      toolId: (row.tool_id as string) ?? (row.toolId as string),
      tool,
    }
  }

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

  async getVersions(lensId: string): Promise<LensVersion[]> {
    const { data, error } = await supabase
      .schema('lenses')
      .rpc('fn_list_versions', { p_lens_id: lensId })
    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapVersion(row))
  }

  async getVersionById(versionId: string): Promise<LensVersion | null> {
    const { data: vRow, error: vError } = await supabase
      .schema('lenses')
      .from('versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle()
    if (vError) this.handleError(vError)
    if (!vRow) return null

    // Render template_body: replace [[:uuid]] tokens with [[label]] for display/editing
    const { data: renderedBody } = await supabase
      .schema('lenses')
      .rpc('fn_render_version_body', { p_version_id: versionId })

    // Fetch params enriched with tool details via RPC
    const { data: paramsJson, error: pError } = await supabase
      .schema('lenses')
      .rpc('fn_get_version_params_with_tools', { p_version_id: versionId })
    if (pError) this.handleError(pError)

    const version = this.mapVersion(vRow as Record<string, unknown>)
    if (renderedBody) version.templateBody = renderedBody as string
    version.parameters = ((paramsJson ?? []) as Record<string, unknown>[]).map((p) => this.mapVersionParam(p))
    return version
  }

  async getLatestVersionId(lensId: string): Promise<string | null> {
    const { data } = await supabase
      .schema('lenses')
      .from('versions')
      .select('id')
      .eq('lens_id', lensId)
      .neq('status', 'archived')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data as { id: string } | null)?.id ?? null
  }

  async getLatestPublishedVersion(lensId: string): Promise<LensVersion | null> {
    const { data, error } = await supabase
      .schema('lenses')
      .from('vw_lens_version_history')
      .select('*')
      .eq('lens_id', lensId)
      .eq('status', 'published')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) this.handleError(error)
    if (!data) return null
    return this.mapVersion(data as Record<string, unknown>)
  }

  async createVersion(input: CreateLensVersionDTO): Promise<LensVersion> {
    const { data: vRow, error: vError } = await supabase
      .schema('lenses')
      .rpc('fn_create_draft_version', {
        p_lens_id: input.lensId,
        p_template_body: input.templateBody,
        p_changelog: input.changelog ?? null,
        p_parent_version_id: input.parentVersionId ?? null,
      })
    if (vError) this.handleError(vError)

    const version = this.mapVersion(vRow as Record<string, unknown>)

    if (input.parameters?.length) {
      const paramRows = input.parameters.map((p) => ({
        version_id: version.id,
        label: p.label,
        tool_id: p.toolId,
      }))
      const { error: pError } = await supabase
        .schema('lenses')
        .from('version_parameters')
        .insert(paramRows)
      if (pError) this.handleError(pError)

      const { data: paramsJson } = await supabase
        .schema('lenses')
        .rpc('fn_get_version_params_with_tools', { p_version_id: version.id })
      version.parameters = ((paramsJson ?? []) as Record<string, unknown>[]).map((p) =>
        this.mapVersionParam(p)
      )
    }

    return version
  }

  async publishVersion(versionId: string): Promise<void> {
    const { error } = await supabase
      .schema('lenses')
      .rpc('fn_publish_version', { p_version_id: versionId })
    if (error) this.handleError(error)
  }

  async cloneLens(sourceLensId: string, versionId?: string | null): Promise<string> {
    const { data, error } = await supabase
      .schema('lenses')
      .rpc('fn_clone_lens', {
        p_source_lens_id: sourceLensId,
        p_version_id: versionId ?? null,
      })
    if (error) this.handleError(error)
    return data as string
  }

  async getTools(category?: string): Promise<ToolRecord[]> {
    const { data, error } = await supabase
      .schema('lenses')
      .rpc('fn_list_tools', { p_category: category ?? null })
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
    const { data, error } = await supabase
      .schema('lenses')
      .from('vw_fork_history')
      .select('*')
      .eq('lens_id', lensId)
      .order('depth', { ascending: true })
      .limit(limit)
    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
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
