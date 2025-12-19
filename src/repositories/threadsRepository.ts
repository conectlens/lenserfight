import { AuthorProfile } from '../types/lenser.types'
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

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

// Fallback data for Mock Mode to prevent "Unknown User"
const MOCK_PROFILES: Record<string, AuthorProfile> = {
  'lenser-1': {
    id: 'lenser-1',
    handle: 'cassian.lens',
    display_name: 'Cassian',
    avatar_url: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff',
  },
  'lenser-2': {
    id: 'lenser-2',
    handle: 'samantha_bee',
    display_name: 'Samantha Bee',
    avatar_url:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  },
  'lenser-3': {
    id: 'lenser-3',
    handle: 'dev_lane',
    display_name: 'Devon Lane',
    avatar_url: 'https://ui-avatars.com/api/?name=Devon&background=random',
  },
  'lenser-4': {
    id: 'lenser-4',
    handle: 'courtney_h',
    display_name: 'Courtney Henry',
    avatar_url: 'https://ui-avatars.com/api/?name=Courtney&background=random',
  },
}

// --- Mock Implementation ---
export class MockThreadsRepository implements ThreadsRepositoryPort {
  private THREADS_KEY = 'mock_threads_db'
  private THREAD_TAGS_KEY = 'mock_thread_tags'
  private TAGS_KEY = 'mock_tags'
  private INDEX_KEY = 'mock_lensers_index'

  private getThreads(): ThreadRecord[] {
    return JSON.parse(storage.getItem(this.THREADS_KEY) || '[]')
  }

  private saveThreads(threads: ThreadRecord[]) {
    storage.setItem(this.THREADS_KEY, JSON.stringify(threads))
  }

  private getTags(): TagRecord[] {
    return JSON.parse(storage.getItem(this.TAGS_KEY) || '[]')
  }

  private getThreadTagsRelation(): { thread_id: string; tag_id: string }[] {
    return JSON.parse(storage.getItem(this.THREAD_TAGS_KEY) || '[]')
  }

  private saveThreadTagsRelation(rels: { thread_id: string; tag_id: string }[]) {
    storage.setItem(this.THREAD_TAGS_KEY, JSON.stringify(rels))
  }

  // Helper to fetch profile with static fallback for better mock reliability
  private getAuthorProfile(lenserId: string): AuthorProfile {
    // 1. Try static mocks first (fastest and most reliable for seeds)
    if (MOCK_PROFILES[lenserId]) return MOCK_PROFILES[lenserId]

    // 2. Try Dynamic Index
    const indexJson = storage.getItem(this.INDEX_KEY)
    const index = indexJson ? JSON.parse(indexJson) : []
    const author = index.find((l: any) => l.id === lenserId)

    if (author) {
      return {
        id: author.id,
        handle: author.handle,
        display_name: author.display_name,
        avatar_url: author.avatar_url,
      }
    }

    // 3. Fallback
    return { id: lenserId, handle: 'unknown', display_name: 'Unknown User' }
  }

  createThread = async (dto: CreateThreadDTO): Promise<ThreadRecord> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const threads = this.getThreads()
    const allTags = this.getTags()

    // 1. Bake the profile in at creation time (Denormalization)
    const authorProfile = this.getAuthorProfile(dto.lenserId)

    // 2. Resolve Tags (Denormalization)
    const threadTags = dto.tagIds ? allTags.filter((t) => dto.tagIds.includes(t.id)) : []

    const newThread: ThreadRecord = {
      id: `thread-${Date.now()}`,
      lenser_id: dto.lenserId,
      author_profile: authorProfile,
      title: dto.title,
      content: dto.content,
      visibility: dto.visibility,
      view_count: 0,
      reply_count: 0,
      reaction_totals: {},
      tags: threadTags, // Stored directly
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    threads.unshift(newThread)
    this.saveThreads(threads)

    // 3. Maintain Junction Table for referential integrity simulation
    if (dto.tagIds && dto.tagIds.length > 0) {
      const rels = this.getThreadTagsRelation()
      dto.tagIds.forEach((tagId) => {
        rels.push({ thread_id: newThread.id, tag_id: tagId })
      })
      this.saveThreadTagsRelation(rels)
    }

    return newThread
  }

  getAllThreads = async (offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Fast read: No joins, just filter and slice
    const threads = this.getThreads()
      .filter((t) => t.visibility === 'public')
      .slice(offset, offset + limit)
    return threads
  }

  getThreadsByTag = async (tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Read from the denormalized 'tags' column directly
    const threads = this.getThreads()
      .filter(
        (t) => t.visibility === 'public' && t.tags && t.tags.some((tag) => tag.slug === tagSlug)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return threads.slice(offset, offset + limit)
  }

  getThreadById = async (id: string): Promise<ThreadRecord | null> => {
    const t = this.getThreads().find((th) => th.id === id)
    return t || null
  }

  getByLenser = async (
    handle: string,
    offset = 0,
    limit = 10,
    includePrivate = false
  ): Promise<ThreadRecord[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Filter by handle using denormalized profile
    let threads = this.getThreads().filter((t) => t.author_profile?.handle === handle)

    if (!includePrivate) {
      threads = threads.filter((t) => t.visibility === 'public')
    }
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return threads.slice(offset, offset + limit)
  }

  getThreadTags = async (threadId: string): Promise<TagRecord[]> => {
    // Read from cached field
    const thread = this.getThreads().find((t) => t.id === threadId)
    return thread?.tags || []
  }

  getThreadReplies = async (threadId: string): Promise<ThreadReplyRecord[]> => {
    // Mock replies are not persisted in full DB logic in this minimal mock,
    // but typically would be separate. For now returning empty or stored replies if any.
    return []
  }
  getReplyById = async (replyId: string) => null

  createReply = async (
    threadId: string,
    lenserId: string,
    content: string,
    parentReplyId?: string
  ) => {
    const authorProfile = this.getAuthorProfile(lenserId)
    const reply: ThreadReplyRecord = {
      id: `reply-${Date.now()}`,
      thread_id: threadId,
      lenser_id: lenserId,
      author_profile: authorProfile,
      content,
      parent_reply_id: parentReplyId,
      created_at: new Date().toISOString(),
    }
    return reply
  }

  getTrendingTags = async (limit: number) => {
    const rels = this.getThreadTagsRelation()
    const allTags = this.getTags()
    const counts: Record<string, number> = {}
    rels.forEach((r) => {
      counts[r.tag_id] = (counts[r.tag_id] || 0) + 1
    })
    const sortedTagIds = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, limit)
    return sortedTagIds.map((id) => allTags.find((t) => t.id === id)?.name || '').filter(Boolean)
  }

  updateThread = async (id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> => {
    const threads = this.getThreads()
    const idx = threads.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Not found')

    const allTags = this.getTags()
    const newTags = dto.tagIds
      ? allTags.filter((t) => dto.tagIds!.includes(t.id))
      : threads[idx].tags

    const updated = {
      ...threads[idx],
      ...dto,
      tags: newTags, // Update denormalized column
      updated_at: new Date().toISOString(),
    }

    // @ts-ignore
    threads[idx] = updated
    this.saveThreads(threads)
    return updated as any
  }

  deleteThread = async (id: string) => {
    const threads = this.getThreads().filter((t) => t.id !== id)
    this.saveThreads(threads)
  }
}

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
    const { data: threadId, error } = await supabase.rpc('fn_content_create_thread', {
      p_title: dto.title,
      p_content: dto.content,
      p_visibility: dto.visibility,
      p_tag_ids: dto.tagIds && dto.tagIds.length > 0 ? dto.tagIds : null,
    })

    if (error) this.handleError(error)

    // Read from secure public view
    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .eq('id', threadId)
      .single()

    if (viewError) this.handleError(viewError)
    return threadView as ThreadRecord
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
    return (data ?? []) as ThreadRecord[]
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
    return (data ?? []) as ThreadRecord[]
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

    return data as ThreadRecord
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
    return (data ?? []) as ThreadRecord[]
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
    const { data: replyId, error } = await supabase.rpc('fn_content_create_reply', {
      p_thread_id: threadId,
      p_content: content,
      p_parent_reply_id: parentReplyId ?? null,
    })

    if (error) this.handleError(error)

    const { data: replyView, error: viewError } = await supabase
      .from('vw_content_thread_replies_public')
      .select('*')
      .eq('id', replyId)
      .single()

    if (viewError) this.handleError(viewError)
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
    const { error } = await supabase.rpc('fn_content_update_thread', {
      p_thread_id: id,
      p_title: dto.title ?? null,
      p_content: dto.content ?? null,
      p_visibility: dto.visibility ?? null,
      p_tag_ids: dto.tagIds && dto.tagIds.length > 0 ? dto.tagIds : null,
    })

    if (error) this.handleError(error)

    const { data: threadView, error: viewError } = await supabase
      .from('vw_content_threads_public')
      .select(this.threadSelect)
      .eq('id', id)
      .single()

    if (viewError) this.handleError(viewError)
    return threadView as ThreadRecord
  }

  /**
   * Delete a thread via RPC.
   * Only the owner can delete (enforced in fn_content_delete_thread).
   */
  async deleteThread(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_content_delete_thread', {
      p_thread_id: id,
    })

    if (error) this.handleError(error)
  }

  /**
   * Delete a reply via RPC (soft delete in DB).
   */
  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_content_delete_reply', {
      p_reply_id: replyId,
    })

    if (error) this.handleError(error)
  }
}
