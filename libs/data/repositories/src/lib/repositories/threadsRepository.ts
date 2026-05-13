import { supabase } from '@lenserfight/data/supabase'
import { AuthorProfile } from '@lenserfight/types'
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO, ThreadFeedItem, PersonalFeedItem } from '@lenserfight/types'
import { ApiResponseEnvelope, paginatedResponse } from '@lenserfight/api/contracts'

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>
  getAllThreads(offset?: number, limit?: number): Promise<ApiResponseEnvelope<ThreadRecord[]>>
  getThreadsByTag(tagSlug: string, sort?: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<ThreadRecord[]>>
  getThreadById(id: string, viewerLenserId?: string): Promise<ThreadRecord | null>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<ThreadRecord[]>
  getThreadTags(threadId: string): Promise<TagRecord[]>
  getThreadReplies(threadId: string, viewerLenserId?: string, limit?: number, offset?: number, visibility?: string): Promise<ThreadReplyRecord[]>
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>
  getTrendingTags(limit: number): Promise<TagRecord[]>
  getTrendingThreads(lang?: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<ThreadFeedItem[]>>
  getPersonalFeed(offset?: number, limit?: number): Promise<ApiResponseEnvelope<PersonalFeedItem[]>>
  getFollowingFeed(lenserId: string, offset?: number, limit?: number): Promise<ApiResponseEnvelope<ThreadFeedItem[]>>
  createReply(
    threadId: string,
    lenserId: string,
    content: string,
    parentReplyId?: string
  ): Promise<ThreadReplyRecord>
  updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord>
  deleteThread(id: string): Promise<void>
}


// --- Mock Implementation ---

// --- Supabase Implementation (Optimized for Views + RPC) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  // All permission issues are normalized to a single message for the UI.
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (normalizedError?.code === '42501' || normalizedError?.message?.includes('permission denied')) {
      throw new Error(
        'This thread or its associated data is private, hidden, or you do not have permission to access it.'
      )
    }

    // PGRST116 = "result contains 0 rows" when expecting single()
    if (normalizedError?.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }

    throw error
  }

  // Narrow column list for list queries — excludes heavy/unused columns.
  // Single-item reads (create, update, detail) still use '*' via direct .select('*').
  private readonly listThreadSelect =
    'id, title, content, lenser_id, author_profile, tags, reaction_totals, reply_count, view_count, visibility, created_at'

  private async getProfileByHandle(handle: string): Promise<AuthorProfile | null> {
    const { data, error } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_handle: handle,
      p_lenser_id: null,
    })

    if (error) this.handleError(error)
    const profile = data?.[0]
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
    const { data, error } = await supabase.rpc('fn_get_lenser_profile_brief', {
      p_handle: null,
      p_lenser_id: lenserId,
    })

    if (error) {
      return this.mapProfileToAuthor(null, lenserId)
    }

    return this.mapProfileToAuthor((data?.[0] as Partial<AuthorProfile> | null) ?? null, lenserId)
  }

  private async getBatchProfilesByIds(ids: string[]): Promise<Map<string, AuthorProfile>> {
    if (ids.length === 0) return new Map()
    const results = await Promise.all(
      ids.map((id) =>
        supabase.rpc('fn_get_lenser_profile_brief', {
          p_handle: null,
          p_lenser_id: id,
        })
      )
    )
    const profiles: Partial<AuthorProfile>[] = results.flatMap(({ data, error }) => {
      if (error || !data?.[0]) return []
      return [data[0] as Partial<AuthorProfile>]
    })
    return new Map(
      profiles.map((p) => [p.id!, this.mapProfileToAuthor(p, p.id!)])
    )
  }

  private async getTagsForEntity(entityType: 'thread' | 'lens', entityId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase.rpc('fn_get_entity_tag_ids', {
      p_entity_type: entityType,
      p_entity_id: entityId,
    })

    if (tagMapError) this.handleError(tagMapError)

    const tagIds = (tagMapRows ?? []).map((row: any) => row.tag_id).filter(Boolean)
    if (tagIds.length === 0) return []

    const { data: tags, error: tagsError } = await supabase
      .from('vw_tags_public_stats')
      .select('id, slug, name')
      .in('id', tagIds)

    if (tagsError) this.handleError(tagsError)

    const tagById = new Map((tags ?? []).map((tag) => [tag.id, tag]))
    return tagIds
      .map((id: string) => tagById.get(id))
      .filter((tag): tag is NonNullable<typeof tag> => tag != null)
      .map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
      }))
  }

  private async getThreadReactionTotals(threadId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('fn_get_entity_reaction_counts', {
      p_entity_type: 'thread',
      p_entity_id: threadId,
    })

    if (error) this.handleError(error)

    return (Array.isArray(data) ? data : []).reduce<Record<string, number>>((totals, row: any) => {
      totals[row.reaction] = Number(row.count)
      return totals
    }, {})
  }

  private async buildOwnerThreadRecord(
    baseThread: Pick<
      ThreadRecord,
      | 'id'
      | 'lenser_id'
      | 'visibility'
      | 'created_at'
      | 'updated_at'
      | 'reply_count'
      | 'view_count'
      | 'thumbnail_url'
      | 'prompt_data'
    > & { linked_prompt_id?: string | null; title?: string; content?: string }
  ): Promise<ThreadRecord> {
    // fn_list_threads pre-joins title/content from entity_translations so private
    // threads hydrate correctly. Only fall back to vw_content_threads_public (which
    // excludes non-public threads) when the fields weren't provided by the caller.
    const hasTranslation = (baseThread as any).title != null
    const [translationResult, authorProfile, tags, reactionTotals] = await Promise.all([
      hasTranslation
        ? Promise.resolve({ data: null as { title: string; content: string } | null, error: null })
        : supabase
            .from('vw_content_threads_public')
            .select('title, content')
            .eq('id', baseThread.id)
            .maybeSingle(),
      this.getProfileById(baseThread.lenser_id),
      this.getTagsForEntity('thread', baseThread.id),
      this.getThreadReactionTotals(baseThread.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)

    return {
      id: baseThread.id,
      lenser_id: baseThread.lenser_id,
      visibility: baseThread.visibility,
      created_at: baseThread.created_at,
      updated_at: baseThread.updated_at,
      title: (baseThread as any).title || translationResult.data?.title || 'Untitled',
      content: (baseThread as any).content || translationResult.data?.content || '',
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
      reply_count: baseThread.reply_count ?? 0,
      view_count: baseThread.view_count ?? 0,
      thumbnail_url: baseThread.thumbnail_url,
      linked_lens_id: (baseThread as any).linked_lens_id ?? null,
      prompt_data: (baseThread as any).lens_data ?? (baseThread as any).prompt_data,
    } as ThreadRecord
  }

  private async hydrateThreadRecords(
    baseThreads: Pick<
      ThreadRecord,
      | 'id'
      | 'lenser_id'
      | 'visibility'
      | 'created_at'
      | 'updated_at'
      | 'reply_count'
      | 'view_count'
      | 'thumbnail_url'
      | 'prompt_data'
    >[]
  ): Promise<ThreadRecord[]> {
    return Promise.all(baseThreads.map((thread) => this.buildOwnerThreadRecord(thread)))
  }

  private async getReplyReactionTotals(replyIds: string[]): Promise<Map<string, Record<string, number>>> {
    if (replyIds.length === 0) return new Map()

    const results = await Promise.all(
      replyIds.map((id) =>
        supabase.rpc('fn_get_entity_reaction_counts', {
          p_entity_type: 'thread_reply',
          p_entity_id: id,
        }).then(({ data, error }) => ({ id, data, error }))
      )
    )

    const totals = new Map<string, Record<string, number>>()
    for (const { id, data, error } of results) {
      if (error) continue
      const counts: Record<string, number> = {}
      for (const row of (data ?? []) as any[]) {
        counts[row.reaction] = Number(row.count)
      }
      totals.set(id, counts)
    }
    return totals
  }

  /**
   * Create a new thread.
   * Security:
   * - lenser_id is resolved in DB using auth.uid() inside fn_content_create_thread.
   * - Frontend cannot spoof lenser_id.
   */
  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    // Use SECURITY DEFINER RPC — resolves lenser_id server-side via auth.uid(),
    // handles translations and tag_map in a single atomic call, and bypasses
    // the direct-insert RLS check that requires status='active' via get_auth_lenser_id().
    const { data: threadId, error: rpcError } = await supabase.rpc(
      'fn_content_create_thread',
      {
        p_title: dto.title,
        p_content: dto.content,
        p_visibility: dto.visibility,
        p_tag_ids: dto.tagIds ?? [],
      },
      { count: undefined }
    )

    if (rpcError) this.handleError(rpcError)
    if (!threadId) throw new Error('Failed to create thread')

    // Read from secure public view
    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select('*')
      .eq('id', threadId)
      .maybeSingle()

    if (viewError) this.handleError(viewError)

    if (!threadView) {
      // Fallback for private threads (lenser_id resolved server-side)
      return {
        id: threadId,
        visibility: dto.visibility,
        created_at: new Date().toISOString(),
        author_profile: {},
        tags: [],
        title: dto.title,
        content: dto.content,
      } as unknown as ThreadRecord
    }

    return threadView as unknown as ThreadRecord
  }

  /**
   * List threads (public view, RLS-safe).
   */
  async getAllThreads(offset = 0, limit = 10): Promise<ApiResponseEnvelope<ThreadRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.listThreadSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as ThreadRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  /**
   * List threads by tag slug using JSONB containment on view's tags column.
   */
  async getThreadsByTag(tagSlug: string, sort = 'newest', offset = 0, limit = 20): Promise<ApiResponseEnvelope<ThreadRecord[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_threads_by_tag', {
      p_tag_slug: tagSlug,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)
    return paginatedResponse(
      (data ?? []) as unknown as ThreadRecord[],
      { limit, offset, hasNextPage: (data?.length ?? 0) >= limit },
      { durationMs: Date.now() - start },
    )
  }

  /**
   * Get a single thread by id.
   *
   * Fast path: tries vw_content_threads_public first (public + published) — single query,
   * all joins pre-computed. Falls back to raw table + hydration only for private/draft threads.
   */
  async getThreadById(id: string, viewerLenserId?: string): Promise<ThreadRecord | null> {
    // Fast path: 1 query covers public published threads (the common case)
    const { data: publicRow } = await supabase
      .from('vw_content_threads_public')
      .select('id, lenser_id, title, content, author_profile, reaction_totals, reply_count, view_count, created_at, thumbnail_url, lens_data, visibility, tags')
      .eq('id', id)
      .maybeSingle()

    if (publicRow) {
      return {
        id: publicRow.id,
        lenser_id: publicRow.lenser_id,
        visibility: publicRow.visibility,
        created_at: publicRow.created_at,
        updated_at: publicRow.created_at,
        title: publicRow.title,
        content: publicRow.content,
        author_profile: publicRow.author_profile as AuthorProfile,
        tags: (publicRow.tags as any[]) ?? [],
        reaction_totals: (publicRow.reaction_totals as Record<string, number>) ?? {},
        reply_count: publicRow.reply_count ?? 0,
        view_count: publicRow.view_count ?? 0,
        thumbnail_url: publicRow.thumbnail_url,
        linked_lens_id: null,
        prompt_data: (publicRow as any).lens_data ?? null,
      } as unknown as ThreadRecord
    }

    // Slow path: private or draft thread — needs RPC hydration
    if (!viewerLenserId) return null

    const { data: rpcData, error } = await supabase.rpc('fn_get_thread_with_replies', {
      p_thread_id: id,
      p_reply_limit: 0,
    })

    if (error) {
      if ((error as any).code === 'PGRST116') return null
      this.handleError(error)
    }
    const data = rpcData?.[0]
    if (!data) return null
    if ((data as any).visibility === 'private' && (data as any).lenser_id !== viewerLenserId) {
      return null
    }

    return this.buildOwnerThreadRecord(data as unknown as ThreadRecord)
  }

  /**
   * List threads for a lenser by handle.
   * Private/hidden threads are filtered by RLS and view definition.
   */
  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false
  ): Promise<ThreadRecord[]> {
    if (includePrivate) {
      const profile = await this.getProfileByHandle(handle)
      if (!profile?.id) return []

      const { data: baseThreads, error } = await supabase.rpc('fn_list_threads', {
        p_limit: limit,
        p_cursor: null,
        p_tag_slug: null,
      })

      if (error) this.handleError(error)
      const filtered = ((baseThreads ?? []) as any[]).filter(
        (t: any) => t.author_lenser_id === profile.id
      )
      return this.hydrateThreadRecords(filtered.slice(offset, offset + limit) as unknown as ThreadRecord[])
    }

    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.listThreadSelect)
      .eq('lenser_handle', handle)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as ThreadRecord[]
  }

  /**
   * Get tags for a thread from the public thread view.
   * Assumes view exposes a `tags` jsonb column.
   */
  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select('tags')
      .eq('id', threadId)
      .single()

    if (error) return []
    return ((data?.tags as TagRecord[]) ?? []) || []
  }

  /**
   * Get replies for a thread from the public replies view.
   * Soft-deleted replies should be handled at view-level (e.g. content = "[deleted]").
   */
  async getThreadReplies(threadId: string, viewerLenserId?: string, limit = 20, offset = 0, visibility?: string): Promise<ThreadReplyRecord[]> {
    // Resolve visibility — skip getThreadById when the caller already has it
    let resolvedVisibility = visibility
    if (!resolvedVisibility) {
      const thread = await this.getThreadById(threadId, viewerLenserId)
      if (!thread) return []
      resolvedVisibility = thread.visibility
    }

    if (resolvedVisibility === 'public') {
      const { data, error } = await supabase
        .rpc('fn_get_thread_replies_page', {
          p_thread_id: threadId,
          p_limit: limit,
          p_offset: offset,
        })

      if (error) this.handleError(error)
      return (data ?? []) as ThreadReplyRecord[]
    }

    const { data: repliesData, error } = await supabase.rpc('fn_get_thread_with_replies', {
      p_thread_id: threadId,
      p_reply_limit: limit + offset,
    })

    if (error) this.handleError(error)
    const replies = ((repliesData ?? []) as any[]).slice(offset, offset + limit)

    const replyRows = (replies ?? []) as ThreadReplyRecord[]
    const uniqueLenserIds = [...new Set(replyRows.map((r) => r.lenser_id))]
    const [reactionTotals, profileMap] = await Promise.all([
      this.getReplyReactionTotals(replyRows.map((reply) => reply.id)),
      this.getBatchProfilesByIds(uniqueLenserIds),
    ])

    return replyRows.map((reply) => ({
      ...reply,
      author_profile: profileMap.get(reply.lenser_id) ?? this.mapProfileToAuthor(null, reply.lenser_id),
      reaction_totals: reactionTotals.get(reply.id) ?? {},
    }))
  }

  async getReplyById(replyId: string): Promise<ThreadReplyRecord | null> {
    const { data, error } = await supabase
      .from('vw_content_thread_replies_public')
      .select('*')
      .eq('id', replyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }

    return data as ThreadReplyRecord
  }

  /**
   * Create a reply.
   * Security:
   * - lenser_id is derived from auth.uid() in fn_content_create_reply.
   */
  async createReply(
    threadId: string,
    _lenserId: string, // ignored; lenser_id resolved server-side via DEFAULT lensers.get_auth_lenser_id()
    content: string,
    parentReplyId?: string
  ): Promise<ThreadReplyRecord> {
    const { data: replyInsertData, error } = await supabase.rpc('fn_create_thread_reply', {
      p_thread_id: threadId,
      p_content: content,
      p_parent_reply_id: parentReplyId ?? null,
    })

    if (error) this.handleError(error)
    if (!replyInsertData?.[0]) throw new Error('Failed to create reply')
    const replyId = replyInsertData[0].id
    const resolvedLenserId = replyInsertData[0].lenser_id || _lenserId

    const { data: replyView, error: viewError } = await supabase
      .from('vw_content_thread_replies_public')
      .select('*')
      .eq('id', replyId)
      .maybeSingle()

    if (viewError) this.handleError(viewError)

    if (!replyView) {
      const authorProfile = resolvedLenserId ? await this.getProfileById(resolvedLenserId) : null
      return {
        id: replyId,
        thread_id: threadId,
        lenser_id: resolvedLenserId,
        content,
        parent_reply_id: parentReplyId || null,
        created_at: new Date().toISOString(),
        author_profile: authorProfile,
      } as unknown as ThreadReplyRecord
    }

    return replyView as ThreadReplyRecord
  }

  /**
   * Trending threads via hot score RPC with optional language boost.
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getTrendingThreads(lang?: string, offset = 0, limit = 20): Promise<ApiResponseEnvelope<ThreadFeedItem[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_trending_threads', {
      p_lang: lang ?? null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: ThreadFeedItem[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        content: '',
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        reactionCount: Object.values(reactionTotals).reduce((sum, n) => sum + n, 0),
        replyCount: (row.reply_count as number) ?? 0,
        createdAt: row.created_at as string,
        userHasReacted: false,
        visibility: 'public' as const,
        status: ((row.status as string) ?? 'published') as import('@lenserfight/types').ContentStatus,
        hotScore: row.hot_score as number,
        primaryLanguage: (row.primary_language as string) ?? undefined,
      }
    })
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start },
    )
  }

  /**
   * Personalized thread feed for an authenticated lenser (Phase 3+4).
   * Score = 0.30×tag_sim + 0.25×lang_match + 0.20×hot + 0.15×author_rep + 0.10×followed_author.
   * RPC does not return a row count; hasNextPage uses data.length >= limit heuristic.
   */
  async getPersonalFeed(offset = 0, limit = 20): Promise<ApiResponseEnvelope<PersonalFeedItem[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_personal_threads', {
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: PersonalFeedItem[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        content: (row.content as string) ?? '',
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        reactionCount: Object.values(reactionTotals).reduce((sum, n) => sum + n, 0),
        replyCount: (row.reply_count as number) ?? 0,
        createdAt: row.created_at as string,
        userHasReacted: false,
        visibility: 'public' as const,
        status: ((row.status as string) ?? 'published') as import('@lenserfight/types').ContentStatus,
        hotScore: row.hot_score as number,
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

  async getFollowingFeed(lenserId: string, offset = 0, limit = 20): Promise<ApiResponseEnvelope<ThreadFeedItem[]>> {
    const start = Date.now()
    const { data, error } = await supabase.rpc('fn_content_get_following_threads', {
      p_lenser_id: lenserId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    const items: ThreadFeedItem[] = rows.map((row) => {
      const author = (row.author_profile as Record<string, unknown>) ?? {}
      const reactionTotals = (row.reaction_totals as Record<string, number>) ?? {}
      return {
        id: row.id as string,
        title: row.title as string,
        content: (row.content as string) ?? '',
        author: {
          id: (author.id as string) ?? '',
          displayName: (author.display_name as string) ?? 'Unknown',
          handle: (author.handle as string) ?? 'unknown',
          avatarUrl: (author.avatar_url as string | null) ?? null,
        },
        tags: (row.tags as TagRecord[]) ?? [],
        reactionCount: Object.values(reactionTotals).reduce((sum, n) => sum + n, 0),
        replyCount: (row.reply_count as number) ?? 0,
        createdAt: row.created_at as string,
        userHasReacted: false,
        visibility: 'public' as const,
        status: ((row.status as string) ?? 'published') as import('@lenserfight/types').ContentStatus,
        hotScore: row.hot_score as number,
        primaryLanguage: (row.primary_language as string) ?? undefined,
      }
    })

    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: rows.length >= limit },
      { durationMs: Date.now() - start },
    )
  }

  /**
   * Trending tags from public tags view.
   */
  async getTrendingTags(limit: number): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('vw_content_tags_public')
      .select('id, slug, name')
      .limit(limit)

    if (error) return []
    return (data ?? []).map((tag) => ({
      id: tag.id as string,
      slug: tag.slug as string,
      name: tag.name as string,
    }))
  }

  /**
   * Update a thread via RPC.
   * Only the owner can update (enforced in fn_content_update_thread).
   */
  async updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> {
    const baseUpdatePayload: Partial<Pick<ThreadRecord, 'visibility'>> = {}
    const translationUpdatePayload: Partial<Pick<ThreadRecord, 'title' | 'content'>> = {}

    if (dto.visibility !== undefined) baseUpdatePayload.visibility = dto.visibility
    if (dto.title !== undefined) translationUpdatePayload.title = dto.title
    if (dto.content !== undefined) translationUpdatePayload.content = dto.content

    if (Object.keys(baseUpdatePayload).length > 0 && baseUpdatePayload.visibility !== undefined) {
      const { error } = await supabase.rpc('fn_update_thread_visibility', {
        p_thread_id: id,
        p_visibility: baseUpdatePayload.visibility as string,
      })
      if (error) this.handleError(error)
    }

    if (Object.keys(translationUpdatePayload).length > 0) {
      const { error } = await supabase.rpc('fn_update_thread_translation', {
        p_entity_id: id,
        p_entity_type: 'thread',
        p_title: (translationUpdatePayload.title as string) ?? null,
        p_description: (translationUpdatePayload.content as string) ?? null,
      })
      if (error) this.handleError(error)
    }

    if (dto.tagIds !== undefined) {
      const { error: tagError } = await supabase.rpc('fn_remap_thread_tags', {
        p_thread_id: id,
        p_tag_ids: dto.tagIds,
      })
      if (tagError) this.handleError(tagError)
    }

    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (viewError) this.handleError(viewError)

    if (!threadView) {
      return {
        id,
        visibility: dto.visibility,
        title: dto.title,
        content: dto.content,
      } as unknown as ThreadRecord
    }

    return threadView as unknown as ThreadRecord
  }

  /**
   * Delete a thread via RPC.
   * Only the owner can delete (enforced in fn_content_delete_thread).
   */
  async deleteThread(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_update_thread_visibility', {
      p_thread_id: id,
      p_visibility: 'deleted',
    })

    if (error) this.handleError(error)
  }

  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_create_thread_reply', {
      p_thread_id: replyId,
      p_content: '[deleted]',
      p_parent_reply_id: null,
    })

    if (error) this.handleError(error)
  }
}
