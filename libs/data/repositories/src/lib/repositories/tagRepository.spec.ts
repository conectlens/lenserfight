import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockGetUser, chainMethods } = vi.hoisted(() => {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))

  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    mockGetUser: vi.fn(),
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}))

import { SupabaseTagRepository } from './tagRepository'

const TAG_ID = 'tag-uuid-1'

const rawTag = {
  id: TAG_ID,
  name: 'Python',
  slug: 'python',
  visibility: 'public',
  total_usage: 42,
  trend_score_7d: 0.8,
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseTagRepository', () => {
  let repo: SupabaseTagRepository

  beforeEach(() => {
    repo = new SupabaseTagRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
    chainMethods.single.mockResolvedValue({ data: null, error: null })
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  // ---------------------------------------------------------------------------
  // handleError behavior
  // ---------------------------------------------------------------------------
  describe('handleError (via findBySlug)', () => {
    it('throws permission denied message on 42501', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })
      await expect(repo.findBySlug('python')).rejects.toThrow("This tag is private or you don't have permission to access it.")
    })

    it('rethrows generic errors', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: new Error('generic error') })
      await expect(repo.findBySlug('python')).rejects.toThrow('generic error')
    })
  })

  // ---------------------------------------------------------------------------
  // findBySlug
  // ---------------------------------------------------------------------------
  describe('findBySlug', () => {
    it('queries vw_tags_public_stats by slug', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: rawTag, error: null })
      const result = await repo.findBySlug('python')
      expect(mockFrom).toHaveBeenCalledWith('vw_tags_public_stats')
      expect(chainMethods.eq).toHaveBeenCalledWith('slug', 'python')
      expect(result).toEqual(rawTag)
    })

    it('returns null when tag not found', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      expect(await repo.findBySlug('unknown')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('queries vw_tags_public_stats by id', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: rawTag, error: null })
      await repo.findById(TAG_ID)
      expect(chainMethods.eq).toHaveBeenCalledWith('id', TAG_ID)
    })

    it('returns null when not found', async () => {
      chainMethods.maybeSingle.mockResolvedValue({ data: null, error: null })
      expect(await repo.findById(TAG_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getAllTagsWithCounts
  // ---------------------------------------------------------------------------
  describe('getAllTagsWithCounts', () => {
    it('calls fn_tags_get_cloud with default limit 10', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getAllTagsWithCounts()
      expect(mockRpc).toHaveBeenCalledWith('fn_tags_get_cloud', { p_limit: 10 })
    })

    it('maps raw rows to TagUsage shape', async () => {
      const raw = [{ id: TAG_ID, name: 'Python', slug: 'python', description: 'PL', visibility: 'public', created_at: '2026-01-01T00:00:00Z', total_usage: 5, trend_score_7d: 0.5 }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [tag] = await repo.getAllTagsWithCounts()
      expect(tag.count).toBe(5)
      expect(tag.trendingScore).toBe(0.5)
    })

    it('defaults count and trendingScore to 0 when absent', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: TAG_ID, name: 'X', slug: 'x', visibility: 'public', created_at: '2026-01-01' }], error: null })
      const [tag] = await repo.getAllTagsWithCounts()
      expect(tag.count).toBe(0)
      expect(tag.trendingScore).toBe(0)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAllTagsWithCounts()).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // searchTags
  // ---------------------------------------------------------------------------
  describe('searchTags', () => {
    it('calls fn_tags_search with defaults lang=en and limit=5', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.searchTags('py')
      expect(mockRpc).toHaveBeenCalledWith('fn_tags_search', { p_query: 'py', p_lang: 'en', p_limit: 5 })
    })

    it('supports custom lang and limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.searchTags('py', 'tr', 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_tags_search', { p_query: 'py', p_lang: 'tr', p_limit: 20 })
    })

    it('maps raw rows to TagUsage shape', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: TAG_ID, name: 'Python', slug: 'python', visibility: 'public', total_usage: 10 }], error: null })
      const [tag] = await repo.searchTags('py')
      expect(tag.count).toBe(10)
      expect(tag.trendingScore).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // createTag
  // ---------------------------------------------------------------------------
  describe('createTag', () => {
    it('resolves language from authenticated user profile then calls fn_create_tag', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockRpc
        .mockResolvedValueOnce({ data: 'tr', error: null }) // fn_get_lenser_language_preference
        .mockReturnValueOnce({ single: chainMethods.single }) // fn_create_tag RPC chain
      chainMethods.single.mockResolvedValue({ data: rawTag, error: null })

      await repo.createTag('Python', 'python')

      expect(mockRpc.mock.calls[0][0]).toBe('fn_get_lenser_language_preference')
      expect(mockRpc.mock.calls[1][0]).toBe('fn_create_tag')
      expect(mockRpc.mock.calls[1][1]).toEqual({ p_name: 'Python', p_slug: 'python', p_language_code: 'tr' })
    })

    it('uses "en" language when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      mockRpc.mockReturnValue({ single: chainMethods.single })
      chainMethods.single.mockResolvedValue({ data: rawTag, error: null })
      await repo.createTag('Python', 'python')
      expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_language_code: 'en' })
    })

    it('throws when data is null after RPC', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      mockRpc.mockReturnValue({ single: chainMethods.single })
      chainMethods.single.mockResolvedValue({ data: null, error: null })
      await expect(repo.createTag('Python', 'python')).rejects.toThrow('Failed to retrieve newly created tag.')
    })
  })

  // ---------------------------------------------------------------------------
  // recordActivity — delegates to recordBatchActivity
  // ---------------------------------------------------------------------------
  describe('recordActivity', () => {
    it('delegates to recordBatchActivity with single event wrapped in array', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const event = { entity_type: 'lens', entity_id: 'l-1', tag_id: TAG_ID, action: 'view' } as any
      await repo.recordActivity(event)
      expect(mockRpc).toHaveBeenCalledWith('fn_tag_activity_log', { p_events: [event] })
    })
  })

  // ---------------------------------------------------------------------------
  // recordBatchActivity
  // ---------------------------------------------------------------------------
  describe('recordBatchActivity', () => {
    it('returns immediately without RPC call when events array is empty', async () => {
      await repo.recordBatchActivity([])
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls fn_tag_activity_log with events', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const events = [{ entity_type: 'lens', entity_id: 'l-1', tag_id: TAG_ID, action: 'view' }] as any[]
      await repo.recordBatchActivity(events)
      expect(mockRpc).toHaveBeenCalledWith('fn_tag_activity_log', { p_events: events })
    })

    it('swallows Supabase errors silently (console.warn only)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('log error') })
      await expect(repo.recordBatchActivity([{ entity_type: 'lens', entity_id: 'l-1', tag_id: TAG_ID, action: 'view' } as any])).resolves.toBeUndefined()
    })

    it('swallows thrown exceptions silently', async () => {
      mockRpc.mockRejectedValue(new Error('network error'))
      await expect(repo.recordBatchActivity([{ entity_type: 'lens', entity_id: 'l-1', tag_id: TAG_ID, action: 'view' } as any])).resolves.toBeUndefined()
    })
  })
})
