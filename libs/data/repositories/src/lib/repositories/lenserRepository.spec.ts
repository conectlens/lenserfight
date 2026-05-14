import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockSelect, mockEq, mockOrder, mockRange, mockGetSession, chainMethods } =
  vi.hoisted(() => {
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockOrder = vi.fn()
    const mockRange = vi.fn()
    const chainMethods = { select: mockSelect, eq: mockEq, order: mockOrder, range: mockRange }
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    return {
      mockRpc: vi.fn(),
      mockFrom: vi.fn().mockReturnValue(chainMethods),
      mockSelect,
      mockEq,
      mockOrder,
      mockRange,
      mockGetSession: vi.fn(),
      chainMethods,
    }
  })

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
}))

import { SupabaseLenserRepository, mapProfileToAuthProfileGate } from './lenserRepository'

const LENSER_ID = 'lenser-uuid-1'
const HANDLE = 'alice'

const fakeLenser = {
  id: LENSER_ID,
  handle: HANDLE,
  display_name: 'Alice',
  avatar_url: null,
  status: 'active',
  onboarding_step: 2,
  deletion_requested_at: null,
}

describe('mapProfileToAuthProfileGate (pure function)', () => {
  it('returns { kind: "new" } for null profile', () => {
    expect(mapProfileToAuthProfileGate(null)).toEqual({ kind: 'new' })
  })

  it('returns { kind: "new" } for undefined profile', () => {
    expect(mapProfileToAuthProfileGate(undefined)).toEqual({ kind: 'new' })
  })

  it('returns { kind: "deleted" } for status === "deleted"', () => {
    const result = mapProfileToAuthProfileGate({ status: 'deleted', deletion_requested_at: null, onboarding_step: 0 })
    expect(result.kind).toBe('deleted')
  })

  it('returns { kind: "recoverable" } when deletion_requested_at is set', () => {
    const result = mapProfileToAuthProfileGate({ status: 'active', deletion_requested_at: '2026-01-01', onboarding_step: 2 })
    expect(result.kind).toBe('recoverable')
  })

  it('returns { kind: "onboarding" } when onboarding_step < 2', () => {
    const result = mapProfileToAuthProfileGate({ status: 'active', deletion_requested_at: null, onboarding_step: 1 })
    expect(result.kind).toBe('onboarding')
    if (result.kind === 'onboarding') expect(result.onboardingStep).toBe(1)
  })

  it('returns { kind: "onboarding" } when onboarding_step is null (treated as 0)', () => {
    const result = mapProfileToAuthProfileGate({ status: 'active', deletion_requested_at: null, onboarding_step: null as unknown as number })
    expect(result.kind).toBe('onboarding')
  })

  it('returns { kind: "active" } for active profile with onboarding_step >= 2', () => {
    const result = mapProfileToAuthProfileGate({ status: 'active', deletion_requested_at: null, onboarding_step: 2 })
    expect(result.kind).toBe('active')
  })

  it('returns { kind: "recoverable" } for status === "pending_deletion"', () => {
    const result = mapProfileToAuthProfileGate({ status: 'pending_deletion', deletion_requested_at: null, onboarding_step: 0 })
    expect(result.kind).toBe('recoverable')
  })

  it('returns { kind: "recoverable" } for status === "deactivated"', () => {
    const result = mapProfileToAuthProfileGate({ status: 'deactivated', deletion_requested_at: null, onboarding_step: 0 })
    expect(result.kind).toBe('recoverable')
  })

  it('returns { kind: "deleted" } for unrecognized status', () => {
    const result = mapProfileToAuthProfileGate({ status: 'unknown_state', deletion_requested_at: null, onboarding_step: 0 })
    expect(result.kind).toBe('deleted')
  })
})

describe('SupabaseLenserRepository', () => {
  let repo: SupabaseLenserRepository

  beforeEach(() => {
    repo = new SupabaseLenserRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    mockGetSession.mockResolvedValue({ data: { session: null } })
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  })

  // ---------------------------------------------------------------------------
  // getPublicLenserProfile
  // ---------------------------------------------------------------------------
  describe('getPublicLenserProfile', () => {
    const fakePublicProfile = {
      id: LENSER_ID, handle: HANDLE, display_name: 'Alice', avatar_url: null,
      headline: null, join_order: 1, total_xp: 0, current_level: 1, badges: [], created_at: '2026-01-01T00:00:00Z',
    }

    it('calls fn_lensers_get_public_profile with p_handle', async () => {
      mockRpc.mockResolvedValue({ data: fakePublicProfile, error: null })
      const result = await repo.getPublicLenserProfile(HANDLE)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_public_profile', { p_handle: HANDLE })
      expect(result.handle).toBe(HANDLE)
    })

    it('maps created_at to empty string when null', async () => {
      mockRpc.mockResolvedValue({ data: { ...fakePublicProfile, created_at: null }, error: null })
      const result = await repo.getPublicLenserProfile(HANDLE)
      expect(result.created_at).toBe('')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('profile error') })
      await expect(repo.getPublicLenserProfile(HANDLE)).rejects.toThrow('profile error')
    })
  })

  // ---------------------------------------------------------------------------
  // getActiveLenser / getAuthenticatedLenser
  // ---------------------------------------------------------------------------
  describe('getActiveLenser', () => {
    it('returns null when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      expect(await repo.getActiveLenser()).toBeNull()
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls fn_lensers_get_active_profile when session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
      mockRpc.mockResolvedValue({ data: [fakeLenser], error: null })
      const result = await repo.getActiveLenser()
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_active_profile')
      expect(result).toEqual(fakeLenser)
    })

    it('returns null when RPC returns error', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
      mockRpc.mockResolvedValue({ data: null, error: new Error('auth error') })
      expect(await repo.getActiveLenser()).toBeNull()
    })

    it('returns null when data is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getActiveLenser()).toBeNull()
    })
  })

  describe('getAuthenticatedLenser', () => {
    it('delegates to getActiveLenser', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      expect(await repo.getAuthenticatedLenser()).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getAuthenticatedProfileGate
  // ---------------------------------------------------------------------------
  describe('getAuthenticatedProfileGate', () => {
    it('returns { kind: "new" } when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      expect(await repo.getAuthenticatedProfileGate()).toEqual({ kind: 'new' })
    })

    it('calls fn_get_auth_profile_gate and maps result', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
      mockRpc.mockResolvedValue({ data: [{ status: 'active', deletion_requested_at: null, onboarding_step: 2 }], error: null })
      const result = await repo.getAuthenticatedProfileGate()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_auth_profile_gate')
      expect(result.kind).toBe('active')
    })

    it('rethrows errors from fn_get_auth_profile_gate', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
      mockRpc.mockResolvedValue({ data: null, error: new Error('gate error') })
      await expect(repo.getAuthenticatedProfileGate()).rejects.toThrow('gate error')
    })
  })

  // ---------------------------------------------------------------------------
  // createLenser
  // ---------------------------------------------------------------------------
  describe('createLenser', () => {
    it('calls fn_lensers_create_profile with handle, display_name, bio', async () => {
      mockRpc.mockResolvedValue({ data: fakeLenser, error: null })
      await repo.createLenser({ handle: 'alice', display_name: 'Alice', bio: 'hello' })
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_create_profile', {
        p_handle: 'alice',
        p_display_name: 'Alice',
        p_bio: 'hello',
      })
    })

    it('defaults bio to empty string when not provided', async () => {
      mockRpc.mockResolvedValue({ data: fakeLenser, error: null })
      await repo.createLenser({ handle: 'alice', display_name: 'Alice', bio: undefined as any })
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_create_profile', expect.objectContaining({ p_bio: '' }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createLenser({ handle: 'alice', display_name: 'Alice', bio: '' })).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // updateLenser
  // ---------------------------------------------------------------------------
  describe('updateLenser', () => {
    it('calls fn_lensers_update_profile with only provided fields', async () => {
      mockRpc.mockResolvedValue({ data: fakeLenser, error: null })
      await repo.updateLenser({ display_name: 'Alice Updated', bio: 'new bio' })
      const call = mockRpc.mock.calls[0]
      expect(call[0]).toBe('fn_lensers_update_profile')
      expect(call[1].p_data.display_name).toBe('Alice Updated')
      expect(call[1].p_data.bio).toBe('new bio')
      expect(call[1].p_data).not.toHaveProperty('avatar_url')
    })

    it('includes avatar_url when provided', async () => {
      mockRpc.mockResolvedValue({ data: fakeLenser, error: null })
      await repo.updateLenser({ avatar_url: 'https://example.com/avatar.png' })
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_update_profile', { p_data: expect.objectContaining({ avatar_url: 'https://example.com/avatar.png' }) })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('update error') })
      await expect(repo.updateLenser({ display_name: 'X' })).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // requestDeletion
  // ---------------------------------------------------------------------------
  describe('requestDeletion', () => {
    it('calls fn_lensers_request_deletion', async () => {
      await repo.requestDeletion(HANDLE)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_request_deletion')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('deletion error') })
      await expect(repo.requestDeletion(HANDLE)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getRecentlyActive
  // ---------------------------------------------------------------------------
  describe('getRecentlyActive', () => {
    it('calls fn_get_lenser_profile_brief and slices to limit', async () => {
      const lensers = Array.from({ length: 10 }, (_, i) => ({ ...fakeLenser, id: `l-${i}` }))
      mockRpc.mockResolvedValue({ data: lensers, error: null })
      const result = await repo.getRecentlyActive(3)
      expect(result).toHaveLength(3)
    })

    it('returns empty array when null data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getRecentlyActive(5)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getLatestJoined
  // ---------------------------------------------------------------------------
  describe('getLatestJoined', () => {
    it('queries vw_lensers_public_recent', async () => {
      mockSelect.mockResolvedValue({ data: [fakeLenser], error: null })
      await repo.getLatestJoined()
      expect(mockFrom).toHaveBeenCalledWith('vw_lensers_public_recent')
      expect(mockSelect).toHaveBeenCalledWith('*')
    })

    it('rethrows errors', async () => {
      mockSelect.mockResolvedValue({ data: null, error: new Error('view error') })
      await expect(repo.getLatestJoined()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getPromptsByLenser
  // ---------------------------------------------------------------------------
  describe('getPromptsByLenser', () => {
    it('queries vw_lenses_public with eq(handle) and range', async () => {
      mockRange.mockResolvedValue({ data: [], error: null })
      await repo.getPromptsByLenser(HANDLE, 0, 10)
      expect(mockFrom).toHaveBeenCalledWith('vw_lenses_public')
      expect(mockEq).toHaveBeenCalledWith('handle', HANDLE)
      expect(mockRange).toHaveBeenCalledWith(0, 9)
    })

    it('rethrows errors', async () => {
      mockRange.mockResolvedValue({ data: null, error: new Error('prompts error') })
      await expect(repo.getPromptsByLenser(HANDLE)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getThreadsByLenser
  // ---------------------------------------------------------------------------
  describe('getThreadsByLenser', () => {
    it('queries threads table with eq(lenser_id) and adds visibility filter for non-owner', async () => {
      // When viewerId !== lenserId: chain is .eq(lenser_id).order().range().eq(visibility) — second eq is awaited
      mockEq
        .mockReturnValueOnce(chainMethods) // first call: .eq('lenser_id', ...) continues the chain
        .mockResolvedValueOnce({ data: [], error: null }) // second call: .eq('visibility', 'public') is awaited
      await repo.getThreadsByLenser(LENSER_ID, 0, 10, 'other-lenser')
      expect(mockFrom).toHaveBeenCalledWith('threads')
      expect(mockEq).toHaveBeenCalledWith('lenser_id', LENSER_ID)
      expect(mockEq).toHaveBeenCalledWith('visibility', 'public')
    })

    it('does not add visibility filter when viewer is owner', async () => {
      // When viewerId === lenserId: chain ends with .range() which is awaited
      mockRange.mockResolvedValue({ data: [], error: null })
      await repo.getThreadsByLenser(LENSER_ID, 0, 10, LENSER_ID)
      const eqCalls = mockEq.mock.calls
      expect(eqCalls.some((c) => c[0] === 'visibility')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Stub methods — return [] unconditionally
  // ---------------------------------------------------------------------------
  describe('getActivityTimeline', () => {
    it('calls fn_get_lenser_activity_timeline with p_handle', async () => {
      const rows = [
        { date: '2026-01-01', count: 3 },
        { date: '2026-01-02', count: 0 },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.getActivityTimeline(HANDLE)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lenser_activity_timeline', {
        p_handle: HANDLE,
      })
      expect(result).toEqual([
        { date: '2026-01-01', count: 3 },
        { date: '2026-01-02', count: 0 },
      ])
    })

    it('throws when RPC returns an error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('rpc failed') })
      await expect(repo.getActivityTimeline(HANDLE)).rejects.toThrow('rpc failed')
    })
  })

  describe('getLenserActions', () => {
    it('returns empty array without calling Supabase', async () => {
      expect(await repo.getLenserActions(LENSER_ID)).toEqual([])
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('getLenserNetwork', () => {
    it('returns empty array without calling Supabase', async () => {
      expect(await repo.getLenserNetwork(LENSER_ID, 'followers', 1)).toEqual([])
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // getLenserById
  // ---------------------------------------------------------------------------
  describe('getLenserById', () => {
    it('calls fn_get_lenser_profile_brief with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeLenser], error: null })
      const result = await repo.getLenserById(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lenser_profile_brief', {
        p_handle: null,
        p_lenser_id: LENSER_ID,
      })
      expect(result).toEqual(fakeLenser)
    })

    it('returns null on error (does not throw)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      expect(await repo.getLenserById(LENSER_ID)).toBeNull()
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getLenserById(LENSER_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getLanguages
  // ---------------------------------------------------------------------------
  describe('getLanguages', () => {
    it('calls fn_core_languages_list', async () => {
      mockRpc.mockResolvedValue({ data: [{ code: 'tr', name: 'Turkish' }], error: null })
      const result = await repo.getLanguages()
      expect(mockRpc).toHaveBeenCalledWith('fn_core_languages_list')
      expect(result).toEqual([{ code: 'tr', name: 'Turkish' }])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('lang error') })
      await expect(repo.getLanguages()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingLensers
  // ---------------------------------------------------------------------------
  describe('getTrendingLensers', () => {
    it('calls fn_lensers_get_trending with default limit 10', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingLensers()
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_trending', { p_limit: 10 })
    })

    it('maps row fields to camelCase TrendingLenser', async () => {
      mockRpc.mockResolvedValue({
        data: [{ lenser_id: 'l-1', handle: 'alice', display_name: 'Alice', avatar_url: null, total_xp: '100', current_level: 5, lenser_score: 42 }],
        error: null,
      })
      const [result] = await repo.getTrendingLensers()
      expect(result.lenserId).toBe('l-1')
      expect(result.totalXp).toBe(100)
      expect(result.lenserScore).toBe(42)
    })
  })

  // ---------------------------------------------------------------------------
  // followLenser / unfollowLenser / isFollowing
  // ---------------------------------------------------------------------------
  describe('followLenser', () => {
    it('calls fn_lensers_follow with p_following_id', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'following' }, error: null })
      await repo.followLenser('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_follow', { p_following_id: 'target-1' })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('follow error') })
      await expect(repo.followLenser('target-1')).rejects.toThrow()
    })
  })

  describe('unfollowLenser', () => {
    it('calls fn_lensers_unfollow with p_following_id', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'none' }, error: null })
      await repo.unfollowLenser('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_unfollow', { p_following_id: 'target-1' })
    })
  })

  describe('isFollowing', () => {
    it('returns true when RPC returns true', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      expect(await repo.isFollowing('target-1')).toBe(true)
    })

    it('returns false on error (does not throw)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('follow check error') })
      expect(await repo.isFollowing('target-1')).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // getLenserFollows
  // ---------------------------------------------------------------------------
  describe('getLenserFollows', () => {
    it('calls fn_lensers_get_follows with type and pagination', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const result = await repo.getLenserFollows(LENSER_ID, 'followers', 0, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_follows', {
        p_lenser_id: LENSER_ID,
        p_type: 'followers',
        p_limit: 20,
        p_offset: 0,
      })
      expect(result.data).toEqual([])
    })

    it('sets hasNextPage true when rows.length >= limit', async () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({ lenser_id: `l-${i}`, handle: `h${i}`, display_name: `U${i}`, avatar_url: null, is_following: false }))
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.getLenserFollows(LENSER_ID, 'following', 0, 20)
      expect(result.meta?.hasNextPage).toBe(true)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('follows error') })
      await expect(repo.getLenserFollows(LENSER_ID, 'followers')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getSuggestedLensers
  // ---------------------------------------------------------------------------
  describe('getSuggestedLensers', () => {
    it('calls fn_lensers_get_suggested with p_lenser_id and limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSuggestedLensers(LENSER_ID, 5)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_suggested', { p_lenser_id: LENSER_ID, p_limit: 5 })
    })
  })

  // ---------------------------------------------------------------------------
  // getLeaderboard
  // ---------------------------------------------------------------------------
  describe('getLeaderboard', () => {
    it('calls fn_lensers_get_leaderboard with period and limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getLeaderboard('weekly', 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_leaderboard', { p_period: 'weekly', p_limit: 10 })
    })

    it('defaults period to all_time and limit to 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getLeaderboard()
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_leaderboard', { p_period: 'all_time', p_limit: 20 })
    })
  })

  // ---------------------------------------------------------------------------
  // listLensers
  // ---------------------------------------------------------------------------
  describe('listLensers', () => {
    it('calls fn_lensers_list with type, limit, offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listLensers({ type: 'human', limit: 10, offset: 0 })
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_list', { p_type: 'human', p_limit: 10, p_offset: 0 })
    })

    it('passes null for type when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listLensers({})
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_list', expect.objectContaining({ p_type: null }))
    })
  })

  // ---------------------------------------------------------------------------
  // getProfile
  // ---------------------------------------------------------------------------
  describe('getProfile', () => {
    it('calls fn_lensers_get_profile with p_handle', async () => {
      const payload = { route_state: 'PUBLIC_PROFILE', profile: fakeLenser, relationship_state: null, access_reason: null }
      mockRpc.mockResolvedValue({ data: payload, error: null })
      const result = await repo.getProfile(HANDLE)
      expect(mockRpc).toHaveBeenCalledWith('fn_lensers_get_profile', { p_handle: HANDLE })
      expect(result).toEqual(payload)
    })

    it('returns UNAVAILABLE_PROFILE when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.getProfile(HANDLE)
      expect(result.route_state).toBe('UNAVAILABLE_PROFILE')
      expect(result.access_reason).toBe('not_found')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('profile error') })
      await expect(repo.getProfile(HANDLE)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Follow requests
  // ---------------------------------------------------------------------------
  describe('requestFollow', () => {
    it('calls fn_request_follow with p_target_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'pending' }, error: null })
      await repo.requestFollow('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_request_follow', { p_target_profile_id: 'target-1' })
    })
  })

  describe('removeFollow', () => {
    it('calls fn_remove_follow with p_target_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'none' }, error: null })
      await repo.removeFollow('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_remove_follow', { p_target_profile_id: 'target-1' })
    })
  })

  describe('acceptFollowRequest', () => {
    it('calls fn_accept_follow_request with p_source_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      await repo.acceptFollowRequest('source-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_accept_follow_request', { p_source_profile_id: 'source-1' })
    })
  })

  describe('rejectFollowRequest', () => {
    it('calls fn_reject_follow_request with p_source_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      await repo.rejectFollowRequest('source-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_reject_follow_request', { p_source_profile_id: 'source-1' })
    })
  })

  describe('getPendingRequests', () => {
    it('calls fn_get_pending_requests with default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPendingRequests()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_pending_requests', { p_limit: 20, p_offset: 0 })
    })
  })

  // ---------------------------------------------------------------------------
  // Block / Unblock
  // ---------------------------------------------------------------------------
  describe('blockProfile', () => {
    it('calls fn_block_profile with p_target_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { blocked: true }, error: null })
      const result = await repo.blockProfile('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_block_profile', { p_target_profile_id: 'target-1' })
      expect(result).toEqual({ blocked: true })
    })
  })

  describe('unblockProfile', () => {
    it('calls fn_unblock_profile with p_target_profile_id', async () => {
      mockRpc.mockResolvedValue({ data: { blocked: false }, error: null })
      await repo.unblockProfile('target-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_unblock_profile', { p_target_profile_id: 'target-1' })
    })
  })

  // ---------------------------------------------------------------------------
  // Account lifecycle
  // ---------------------------------------------------------------------------
  describe('deactivateAccount', () => {
    it('calls fn_deactivate_account', async () => {
      mockRpc.mockResolvedValue({ data: { success: true }, error: null })
      await repo.deactivateAccount()
      expect(mockRpc).toHaveBeenCalledWith('fn_deactivate_account')
    })
  })

  describe('scheduleAccountDeletion', () => {
    it('calls fn_schedule_account_deletion', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, deadline: '2026-06-01' }, error: null })
      await repo.scheduleAccountDeletion()
      expect(mockRpc).toHaveBeenCalledWith('fn_schedule_account_deletion')
    })
  })

  describe('cancelDeletionOnLogin', () => {
    it('calls fn_cancel_account_deletion_on_login and returns result', async () => {
      mockRpc.mockResolvedValue({ data: { restored: true, from_status: 'pending_deletion' }, error: null })
      const result = await repo.cancelDeletionOnLogin()
      expect(mockRpc).toHaveBeenCalledWith('fn_cancel_account_deletion_on_login')
      expect(result).toEqual({ restored: true, from_status: 'pending_deletion' })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('cancel error') })
      await expect(repo.cancelDeletionOnLogin()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // searchLensers
  // ---------------------------------------------------------------------------
  describe('searchLensers', () => {
    it('calls fn_search_lensers with query and default limit 8', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.searchLensers('alice')
      expect(mockRpc).toHaveBeenCalledWith('fn_search_lensers', { p_query: 'alice', p_limit: 8 })
    })

    it('passes custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.searchLensers('alice', 4)
      expect(mockRpc).toHaveBeenCalledWith('fn_search_lensers', { p_query: 'alice', p_limit: 4 })
    })

    it('returns empty array when no results', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.searchLensers('xyz')).toEqual([])
    })
  })
})
