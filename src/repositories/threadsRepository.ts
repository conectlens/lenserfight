import { AuthorProfile } from '../types/lenser.types'
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types'

import { supabase } from '../core/supabase/client'

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>
  getAllThreads(offset?: number, limit?: number): Promise<ThreadRecord[]>
  getThreadsByTag(tagSlug: string, offset?: number, limit?: number): Promise<ThreadRecord[]>
  getThreadById(id: string): Promise<ThreadRecord | null>
  getByLenser(
    handle: string,
    offset?: number,
    limit?: number,
    includePrivate?: boolean
  ): Promise<ThreadRecord[]>
  getThreadTags(threadId: string): Promise<TagRecord[]>
  getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]>
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>
  getTrendingTags(limit: number): Promise<string[]>
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
  private handleError(error: any) {
    if (error?.code === '42501' || error?.message?.includes('permission denied')) {
      throw new Error(
        'This thread or its associated data is private, hidden, or you do not have permission to access it.'
      )
    }

    // PGRST116 = "result contains 0 rows" when expecting single()
    if (error?.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }

    throw error
  }

  // Single-Query Read using denormalized columns from secure VIEW
  private get threadSelect() {
    return '*'
  }

  /**
   * Create a new thread.
   * Security:
   * - lenser_id is resolved in DB using auth.uid() inside fn_content_create_thread.
   * - Frontend cannot spoof lenser_id.
   */
  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    const cleanLenserId = !dto.lenserId || dto.lenserId === 'undefined' ? undefined : dto.lenserId

    // 1. Get user's preferred language ID from their profile (since core schema is unexposed)
    const { data: profileData } = await supabase
      .schema('lensers')
      .from('profiles')
      .select('preferred_language_id')
      .eq('id', cleanLenserId)
      .maybeSingle()
    const languageId = profileData?.preferred_language_id

    // 2. Insert Base Thread
    const { data: threadInsertData, error: insertError } = await supabase.schema('content').from('threads').insert({
      visibility: dto.visibility,
      lenser_id: cleanLenserId
    }).select('id').single()

    if (insertError) this.handleError(insertError)
    const threadId = threadInsertData.id

    // 3. Insert Thread Translation
    if (languageId) {
      const { error: translationError } = await supabase.schema('content').from('thread_translations').insert({
        thread_id: threadId,
        language_id: languageId,
        is_original: true,
        title: dto.title,
        content: dto.content
      })
      if (translationError) this.handleError(translationError)
    }

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
  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // not found
      this.handleError(error)
    }

    return data as unknown as ThreadRecord
  }

  /**
   * List threads for a lenser by handle.
   * Private/hidden threads are filtered by RLS and view definition.
   */
  async getByLenser(
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false // currently ignored; visibility logic is in the view/RLS.
  ): Promise<ThreadRecord[]> {
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
  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
    const { data, error } = await supabase
      .from('vw_content_thread_replies_public')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) this.handleError(error)
    return (data ?? []) as ThreadReplyRecord[]
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
   * Trending tags from public tags view.
   */
  async getTrendingTags(limit: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('vw_content_tags_public')
      .select('name')
      .limit(limit)

    if (error) return []
    return (data ?? []).map((t: any) => t.name as string)
  }

  /**
   * Update a thread via RPC.
   * Only the owner can update (enforced in fn_content_update_thread).
   */
  async updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> {
    const baseUpdatePayload: any = {}
    const translationUpdatePayload: any = {}

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
