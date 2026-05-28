import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseTagFollowsRepository } from './tagFollowsRepository'

const TAG_ID = 'tag-uuid-1'
const LENSER_ID = 'lenser-uuid-1'

describe('SupabaseTagFollowsRepository', () => {
  let repo: SupabaseTagFollowsRepository

  beforeEach(() => {
    repo = new SupabaseTagFollowsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // followTag
  // ---------------------------------------------------------------------------
  describe('followTag', () => {
    it('calls fn_content_follow_tag with p_tag_id', async () => {
      mockRpc.mockResolvedValue({ data: { following: true }, error: null })
      const result = await repo.followTag(TAG_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_follow_tag', { p_tag_id: TAG_ID })
      expect(result).toEqual({ following: true })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('follow error') })
      await expect(repo.followTag(TAG_ID)).rejects.toThrow('follow error')
    })
  })

  // ---------------------------------------------------------------------------
  // unfollowTag
  // ---------------------------------------------------------------------------
  describe('unfollowTag', () => {
    it('calls fn_content_unfollow_tag with p_tag_id', async () => {
      mockRpc.mockResolvedValue({ data: { following: false }, error: null })
      const result = await repo.unfollowTag(TAG_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_unfollow_tag', { p_tag_id: TAG_ID })
      expect(result).toEqual({ following: false })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('unfollow error') })
      await expect(repo.unfollowTag(TAG_ID)).rejects.toThrow('unfollow error')
    })
  })

  // ---------------------------------------------------------------------------
  // getFollowedTags
  // ---------------------------------------------------------------------------
  describe('getFollowedTags', () => {
    it('calls fn_content_get_followed_tags with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getFollowedTags(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_content_get_followed_tags', { p_lenser_id: LENSER_ID })
    })

    it('maps rows to TagFollowRecord shape', async () => {
      const row = { tag_id: TAG_ID, slug: 'python', name: 'Python', followed_at: '2026-01-01T00:00:00Z' }
      mockRpc.mockResolvedValue({ data: [row], error: null })
      const result = await repo.getFollowedTags(LENSER_ID)
      expect(result[0].tagId).toBe(TAG_ID)
      expect(result[0].slug).toBe('python')
      expect(result[0].name).toBe('Python')
      expect(result[0].followedAt).toBe('2026-01-01T00:00:00Z')
    })

    it('applies TS-layer limit via slice', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({ tag_id: `t-${i}`, slug: `t${i}`, name: `T${i}`, followed_at: '2026-01-01' }))
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.getFollowedTags(LENSER_ID, 3)
      expect(result).toHaveLength(3)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getFollowedTags(LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('fetch error') })
      await expect(repo.getFollowedTags(LENSER_ID)).rejects.toThrow('fetch error')
    })
  })

  // ---------------------------------------------------------------------------
  // reportContent
  // ---------------------------------------------------------------------------
  describe('reportContent', () => {
    it('calls fn_content_report with target fields', async () => {
      mockRpc.mockResolvedValue({ data: { reported: true }, error: null })
      const result = await repo.reportContent({
        targetType: 'thread',
        targetId: 'thread-1',
        reason: 'spam',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_content_report', {
        p_target_type: 'thread',
        p_target_id: 'thread-1',
        p_reason: 'spam',
      })
      expect(result).toEqual({ reported: true })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('report error') })
      await expect(repo.reportContent({ targetType: 'lens', targetId: 'l-1', reason: 'spam' })).rejects.toThrow('report error')
    })
  })
})
