import { supabase } from '@lenserfight/data/supabase'
import { AuthorProfile, PromptParam, PromptTemplateRecord, PromptTemplateViewModel, PersonalPromptFeedItem, CreatePromptDTO, TagRecord, PromptVersion, PromptVersionParam, CreatePromptVersionDTO } from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from 'contracts'

// --- Port (Interface) ---
export interface PromptsRepositoryPort {
  getAll(offset?: number, limit?: number): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>>
  search(query: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>>
  filterByTag(
    tagSlug: string | null,
    sort?: string,
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>>
  sort(
    order: 'newest' | 'popular',
    offset?: number,
    limit?: number
  ): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>>
  getTopPrompts(limit: number): Promise<PromptTemplateRecord[]>
  getTrendingPrompts(lang?: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>>
  getPersonalFeed(offset?: number, limit?: number): Promise<ApiResponseEnvelope<PersonalPromptFeedItem[]>>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<PromptTemplateRecord[]>
  getById(id: string, viewerLenserId?: string): Promise<PromptTemplateRecord | null>
  getTags(templateId: string): Promise<TagRecord[]>
  createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord>
  updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord>
  deletePrompt(id: string): Promise<void>
  // ─── Versioning ───────────────────────────────────────────────────────────
  getVersions(promptId: string): Promise<PromptVersion[]>
  getVersionById(versionId: string): Promise<PromptVersion | null>
  getLatestPublishedVersion(promptId: string): Promise<PromptVersion | null>
  createVersion(input: CreatePromptVersionDTO): Promise<PromptVersion>
  publishVersion(versionId: string): Promise<void>
}

// Fallback data for Mock Mode


// --- Mock Implementation ---

// --- Supabase Implementation ---
// --- Supabase Implementation ---
export class SupabasePromptsRepository implements PromptsRepositoryPort {
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (!error) return
    if (normalizedError.code === '42501' || normalizedError.message?.includes('permission denied')) {
      throw new Error(
        'This prompt or its associated data is private or hidden and cannot be accessed.'
      )
    }
    if (normalizedError.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }
    throw error
  }

  // Narrow column list for list queries — excludes heavy/unused columns.
  // Single-item reads (create, update, detail) still use '*' via direct .select('*').
  private readonly listPromptSelect =
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

  private async getTagsForPrompt(promptId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase
      .schema('content')
      .from('tag_map')
      .select('tag_id')
      .eq('entity_type', 'prompt_template')
      .eq('entity_id', promptId)

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
      .filter(Boolean)
      .map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      }))
  }

  private async getPromptReactionTotals(promptId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .schema('content')
      .from('reactions')
      .select('reaction')
      .eq('entity_type', 'prompt_template')
      .eq('entity_id', promptId)

    if (error) this.handleError(error)

    return (data ?? []).reduce<Record<string, number>>((totals, row) => {
      totals[row.reaction] = (totals[row.reaction] ?? 0) + 1
      return totals
    }, {})
  }

  private async buildOwnerPromptRecord(
    basePrompt: Pick<PromptTemplateRecord, 'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'>
  ): Promise<PromptTemplateRecord> {
    const [translationResult, authorProfile, tags] = await Promise.all([
      supabase
        .schema('content')
        .from('entity_translations')
        .select('title, description, content, params')
        .eq('entity_type', 'prompt_template')
        .eq('entity_id', basePrompt.id)
        .eq('is_original', true)
        .maybeSingle(),
      this.getProfileById(basePrompt.lenser_id),
      this.getTagsForPrompt(basePrompt.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)
    const reactionTotals = await this.getPromptReactionTotals(basePrompt.id)

    return {
      id: basePrompt.id,
      lenser_id: basePrompt.lenser_id,
      visibility: basePrompt.visibility,
      created_at: basePrompt.created_at,
      updated_at: basePrompt.updated_at,
      title: translationResult.data?.title || 'Untitled',
      description: translationResult.data?.description ?? null,
      content: translationResult.data?.content || '',
      params: (translationResult.data?.params ?? []) as PromptParam[],
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
    } as PromptTemplateRecord
  }

  private async hydratePromptRecords(
    basePrompts: Pick<
      PromptTemplateRecord,
      'id' | 'lenser_id' | 'visibility' | 'created_at' | 'updated_at'
    >[]
  ): Promise<PromptTemplateRecord[]> {
    return Promise.all(basePrompts.map((prompt) => this.buildOwnerPromptRecord(prompt)))
  }

  // -----------------------------------------------------
  // READ OPERATIONS (Views only, never touching base tables)
  // -----------------------------------------------------

  async getAll(offset = 0, limit = 10): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.listPromptSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as PromptTemplateRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  async search(query: string, offset = 0, limit = 10): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.listPromptSelect)
      .ilike('title', `%${query}%`)
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as PromptTemplateRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  async filterByTag(
    tagSlug: string | null,
    sort = 'newest',
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>> {
    if (!tagSlug) return this.getAll(offset, limit)

    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_prompts_by_tag', {
      p_tag_slug: tagSlug,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as PromptTemplateRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  async sort(order: 'newest' | 'popular', offset = 0, limit = 10): Promise<ApiResponseEnvelope<PromptTemplateRecord[]>> {
    const start = Date.now()

    if (order === 'newest') {
      const { data, error } = await supabase
        .from('vw_prompt_templates_public')
        .select(this.listPromptSelect)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) this.handleError(error)
      return paginatedResponse(
        (data ?? []) as unknown as PromptTemplateRecord[],
        { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
        { durationMs: Date.now() - start },
      )
    }

    // popular: fn_content_get_popular_prompts orders by hot_score (pre-computed
    // batch aggregate) — avoids a full 765K-row scan on the computed copy_count column.
    const { data, error } = await supabase.rpc('fn_content_get_popular_prompts', {
      p_limit: limit,
      p_offset: offset,
    })
    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as PromptTemplateRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  async getTopPrompts(limit: number): Promise<PromptTemplateRecord[]> {
    const { data, error } = await supabase.rpc('fn_content_get_popular_prompts', {
      p_limit: limit,
      p_offset: 0,
    })
    if (error) this.handleError(error)
    return (data ?? []) as unknown as PromptTemplateRecord[]
  }

  /**
   * Trending prompts via hot score RPC with optional language boost.
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getTrendingPrompts(lang?: string, offset = 0, limit = 20): Promise<ApiResponseEnvelope<PromptTemplateViewModel[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_trending_prompts', {
      p_lang: lang ?? null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: PromptTemplateViewModel[] = rows.map((row) => {
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
      }
    })
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start },
    )
  }

  /**
   * Personalized prompt feed for an authenticated lenser (Phase 3+4).
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getPersonalFeed(offset = 0, limit = 20): Promise<ApiResponseEnvelope<PersonalPromptFeedItem[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_personal_prompts', {
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: PersonalPromptFeedItem[] = rows.map((row) => {
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
  ): Promise<PromptTemplateRecord[]> {
    if (includePrivate) {
      const profile = await this.getProfileByHandle(handle)
      if (!profile?.id) return []

      const { data: basePrompts, error } = await supabase
        .schema('content')
        .from('prompt_templates')
        .select('id, lenser_id, visibility, created_at, updated_at')
        .eq('lenser_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) this.handleError(error)
      return this.hydratePromptRecords((basePrompts ?? []) as PromptTemplateRecord[])
    }

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select(this.listPromptSelect)
      .eq('lenser_handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as PromptTemplateRecord[]
  }

  async getById(id: string, viewerLenserId?: string): Promise<PromptTemplateRecord | null> {
    const { data: basePrompt, error } = await supabase
      .schema('content')
      .from('prompt_templates')
      .select('id, lenser_id, visibility, created_at, updated_at, parent_prompt_id, forked_from_execution_id')
      .eq('id', id)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!basePrompt) return null

    const { data: translation, error: translationError } = await supabase
      .schema('content')
      .from('entity_translations')
      .select('title, description, content, params')
      .eq('entity_type', 'prompt_template')
      .eq('entity_id', id)
      .eq('is_original', true)
      .maybeSingle()

    if (translationError) this.handleError(translationError)

    const authorProfile = await this.getProfileById(basePrompt.lenser_id)
    const tags = await this.getTagsForPrompt(basePrompt.id)

    return {
      id: basePrompt.id,
      lenser_id: basePrompt.lenser_id,
      visibility: basePrompt.visibility,
      created_at: basePrompt.created_at,
      updated_at: basePrompt.updated_at,
      parent_prompt_id: (basePrompt as Record<string, unknown>).parent_prompt_id as string | null ?? null,
      forked_from_execution_id: (basePrompt as Record<string, unknown>).forked_from_execution_id as string | null ?? null,
      title: translation?.title || 'Untitled',
      description: translation?.description ?? null,
      content: translation?.content || '',
      params: ((translation as any)?.params ?? []) as PromptParam[],
      author_profile: authorProfile,
      reaction_totals: {},
      tags,
    } as unknown as PromptTemplateRecord
  }

  async getTags(templateId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select('tags')
      .eq('id', templateId)
      .maybeSingle()

    if (error) return []
    return (data?.tags as TagRecord[]) || []
  }

  // -----------------------------------------------------
  // WRITE OPERATIONS (RPC-only, secure, RLS-safe)
  // -----------------------------------------------------

  async createPrompt(input: CreatePromptDTO): Promise<PromptTemplateRecord> {
    // 1. Resolve the content language from the authenticated user's profile.
    let languageCode = 'en'
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase
        .schema('lensers')
        .from('profiles')
        .select('preferred_language')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileData?.preferred_language) {
        languageCode = profileData.preferred_language
      }
    }

    // 2. Insert Base Prompt Template (lenser_id resolved server-side via DEFAULT lensers.get_auth_lenser_id())
    const insertPayload: Record<string, unknown> = { visibility: input.visibility }
    if (input.parentPromptId) insertPayload.parent_prompt_id = input.parentPromptId
    if (input.forkedFromExecutionId) insertPayload.forked_from_execution_id = input.forkedFromExecutionId

    const { data: promptInsertData, error: rpcError } = await supabase.schema('content').from('prompt_templates').insert(
      insertPayload
    ).select('id').single()

    if (rpcError) this.handleError(rpcError)
    const promptId = promptInsertData.id

    // 3. Insert Prompt Translation
    const { error: translationError } = await supabase.schema('content').from('entity_translations').insert({
      entity_type: 'prompt_template',
      entity_id: promptId,
      language_code: languageCode,
      is_original: true,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      params: input.params ?? [],
    })
    if (translationError) this.handleError(translationError)

    if (input.tagIds?.length) {
      const tagRecords = input.tagIds.map(tagId => ({
        entity_type: 'prompt_template',
        entity_id: promptId,
        tag_id: tagId,
      }))
      await supabase.schema('content').from('tag_map').insert(tagRecords)
    }

    // Fetch from view
    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
      .select('*')
      .eq('id', promptId)
      .maybeSingle()

    if (error) this.handleError(error)

    if (!data) {
      // If prompt is private, it won't show in the public view.
      // We return a "simulated" record so the flow can continue.
      // In a real scenario, we should have a 'vw_prompt_templates_owner' view.
      return {
        id: promptId,
        visibility: input.visibility,
        created_at: new Date().toISOString(),
        title: input.title,
        description: input.description,
        content: input.content,
        reaction_totals: {},
        author_profile: {},
        tags: [],
      } as unknown as PromptTemplateRecord
    }

    return data as unknown as PromptTemplateRecord
  }

  async updatePrompt(id: string, input: Partial<CreatePromptDTO>): Promise<PromptTemplateRecord> {
    const baseUpdatePayload: Partial<Pick<PromptTemplateRecord, 'visibility'>> = {}
    const translationUpdatePayload: Partial<
      Pick<PromptTemplateRecord, 'title' | 'description' | 'content'>
    > = {}

    if (input.visibility !== undefined) baseUpdatePayload.visibility = input.visibility
    if (input.title !== undefined) translationUpdatePayload.title = input.title
    if (input.description !== undefined) translationUpdatePayload.description = input.description
    if (input.content !== undefined) translationUpdatePayload.content = input.content
    if (input.params !== undefined) (translationUpdatePayload as any).params = input.params

    if (Object.keys(baseUpdatePayload).length > 0) {
      const { error: rpcError } = await supabase.schema('content').from('prompt_templates').update(baseUpdatePayload).eq('id', id)
      if (rpcError) this.handleError(rpcError)
    }

    if (Object.keys(translationUpdatePayload).length > 0) {
      const { error } = await supabase.schema('content').from('entity_translations')
        .update(translationUpdatePayload)
        .eq('entity_type', 'prompt_template')
        .eq('entity_id', id)
        .eq('is_original', true)
      if (error) this.handleError(error)
    }

    if (input.tagIds !== undefined) {
      await supabase.schema('content').from('tag_map').delete().eq('entity_type', 'prompt_template').eq('entity_id', id)
      if (input.tagIds.length > 0) {
        const tagRecords = input.tagIds.map(tagId => ({
          entity_type: 'prompt_template',
          entity_id: id,
          tag_id: tagId,
        }))
        await supabase.schema('content').from('tag_map').insert(tagRecords)
      }
    }

    const { data, error } = await supabase
      .from('vw_prompt_templates_public')
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
      } as unknown as PromptTemplateRecord
    }

    return data as unknown as PromptTemplateRecord
  }

  async deletePrompt(id: string): Promise<void> {
    const { error } = await supabase.schema('content').from('prompt_templates').delete().eq('id', id)
    if (error) this.handleError(error)
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  private mapVersionParam(row: Record<string, unknown>): PromptVersionParam {
    return {
      id: row.id as string,
      versionId: row.version_id as string,
      key: row.key as string,
      label: (row.label as string | null) ?? null,
      type: row.type as PromptVersionParam['type'],
      required: row.required as boolean,
      defaultValue: (row.default_value as string | null) ?? null,
      placeholder: (row.placeholder as string | null) ?? null,
      helpText: (row.help_text as string | null) ?? null,
      validationSchema: row.validation_schema ?? null,
      options: (row.options as { label: string; value: string }[] | null) ?? undefined,
      sortOrder: (row.sort_order as number) ?? 0,
    }
  }

  private mapVersion(row: Record<string, unknown>): PromptVersion {
    return {
      id: row.id as string,
      promptId: row.prompt_id as string,
      versionNumber: row.version_number as number,
      templateBody: row.template_body as string,
      status: row.status as PromptVersion['status'],
      changelog: (row.changelog as string | null) ?? null,
      parentVersionId: (row.parent_version_id as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      createdAt: row.created_at as string,
      parameterCount: (row.parameter_count as number | null) ?? undefined,
    }
  }

  async getVersions(promptId: string): Promise<PromptVersion[]> {
    const { data, error } = await supabase
      .schema('content')
      .rpc('fn_content_list_prompt_versions', { p_prompt_id: promptId })
    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((row) => this.mapVersion(row))
  }

  async getVersionById(versionId: string): Promise<PromptVersion | null> {
    const { data: vRow, error: vError } = await supabase
      .schema('content')
      .from('prompt_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle()
    if (vError) this.handleError(vError)
    if (!vRow) return null

    const { data: params, error: pError } = await supabase
      .schema('content')
      .from('prompt_version_parameters')
      .select('*')
      .eq('version_id', versionId)
      .order('sort_order', { ascending: true })
    if (pError) this.handleError(pError)

    const version = this.mapVersion(vRow as Record<string, unknown>)
    version.parameters = ((params ?? []) as Record<string, unknown>[]).map((p) => this.mapVersionParam(p))
    return version
  }

  async getLatestPublishedVersion(promptId: string): Promise<PromptVersion | null> {
    const { data, error } = await supabase
      .schema('content')
      .from('vw_prompt_published_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) this.handleError(error)
    if (!data) return null
    return this.mapVersion(data as Record<string, unknown>)
  }

  async createVersion(input: CreatePromptVersionDTO): Promise<PromptVersion> {
    const { data: vRow, error: vError } = await supabase
      .schema('content')
      .from('prompt_versions')
      .insert({
        prompt_id: input.promptId,
        template_body: input.templateBody,
        changelog: input.changelog ?? null,
        parent_version_id: input.parentVersionId ?? null,
        status: 'draft',
      })
      .select('*')
      .single()
    if (vError) this.handleError(vError)

    const version = this.mapVersion(vRow as Record<string, unknown>)

    if (input.parameters?.length) {
      const paramRows = input.parameters.map((p) => ({
        version_id: version.id,
        key: p.key,
        label: p.label ?? null,
        type: p.type,
        required: p.required,
        default_value: p.defaultValue ?? null,
        placeholder: p.placeholder ?? null,
        help_text: p.helpText ?? null,
        validation_schema: p.validationSchema ?? null,
        options: p.options ?? null,
        sort_order: p.sortOrder,
      }))
      const { data: insertedParams, error: pError } = await supabase
        .schema('content')
        .from('prompt_version_parameters')
        .insert(paramRows)
        .select('*')
      if (pError) this.handleError(pError)
      version.parameters = ((insertedParams ?? []) as Record<string, unknown>[]).map((p) =>
        this.mapVersionParam(p)
      )
    }

    return version
  }

  async publishVersion(versionId: string): Promise<void> {
    const { error } = await supabase
      .schema('content')
      .rpc('fn_content_publish_prompt_version', { p_version_id: versionId })
    if (error) this.handleError(error)
  }

}
