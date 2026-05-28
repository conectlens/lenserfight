import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseSocialGraphRepository } from './socialGraphRepository'

const LENSER_ID = 'lenser-uuid-1'
const TARGET_ID = 'target-uuid-1'
const SOURCE_ID = 'source-uuid-1'

describe('SupabaseSocialGraphRepository', () => {
  let repo: SupabaseSocialGraphRepository

  beforeEach(() => {
    repo = new SupabaseSocialGraphRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // follow
  // ---------------------------------------------------------------------------
  describe('follow', () => {
    it('calls fn_request_follow with p_target_profile_id', async () => {
      await repo.follow(TARGET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_request_follow', { p_target_profile_id: TARGET_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('follow error') })
      await expect(repo.follow(TARGET_ID)).rejects.toThrow('follow error')
    })
  })

  // ---------------------------------------------------------------------------
  // unfollow
  // ---------------------------------------------------------------------------
  describe('unfollow', () => {
    it('calls fn_remove_follow with p_target_profile_id', async () => {
      await repo.unfollow(TARGET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_remove_follow', { p_target_profile_id: TARGET_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('unfollow error') })
      await expect(repo.unfollow(TARGET_ID)).rejects.toThrow('unfollow error')
    })
  })

  // ---------------------------------------------------------------------------
  // acceptRequest
  // ---------------------------------------------------------------------------
  describe('acceptRequest', () => {
    it('calls fn_accept_follow_request with p_source_profile_id', async () => {
      await repo.acceptRequest(SOURCE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_accept_follow_request', { p_source_profile_id: SOURCE_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('accept error') })
      await expect(repo.acceptRequest(SOURCE_ID)).rejects.toThrow('accept error')
    })
  })

  // ---------------------------------------------------------------------------
  // getFollowStatus
  // ---------------------------------------------------------------------------
  describe('getFollowStatus', () => {
    it('calls fn_get_follow_status with p_target_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: 'following', error: null })
      const result = await repo.getFollowStatus(TARGET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_follow_status', { p_target_profile_id: TARGET_ID })
      expect(result).toBe('following')
    })

    it('returns "none" when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getFollowStatus(TARGET_ID)).toBe('none')
    })

    it('returns "pending" when relationship is pending', async () => {
      mockRpc.mockResolvedValue({ data: 'pending', error: null })
      expect(await repo.getFollowStatus(TARGET_ID)).toBe('pending')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('status error') })
      await expect(repo.getFollowStatus(TARGET_ID)).rejects.toThrow('status error')
    })
  })

  // ---------------------------------------------------------------------------
  // listFollowers
  // ---------------------------------------------------------------------------
  describe('listFollowers', () => {
    it('calls fn_lensers_get_follows with type="followers" and default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listFollowers(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_follows', {
        p_lenser_id: LENSER_ID,
        p_type: 'followers',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('passes custom limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listFollowers(LENSER_ID, 50, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_follows', expect.objectContaining({
        p_limit: 50,
        p_offset: 20,
      }))
    })

    it('returns follower records', async () => {
      const followers = [{ lenser_id: 'l-1', handle: 'bob', display_name: 'Bob', avatar_url: null, is_following: false }]
      mockRpc.mockResolvedValue({ data: followers, error: null })
      expect(await repo.listFollowers(LENSER_ID)).toEqual(followers)
    })

    it('returns empty array when no followers', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listFollowers(LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('followers error') })
      await expect(repo.listFollowers(LENSER_ID)).rejects.toThrow('followers error')
    })
  })

  // ---------------------------------------------------------------------------
  // listFollowing
  // ---------------------------------------------------------------------------
  describe('listFollowing', () => {
    it('calls fn_lensers_get_follows with type="following" and default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listFollowing(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_follows', {
        p_lenser_id: LENSER_ID,
        p_type: 'following',
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('passes custom limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listFollowing(LENSER_ID, 10, 5)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_follows', expect.objectContaining({
        p_limit: 10,
        p_offset: 5,
      }))
    })

    it('returns following records', async () => {
      const following = [{ lenser_id: 'l-2', handle: 'charlie', display_name: 'Charlie', avatar_url: null, is_following: true }]
      mockRpc.mockResolvedValue({ data: following, error: null })
      expect(await repo.listFollowing(LENSER_ID)).toEqual(following)
    })

    it('returns empty array when no following', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listFollowing(LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('following error') })
      await expect(repo.listFollowing(LENSER_ID)).rejects.toThrow('following error')
    })
  })

  // ---------------------------------------------------------------------------
  // listFollowers vs listFollowing — confirm p_type differs
  // ---------------------------------------------------------------------------
  describe('p_type distinction', () => {
    it('listFollowers passes "followers", listFollowing passes "following"', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listFollowers(LENSER_ID)
      await repo.listFollowing(LENSER_ID)
      expect(mockRpc.mock.calls[0][1].p_type).toBe('followers')
      expect(mockRpc.mock.calls[1][1].p_type).toBe('following')
    })
  })
})
