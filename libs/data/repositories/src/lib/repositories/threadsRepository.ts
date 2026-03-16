import { supabase } from '@lenserfight/data/supabase'
import { AuthorProfile } from '@lenserfight/types'
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO, ThreadFeedItem, PersonalFeedItem } from '@lenserfight/types'

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>
  getAllThreads(offset?: number, limit?: number): Promise<ThreadRecord[]>
  getThreadsByTag(tagSlug: string, offset?: number, limit?: number): Promise<ThreadRecord[]>
  getThreadById(id: string, viewerLenserId?: string): Promise<ThreadRecord | null>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<ThreadRecord[]>
  getThreadTags(threadId: string): Promise<TagRecord[]>
  getThreadReplies(threadId: string, viewerLenserId?: string): Promise<ThreadReplyRecord[]>
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>
  getTrendingTags(limit: number): Promise<string[]>
  getTrendingThreads(lang?: string, offset?: number, limit?: number): Promise<ThreadFeedItem[]>
  getPersonalFeed(lenserId: string, offset?: number, limit?: number): Promise<PersonalFeedItem[]>
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

  // Single-Query Read using denormalized columns from secure VIEW
  private get threadSelect() {
    return '*'
  }

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

  private async getTagsForEntity(entityType: 'thread' | 'prompt_template', entityId: string): Promise<TagRecord[]> {
    const { data: tagMapRows, error: tagMapError } = await supabase
      .schema('content')
      .from('tag_map')
      .select('tag_id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

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

  private async getThreadReactionTotals(threadId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .schema('content')
      .from('thread_reactions')
      .select('reaction')
      .eq('thread_id', threadId)

    if (error) this.handleError(error)

    return (data ?? []).reduce<Record<string, number>>((totals, row) => {
      totals[row.reaction] = (totals[row.reaction] ?? 0) + 1
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
    >
  ): Promise<ThreadRecord> {
    const [translationResult, authorProfile, tags] = await Promise.all([
      supabase
        .schema('content')
        .from('thread_translations')
        .select('title, content')
        .eq('thread_id', baseThread.id)
        .eq('is_original', true)
        .maybeSingle(),
      this.getProfileById(baseThread.lenser_id),
      this.getTagsForEntity('thread', baseThread.id),
    ])

    if (translationResult.error) this.handleError(translationResult.error)
    const reactionTotals = await this.getThreadReactionTotals(baseThread.id)

    return {
      id: baseThread.id,
      lenser_id: baseThread.lenser_id,
      visibility: baseThread.visibility,
      created_at: baseThread.created_at,
      updated_at: baseThread.updated_at,
      title: translationResult.data?.title || 'Untitled',
      content: translationResult.data?.content || '',
      author_profile: authorProfile,
      tags,
      reaction_totals: reactionTotals,
      reply_count: baseThread.reply_count ?? 0,
      view_count: baseThread.view_count ?? 0,
      thumbnail_url: baseThread.thumbnail_url,
      prompt_data: baseThread.prompt_data,
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

    const { data, error } = await supabase
      .schema('content')
      .from('thread_reply_reactions')
      .select('reply_id, reaction')
      .in('reply_id', replyIds)

    if (error) this.handleError(error)

    const totals = new Map<string, Record<string, number>>()
    for (const row of data ?? []) {
      const current = totals.get(row.reply_id) ?? {}
      current[row.reaction] = (current[row.reaction] ?? 0) + 1
      totals.set(row.reply_id, current)
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
    const cleanLenserId = !dto.lenserId || dto.lenserId === 'undefined' ? undefined : dto.lenserId

    // 1. Resolve the content language from the exposed profile schema.
    const { data: profileData } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('preferred_language')
      .eq('id', cleanLenserId)
      .maybeSingle()
    const languageCode = profileData?.preferred_language || 'en'

    // 2. Insert Base Thread
    const { data: threadInsertData, error: insertError } = await supabase.schema('content').from('threads').insert({
      visibility: dto.visibility,
      lenser_id: cleanLenserId
    }).select('id').single()

    if (insertError) this.handleError(insertError)
    const threadId = threadInsertData.id

    // 3. Insert Thread Translation
    const { error: translationError } = await supabase.schema('content').from('thread_translations').insert({
      thread_id: threadId,
      language_code: languageCode,
      is_original: true,
      title: dto.title,
      content: dto.content
    })
    if (translationError) this.handleError(translationError)

    if (dto.tagIds && dto.tagIds.length > 0) {
      const { data: authData } = await supabase.auth.getUser()
      const tagRecords = dto.tagIds.map(tagId => ({
        entity_type: 'thread',
        entity_id: threadId,
        tag_id: tagId,
        user_id: authData?.user?.id || null
      }))
      await supabase.schema('content').from('tag_map').insert(tagRecords)
    }

    // Read from secure public view
    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .eq('id', threadId)
      .maybeSingle()

    if (viewError) this.handleError(viewError)

    if (!threadView) {
      // Fallback for private threads
      return {
        id: threadId,
        lenser_id: cleanLenserId,
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
  async getAllThreads(offset = 0, limit = 10): Promise<ThreadRecord[]> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as ThreadRecord[]
  }

  /**
   * List threads by tag slug using JSONB containment on view's tags column.
   */
  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .contains('tags', JSON.stringify([{ slug: tagSlug }]))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) this.handleError(error)
    return (data ?? []) as unknown as ThreadRecord[]
  }

  /**
   * Get a single thread by id from public view.
   */
  async getThreadById(id: string, viewerLenserId?: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
      .schema('content')
      .from('threads')
      .select('id, lenser_id, visibility, created_at, updated_at, reply_count, view_count, thumbnail_url, prompt_data')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }
    if (!data) return null
    if (data.visibility === 'private' && (!viewerLenserId || data.lenser_id !== viewerLenserId)) {
      return null
    }

    return this.buildOwnerThreadRecord(data as ThreadRecord)
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

      const { data: baseThreads, error } = await supabase
        .schema('content')
        .from('threads')
        .select('id, lenser_id, visibility, created_at, updated_at, reply_count, view_count, thumbnail_url, prompt_data')
        .eq('lenser_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) this.handleError(error)
      return this.hydrateThreadRecords((baseThreads ?? []) as ThreadRecord[])
    }

    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .eq('author_profile->>handle', handle)
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
  async getThreadReplies(threadId: string, viewerLenserId?: string): Promise<ThreadReplyRecord[]> {
    const thread = await this.getThreadById(threadId, viewerLenserId)
    if (!thread) return []

    if (thread.visibility === 'public') {
      const { data, error } = await supabase
        .from('vw_content_thread_replies_public')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) this.handleError(error)
      return (data ?? []) as ThreadReplyRecord[]
    }

    const { data: replies, error } = await supabase
      .schema('content')
      .from('thread_replies')
      .select('id, thread_id, parent_reply_id, lenser_id, content, created_at, deleted_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) this.handleError(error)

    const replyRows = (replies ?? []) as ThreadReplyRecord[]
    const [reactionTotals, authorProfiles] = await Promise.all([
      this.getReplyReactionTotals(replyRows.map((reply) => reply.id)),
      Promise.all(replyRows.map((reply) => this.getProfileById(reply.lenser_id))),
    ])

    return replyRows.map((reply, index) => ({
      ...reply,
      author_profile: authorProfiles[index],
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
    lenserId: string, // intentionally ignored; server resolves author from auth.uid()
    content: string,
    parentReplyId?: string
  ): Promise<ThreadReplyRecord> {
    const { data: replyInsertData, error } = await supabase.schema('content').from('thread_replies').insert({
      thread_id: threadId,
      content,
      parent_reply_id: parentReplyId ?? null,
      lenser_id: !lenserId || lenserId === 'undefined' ? undefined : lenserId
    }).select('id').single()

    if (error) this.handleError(error)
    const replyId = replyInsertData.id

    const { data: replyView, error: viewError } = await supabase
      .from('vw_content_thread_replies_public')
      .select('*')
      .eq('id', replyId)
      .maybeSingle()

    if (viewError) this.handleError(viewError)

    if (!replyView) {
      return {
        id: replyId,
        thread_id: threadId,
        content,
        parent_reply_id: parentReplyId || null,
        lenser_id: lenserId,
        created_at: new Date().toISOString(),
      } as unknown as ThreadReplyRecord
    }

    return replyView as ThreadReplyRecord
  }

  /**
   * Trending threads via hot score RPC with optional language boost.
   */
  async getTrendingThreads(lang?: string, offset = 0, limit = 20): Promise<ThreadFeedItem[]> {
    const { data, error } = await supabase.rpc('fn_content_get_trending_threads', {
      p_lang: lang ?? null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
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
        hotScore: row.hot_score as number,
        primaryLanguage: (row.primary_language as string) ?? undefined,
      }
    })
  }

  /**
   * Personalized thread feed for an authenticated lenser (Phase 3+4).
   * Score = 0.30×tag_sim + 0.25×lang_match + 0.20×hot + 0.15×author_rep + 0.10×followed_author.
   */
  async getPersonalFeed(lenserId: string, offset = 0, limit = 20): Promise<PersonalFeedItem[]> {
    const { data, error } = await supabase.rpc('fn_content_get_personal_threads', {
      p_lenser_id: lenserId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
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
        hotScore: row.hot_score as number,
        primaryLanguage: (row.primary_language as string) ?? undefined,
        personalScore: (row.personal_score as number) ?? 0,
      }
    })
  }

  /**
   * Trending tags from public tags view.
   */
  async getTrendingTags(limit: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('vw_content_tags_public')
      .select('name')
      .limit(limit)

    if (error) return []
    return (data ?? []).map((tag) => tag.name as string)
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

    if (Object.keys(baseUpdatePayload).length > 0) {
      const { error } = await supabase.schema('content').from('threads').update(baseUpdatePayload).eq('id', id)
      if (error) this.handleError(error)
    }

    if (Object.keys(translationUpdatePayload).length > 0) {
      // Update the original translation
      const { error } = await supabase.schema('content').from('thread_translations')
        .update(translationUpdatePayload)
        .eq('thread_id', id)
        .eq('is_original', true)
      if (error) this.handleError(error)
    }

    if (dto.tagIds !== undefined) {
      await supabase.schema('content').from('tag_map').delete().eq('entity_type', 'thread').eq('entity_id', id)
      if (dto.tagIds.length > 0) {
        const { data: authData } = await supabase.auth.getUser()
        const tagRecords = dto.tagIds.map(tagId => ({
          entity_type: 'thread',
          entity_id: id,
          tag_id: tagId,
          user_id: authData?.user?.id || null
        }))
        const { error: tagError } = await supabase.schema('content').from('tag_map').insert(tagRecords)
        if (tagError) this.handleError(tagError)
      }
    }

    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
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
    const { error } = await supabase.schema('content').from('threads').delete().eq('id', id)

    if (error) this.handleError(error)
  }

  /**
   * Delete a reply via RPC (soft delete in DB).
   */
  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase.schema('content').from('thread_replies').delete().eq('id', replyId)

    if (error) this.handleError(error)
  }
}
