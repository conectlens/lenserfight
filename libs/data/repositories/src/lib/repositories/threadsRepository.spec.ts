import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    in: vi.fn(),
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))

import { SupabaseThreadsRepository } from './threadsRepository'

const THREAD_ID = 'thread-uuid-1'
const LENSER_ID = 'lenser-uuid-1'
const REPLY_ID = 'reply-uuid-1'

const rawThread = {
  id: THREAD_ID,
  lenser_id: LENSER_ID,
  title: 'Test Thread',
  content: 'Test content',
  author_profile: { id: LENSER_ID, handle: 'alice', display_name: 'Alice', avatar_url: null },
  tags: [],
  reaction_totals: {},
  reply_count: 0,
  view_count: 0,
  visibility: 'public',
  created_at: '2026-01-01T00:00:00Z',
  thumbnail_url: null,
  lens_data: null,
}

describe('SupabaseThreadsRepository', () => {
  let repo: SupabaseThreadsRepository

  beforeEach(() => {
    repo = new SupabaseThreadsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
    chainMethods.single.mockResolvedValue({ data: null, error: null })
    chainMethods.range.mockResolvedValue({ data: [], error: null })
    chainMethods.limit.mockResolvedValue({ data: [], error: null })
    chainMethods.in.mockResolvedValue({ data: [], error: null })
  })

  // ---------------------------------------------------------------------------
  // handleError (via getAllThreads)
  // ---------------------------------------------------------------------------
  describe('handleError (via getAllThreads)', () => {
    it('throws thread-specific message on 42501', async () => {
      chainMethods.range.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })
      await expect(repo.getAllThreads()).rejects.toThrow(
        'This thread or its associated data is private, hidden, or you do not have permission to access it.'
      )
    })

    it('throws "Requested resource was not found." on PGRST116', async () => {
      chainMethods.range.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      await expect(repo.getAllThreads()).rejects.toThrow('Requested resource was not found.')
    })

    it('rethrows generic errors', async () => {
      chainMethods.range.mockResolvedValue({ data: null, error: new Error('db failure') })
      await expect(repo.getAllThreads()).rejects.toThrow('db failure')
    })
  })

  // ---------------------------------------------------------------------------
  // getAllThreads
  // ---------------------------------------------------------------------------
  describe('getAllThreads', () => {
    it('queries vw_content_threads_public with order and range', async () => {
      chainMethods.range.mockResolvedValue({ data: [rawThread], error: null })
      const result = await repo.getAllThreads(0, 10)
      expect(mockFrom).toHaveBeenCalledWith('vw_content_threads_public')
      expect(chainMethods.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(chainMethods.range).toHaveBeenCalledWith(0, 9)
      expect(result.data).toHaveLength(1)
    })

    it('computes range from offset and limit', async () => {
      chainMethods.range.mockResolvedValue({ data: [], error: null })
      await repo.getAllThreads(20, 5)
      expect(chainMethods.range).toHaveBeenCalledWith(20, 24)
    })

    it('returns pagination envelope with meta', async () => {
      chainMethods.range.mockResolvedValue({ data: Array(10).fill(rawThread), error: null })
      const result = await repo.getAllThreads(0, 10)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('meta')
    })
  })

  // ---------------------------------------------------------------------------
  // getThreadsByTag
  // ---------------------------------------------------------------------------
  describe('getThreadsByTag', () => {
    it('calls fn_content_get_threads_by_tag with all params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getThreadsByTag('python', 'newest', 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_threads_by_tag', {
        p_tag_slug: 'python',
        p_sort: 'newest',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('uses default sort=newest and limit=20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getThreadsByTag('python')
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_threads_by_tag', expect.objectContaining({
        p_sort: 'newest',
        p_limit: 20,
        p_offset: 0,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('tag error') })
      await expect(repo.getThreadsByTag('python')).rejects.toThrow('tag error')
    })
  })

  // ---------------------------------------------------------------------------
  // getThreadById
  // ---------------------------------------------------------------------------
  describe('getThreadById', () => {
    it('returns thread from fast path when public view has data', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      const result = await repo.getThreadById(THREAD_ID)
      expect(mockFrom).toHaveBeenCalledWith('vw_content_threads_public')
      expect(result?.id).toBe(THREAD_ID)
      expect(result?.title).toBe('Test Thread')
    })

    it('returns null for slow path when no viewerLenserId provided', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.getThreadById(THREAD_ID)
      expect(result).toBeNull()
    })

    it('returns null when slow path RPC returns PGRST116', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      const result = await repo.getThreadById(THREAD_ID, LENSER_ID)
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getByLenser
  // ---------------------------------------------------------------------------
  describe('getByLenser', () => {
    it('queries vw_content_threads_public filtered by lenser_handle', async () => {
      chainMethods.range.mockResolvedValue({ data: [rawThread], error: null })
      const result = await repo.getByLenser('alice')
      expect(mockFrom).toHaveBeenCalledWith('vw_content_threads_public')
      expect(chainMethods.eq).toHaveBeenCalledWith('lenser_handle', 'alice')
      expect(result).toHaveLength(1)
    })

    it('returns [] when includePrivate=true but profile not found', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null }) // fn_get_lenser_profile_brief returns null
      const result = await repo.getByLenser('alice', 0, 10, true)
      expect(result).toEqual([])
    })

    it('rethrows errors from chain query', async () => {
      chainMethods.range.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.getByLenser('alice')).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // getThreadTags
  // ---------------------------------------------------------------------------
  describe('getThreadTags', () => {
    it('queries vw_content_threads_public tags column by thread id', async () => {
      const tags = [{ id: 'tag-1', slug: 'python', name: 'Python' }]
      chainMethods.single.mockResolvedValue({ data: { tags }, error: null })
      const result = await repo.getThreadTags(THREAD_ID)
      expect(mockFrom).toHaveBeenCalledWith('vw_content_threads_public')
      expect(chainMethods.eq).toHaveBeenCalledWith('id', THREAD_ID)
      expect(result).toEqual(tags)
    })

    it('returns [] on error (silently swallowed)', async () => {
      chainMethods.single.mockResolvedValue({ data: null, error: new Error('not found') })
      expect(await repo.getThreadTags(THREAD_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getThreadReplies
  // ---------------------------------------------------------------------------
  describe('getThreadReplies', () => {
    it('calls fn_get_thread_replies_page when visibility="public" is provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getThreadReplies(THREAD_ID, undefined, 20, 0, 'public')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_thread_replies_page', {
        p_thread_id: THREAD_ID,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('returns [] when no visibility provided and thread not found', async () => {
      // getThreadById fast path returns null (no public row, no viewerLenserId)
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.getThreadReplies(THREAD_ID, undefined, 20, 0)
      expect(result).toEqual([])
    })

    it('rethrows errors when visibility is public', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('replies error') })
      await expect(repo.getThreadReplies(THREAD_ID, undefined, 20, 0, 'public')).rejects.toThrow('replies error')
    })
  })

  // ---------------------------------------------------------------------------
  // getReplyById
  // ---------------------------------------------------------------------------
  describe('getReplyById', () => {
    it('queries vw_content_thread_replies_public by reply id', async () => {
      const reply = { id: REPLY_ID, content: 'reply text' }
      chainMethods.single.mockResolvedValue({ data: reply, error: null })
      const result = await repo.getReplyById(REPLY_ID)
      expect(mockFrom).toHaveBeenCalledWith('vw_content_thread_replies_public')
      expect(chainMethods.eq).toHaveBeenCalledWith('id', REPLY_ID)
      expect(result?.id).toBe(REPLY_ID)
    })

    it('returns null on PGRST116', async () => {
      chainMethods.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      expect(await repo.getReplyById(REPLY_ID)).toBeNull()
    })

    it('rethrows non-PGRST116 errors', async () => {
      chainMethods.single.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.getReplyById(REPLY_ID)).rejects.toThrow('db error')
    })
  })

  // ---------------------------------------------------------------------------
  // createThread
  // ---------------------------------------------------------------------------
  describe('createThread', () => {
    it('calls fn_content_create_thread with correct params', async () => {
      mockRpc.mockResolvedValueOnce({ data: THREAD_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      await repo.createThread({ title: 'T', content: 'C', visibility: 'public', tagIds: ['tag-1'] })
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_content_create_thread',
        { p_title: 'T', p_content: 'C', p_visibility: 'public', p_tag_ids: ['tag-1'] },
        { count: undefined }
      )
    })

    it('uses empty array for tagIds when not provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: THREAD_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      await repo.createThread({ title: 'T', content: 'C', visibility: 'public' })
      expect(mockRpc).toHaveBeenCalledWith('fn_content_create_thread', expect.objectContaining({
        p_tag_ids: [],
      }), { count: undefined })
    })

    it('reads from vw_content_threads_public and returns view data', async () => {
      mockRpc.mockResolvedValueOnce({ data: THREAD_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      const result = await repo.createThread({ title: 'T', content: 'C', visibility: 'public' })
      expect(mockFrom).toHaveBeenCalledWith('vw_content_threads_public')
      expect(result).toEqual(rawThread)
    })

    it('returns fallback record when view returns null (private thread)', async () => {
      mockRpc.mockResolvedValueOnce({ data: THREAD_ID, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.createThread({ title: 'T', content: 'C', visibility: 'private' })
      expect(result.id).toBe(THREAD_ID)
      expect(result.visibility).toBe('private')
    })

    it('throws "Failed to create thread" when RPC returns null threadId', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(repo.createThread({ title: 'T', content: 'C', visibility: 'public' })).rejects.toThrow('Failed to create thread')
    })

    it('rethrows RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('create error') })
      await expect(repo.createThread({ title: 'T', content: 'C', visibility: 'public' })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // createReply
  // ---------------------------------------------------------------------------
  describe('createReply', () => {
    it('calls fn_create_thread_reply with correct params', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ id: REPLY_ID, lenser_id: LENSER_ID }], error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: { id: REPLY_ID, content: 'reply' }, error: null })
      await repo.createReply(THREAD_ID, LENSER_ID, 'reply content')
      expect(mockRpc).toHaveBeenCalledWith('fn_create_thread_reply', {
        p_thread_id: THREAD_ID,
        p_content: 'reply content',
        p_parent_reply_id: null,
      })
    })

    it('passes parentReplyId when provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ id: REPLY_ID, lenser_id: LENSER_ID }], error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: { id: REPLY_ID }, error: null })
      await repo.createReply(THREAD_ID, LENSER_ID, 'text', 'parent-reply-id')
      expect(mockRpc).toHaveBeenCalledWith('fn_create_thread_reply', expect.objectContaining({
        p_parent_reply_id: 'parent-reply-id',
      }))
    })

    it('throws "Failed to create reply" when RPC returns no data', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null })
      await expect(repo.createReply(THREAD_ID, LENSER_ID, 'text')).rejects.toThrow('Failed to create reply')
    })

    it('rethrows RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('reply error') })
      await expect(repo.createReply(THREAD_ID, LENSER_ID, 'text')).rejects.toThrow('reply error')
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingThreads
  // ---------------------------------------------------------------------------
  describe('getTrendingThreads', () => {
    it('calls fn_content_get_trending_threads with lang, limit, offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingThreads('en', 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_trending_threads', {
        p_lang: 'en',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('passes null for lang when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingThreads()
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_trending_threads', expect.objectContaining({
        p_lang: null,
      }))
    })

    it('maps rows to ThreadFeedItem with reactionCount summed and author fields', async () => {
      const row = {
        id: THREAD_ID,
        title: 'Hot Thread',
        author_profile: { id: LENSER_ID, display_name: 'Alice', handle: 'alice', avatar_url: null },
        tags: [],
        reaction_totals: { like: 3, love: 2 },
        reply_count: 5,
        created_at: '2026-01-01T00:00:00Z',
        status: 'published',
        hot_score: 0.9,
        primary_language: 'en',
      }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getTrendingThreads()
      expect(result.data[0].reactionCount).toBe(5) // 3 + 2
      expect(result.data[0].author.displayName).toBe('Alice')
      expect(result.data[0].hotScore).toBe(0.9)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('trending error') })
      await expect(repo.getTrendingThreads()).rejects.toThrow('trending error')
    })
  })

  // ---------------------------------------------------------------------------
  // getPersonalFeed
  // ---------------------------------------------------------------------------
  describe('getPersonalFeed', () => {
    it('calls fn_content_get_personal_threads with limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPersonalFeed(10, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_personal_threads', {
        p_limit: 20,
        p_offset: 10,
      })
    })

    it('includes personalScore in mapped items', async () => {
      const row = {
        id: THREAD_ID,
        title: 'Personal',
        author_profile: {},
        tags: [],
        reaction_totals: {},
        reply_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        status: 'published',
        hot_score: 0.5,
        personal_score: 0.8,
      }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getPersonalFeed()
      expect(result.data[0].personalScore).toBe(0.8)
    })
  })

  // ---------------------------------------------------------------------------
  // getFollowingFeed
  // ---------------------------------------------------------------------------
  describe('getFollowingFeed', () => {
    it('calls fn_content_get_following_threads with lenserId, limit, offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getFollowingFeed(LENSER_ID, 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_following_threads', {
        p_lenser_id: LENSER_ID,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('returns pagination envelope', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const result = await repo.getFollowingFeed(LENSER_ID)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('meta')
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingTags
  // ---------------------------------------------------------------------------
  describe('getTrendingTags', () => {
    it('queries vw_content_tags_public with limit', async () => {
      const tags = [{ id: 'tag-1', slug: 'python', name: 'Python' }]
      chainMethods.limit.mockResolvedValue({ data: tags, error: null })
      const result = await repo.getTrendingTags(5)
      expect(mockFrom).toHaveBeenCalledWith('vw_content_tags_public')
      expect(chainMethods.limit).toHaveBeenCalledWith(5)
      expect(result[0].slug).toBe('python')
    })

    it('returns [] on error (silently swallowed)', async () => {
      chainMethods.limit.mockResolvedValue({ data: null, error: new Error('tags error') })
      expect(await repo.getTrendingTags(5)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // updateThread
  // ---------------------------------------------------------------------------
  describe('updateThread', () => {
    it('calls fn_update_thread_visibility when dto contains visibility', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      await repo.updateThread(THREAD_ID, { visibility: 'private' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_thread_visibility', {
        p_thread_id: THREAD_ID,
        p_visibility: 'private',
      })
    })

    it('calls fn_update_thread_translation with p_content', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      await repo.updateThread(THREAD_ID, { title: 'New Title', content: 'New Content' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_thread_translation', expect.objectContaining({
        p_thread_id: THREAD_ID,
        p_title: 'New Title',
        p_content: 'New Content',
      }))
    })

    it('calls fn_remap_thread_tags when dto contains tagIds', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: rawThread, error: null })
      await repo.updateThread(THREAD_ID, { tagIds: ['tag-1', 'tag-2'] })
      expect(mockRpc).toHaveBeenCalledWith('fn_remap_thread_tags', {
        p_thread_id: THREAD_ID,
        p_tag_ids: ['tag-1', 'tag-2'],
      })
    })

    it('returns fallback when view returns null after update', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.updateThread(THREAD_ID, { title: 'T', visibility: 'public' })
      expect(result.id).toBe(THREAD_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // deleteThread
  // ---------------------------------------------------------------------------
  describe('deleteThread', () => {
    it('calls fn_delete_thread with p_thread_id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.deleteThread(THREAD_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_thread', {
        p_thread_id: THREAD_ID,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('delete error') })
      await expect(repo.deleteThread(THREAD_ID)).rejects.toThrow('delete error')
    })
  })

  // ---------------------------------------------------------------------------
  // deleteReply
  // ---------------------------------------------------------------------------
  describe('deleteReply', () => {
    it('calls fn_delete_thread_reply with p_reply_id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.deleteReply(REPLY_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_thread_reply', {
        p_reply_id: REPLY_ID,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('delete error') })
      await expect(repo.deleteReply(REPLY_ID)).rejects.toThrow('delete error')
    })
  })
})
