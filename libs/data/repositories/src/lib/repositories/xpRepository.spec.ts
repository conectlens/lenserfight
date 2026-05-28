import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockSelect, mockEq, mockMaybeSingle, mockOrder, mockRange, mockGetSession, mockCachedSession } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockRange = vi.fn()
  const mockOrder = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockGetSession = vi.fn()
  const mockCachedSession = vi.fn()
  const mockRpc = vi.fn()

  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })
  mockOrder.mockReturnValue({ range: mockRange })
  mockFrom.mockReturnValue({ select: mockSelect })

  return { mockRpc, mockFrom, mockSelect, mockEq, mockMaybeSingle, mockOrder, mockRange, mockGetSession, mockCachedSession }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
  getCachedSession: mockCachedSession,
}))

import { SupabaseXPRepository, XP_APP_IDS } from './xpRepository'

const LENSER_ID = 'lenser-uuid-1'

describe('SupabaseXPRepository', () => {
  let repo: SupabaseXPRepository

  beforeEach(() => {
    repo = new SupabaseXPRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockRange.mockResolvedValue({ data: [], error: null })
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })
    mockOrder.mockReturnValue({ range: mockRange })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockCachedSession.mockReturnValue(null)
  })

  // ---------------------------------------------------------------------------
  // getXPSummary
  // ---------------------------------------------------------------------------
  describe('getXPSummary', () => {
    it('calls fn_xp_get_summary then queries vw_xp_leaderboard_global for rank', async () => {
      const rpcRow = { total_xp: 1500, current_level: 5, min_total_xp: 1000, max_total_xp: 2000 }
      mockRpc.mockResolvedValue({ data: [rpcRow], error: null })
      mockMaybeSingle.mockResolvedValue({ data: { rank: 42 }, error: null })

      const result = await repo.getXPSummary(LENSER_ID)

      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_summary', { p_lenser_id: LENSER_ID, p_app_id: null })
      expect(mockFrom).toHaveBeenCalledWith('vw_xp_leaderboard_global')
      expect(mockEq).toHaveBeenCalledWith('lenser_id', LENSER_ID)
      expect(result).toEqual({
        totalXp: 1500,
        currentLevel: 5,
        rank: 42,
        currentLevelMinXp: 1000,
        currentLevelMaxXp: 2000,
      })
    })

    it('passes appId when provided', async () => {
      mockRpc.mockResolvedValue({ data: [{ total_xp: 0, current_level: 1, min_total_xp: 0, max_total_xp: null }], error: null })
      await repo.getXPSummary(LENSER_ID, 'app-uuid')
      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_summary', { p_lenser_id: LENSER_ID, p_app_id: 'app-uuid' })
    })

    it('returns rank as undefined when not in leaderboard', async () => {
      mockRpc.mockResolvedValue({ data: [{ total_xp: 0, current_level: 1, min_total_xp: 0, max_total_xp: null }], error: null })
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      const result = await repo.getXPSummary(LENSER_ID)
      expect(result?.rank).toBeUndefined()
    })

    it('defaults null XP values to 0 or 1', async () => {
      mockRpc.mockResolvedValue({ data: [{ total_xp: null, current_level: null, min_total_xp: null, max_total_xp: null }], error: null })
      const result = await repo.getXPSummary(LENSER_ID)
      expect(result?.totalXp).toBe(0)
      expect(result?.currentLevel).toBe(1)
      expect(result?.currentLevelMinXp).toBe(0)
      expect(result?.currentLevelMaxXp).toBeUndefined()
    })

    it('returns null when no XP summary row found', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getXPSummary(LENSER_ID)).toBeNull()
    })

    it('rethrows RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('xp error') })
      await expect(repo.getXPSummary(LENSER_ID)).rejects.toThrow('xp error')
    })
  })

  // ---------------------------------------------------------------------------
  // getHistory
  // ---------------------------------------------------------------------------
  describe('getHistory', () => {
    it('calls fn_xp_get_history with default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getHistory(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_history', { p_lenser_id: LENSER_ID, p_limit: 20 })
    })

    it('maps raw rows to XPEvent shape', async () => {
      const raw = [{ id: 'ev-1', action_key: 'battle_win', xp: 50, base_xp: 40, source: 'battles', created_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [event] = await repo.getHistory(LENSER_ID)
      expect(event.id).toBe('ev-1')
      expect(event.action).toBe('battle_win')
      expect(event.xp).toBe(50)
      expect(event.baseXp).toBe(40)
      expect(event.source).toBe('battles')
      expect(event.createdAt).toBe('2026-01-01T00:00:00Z')
    })

    it('supports custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getHistory(LENSER_ID, 50)
      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_history', { p_lenser_id: LENSER_ID, p_limit: 50 })
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getHistory(LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('history error') })
      await expect(repo.getHistory(LENSER_ID)).rejects.toThrow('history error')
    })
  })

  // ---------------------------------------------------------------------------
  // getApps
  // ---------------------------------------------------------------------------
  describe('getApps', () => {
    it('calls fn_xp_get_apps with no params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getApps()
      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_apps')
    })

    it('maps raw rows to XPApp shape', async () => {
      const raw = [{ id: 'app-1', slug: 'arena', name: 'Arena', difficulty: 2, is_active: true }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [app] = await repo.getApps()
      expect(app.id).toBe('app-1')
      expect(app.slug).toBe('arena')
      expect(app.isActive).toBe(true)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('apps error') })
      await expect(repo.getApps()).rejects.toThrow('apps error')
    })
  })

  // ---------------------------------------------------------------------------
  // getContributions
  // ---------------------------------------------------------------------------
  describe('getContributions', () => {
    it('calls fn_xp_get_contributions with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getContributions(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_xp_get_contributions', { p_lenser_id: LENSER_ID })
    })

    it('maps raw rows to XPContribution shape', async () => {
      const raw = [{
        id: 'con-1',
        lenser_id: LENSER_ID,
        context: 'oss',
        contribution_type: 'pr',
        external_ref: 'gh-123',
        title: 'Fix bug',
        verified_by: 'admin-1',
        xp_event_id: 'ev-1',
        created_at: '2026-01-01T00:00:00Z',
      }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [c] = await repo.getContributions(LENSER_ID)
      expect(c.lenserId).toBe(LENSER_ID)
      expect(c.contributionType).toBe('pr')
      expect(c.externalRef).toBe('gh-123')
      expect(c.verifiedBy).toBe('admin-1')
      expect(c.xpEventId).toBe('ev-1')
    })

    it('maps undefined for absent optional fields', async () => {
      const raw = [{ id: 'con-2', lenser_id: LENSER_ID, context: 'oss', contribution_type: 'pr', external_ref: null, title: null, verified_by: null, xp_event_id: null, created_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [c] = await repo.getContributions(LENSER_ID)
      expect(c.externalRef).toBeUndefined()
      expect(c.title).toBeUndefined()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('contributions error') })
      await expect(repo.getContributions(LENSER_ID)).rejects.toThrow('contributions error')
    })
  })

  // ---------------------------------------------------------------------------
  // getBadges
  // ---------------------------------------------------------------------------
  describe('getBadges', () => {
    it('calls fn_get_lenser_badges with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBadges(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lenser_badges', { p_lenser_id: LENSER_ID })
    })

    it('maps raw rows to LenserBadge shape', async () => {
      const raw = [{ id: 'badge-1', type: 'champion', label: 'Champion', description: 'Won 10 battles', icon: '🏆', awarded_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [badge] = await repo.getBadges(LENSER_ID)
      expect(badge.id).toBe('badge-1')
      expect(badge.awardedAt).toBe('2026-01-01T00:00:00Z')
      expect(badge.description).toBe('Won 10 battles')
      expect(badge.icon).toBe('🏆')
    })

    it('maps empty string description and icon to undefined', async () => {
      const raw = [{ id: 'badge-2', type: 'starter', label: 'Starter', description: '', icon: '', awarded_at: '2026-01-01T00:00:00Z' }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const [badge] = await repo.getBadges(LENSER_ID)
      expect(badge.description).toBeUndefined()
      expect(badge.icon).toBeUndefined()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('badges error') })
      await expect(repo.getBadges(LENSER_ID)).rejects.toThrow('badges error')
    })
  })

  // ---------------------------------------------------------------------------
  // getLeaderboard
  // ---------------------------------------------------------------------------
  describe('getLeaderboard', () => {
    const rawRow = {
      rank: 1,
      lenser_id: LENSER_ID,
      total_xp: 5000,
      current_level: 10,
      user: { display_name: 'Alice', handle: 'alice', avatar_url: null },
    }

    it('queries vw_xp_leaderboard_global for non-season scope', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      await repo.getLeaderboard('all_time', 'global')
      expect(mockFrom).toHaveBeenCalledWith('vw_xp_leaderboard_global')
    })

    it('queries vw_xp_leaderboard_season for season scope', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      await repo.getLeaderboard('season', 'season')
      expect(mockFrom).toHaveBeenCalledWith('vw_xp_leaderboard_season')
    })

    it('orders by rank ascending and applies range pagination', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      await repo.getLeaderboard('all_time', 'global', 50, 0)
      expect(mockOrder).toHaveBeenCalledWith('rank', { ascending: true })
      expect(mockRange).toHaveBeenCalledWith(0, 49)
    })

    it('maps raw rows to LeaderboardEntry shape', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      const { list } = await repo.getLeaderboard('all_time', 'global')
      expect(list[0].rank).toBe(1)
      expect(list[0].lenserId).toBe(LENSER_ID)
      expect(list[0].totalXp).toBe(5000)
      expect(list[0].displayName).toBe('Alice')
      expect(list[0].handle).toBe('alice')
    })

    it('sets userEntry when session user is in the list', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      mockCachedSession.mockReturnValue({ user: { id: LENSER_ID } })
      const { userEntry } = await repo.getLeaderboard('all_time', 'global')
      expect(userEntry?.lenserId).toBe(LENSER_ID)
    })

    it('sets userEntry null when user is not in the list', async () => {
      mockRange.mockResolvedValue({ data: [rawRow], error: null })
      mockCachedSession.mockReturnValue({ user: { id: 'other-user' } })
      const { userEntry } = await repo.getLeaderboard('all_time', 'global')
      expect(userEntry).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRange.mockResolvedValue({ data: null, error: new Error('leaderboard error') })
      await expect(repo.getLeaderboard('all_time', 'global')).rejects.toThrow('leaderboard error')
    })
  })

  // ---------------------------------------------------------------------------
  // getActiveSeason
  // ---------------------------------------------------------------------------
  describe('getActiveSeason', () => {
    it('calls fn_get_active_season with default forum app_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getActiveSeason()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_active_season', { p_app_id: XP_APP_IDS.forum })
    })

    it('uses provided appId', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getActiveSeason('custom-app-id')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_active_season', { p_app_id: 'custom-app-id' })
    })

    it('maps raw row to XPSeason shape', async () => {
      const raw = [{ id: 'season-1', slug: 's1', name: 'Season 1', starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-06-01T00:00:00Z', is_active: true }]
      mockRpc.mockResolvedValue({ data: raw, error: null })
      const result = await repo.getActiveSeason()
      expect(result).toEqual({
        id: 'season-1',
        slug: 's1',
        name: 'Season 1',
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-06-01T00:00:00Z',
        isActive: true,
      })
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getActiveSeason()).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('season error') })
      await expect(repo.getActiveSeason()).rejects.toThrow('season error')
    })
  })

  // ---------------------------------------------------------------------------
  // getSeasonLeaderboard
  // ---------------------------------------------------------------------------
  describe('getSeasonLeaderboard', () => {
    const rawEntry = {
      season_id: 'season-1',
      season_slug: 's1',
      app_id: XP_APP_IDS.forum,
      rank: 1,
      lenser_id: LENSER_ID,
      total_xp: 2000,
      user: { display_name: 'Alice', handle: 'alice', avatar_url: null },
    }

    it('calls fn_get_season_leaderboard with default app_id and limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSeasonLeaderboard()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_season_leaderboard', {
        p_app_id: XP_APP_IDS.forum,
        p_season_id: null,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('maps raw rows to SeasonLeaderboardEntry shape', async () => {
      mockRpc.mockResolvedValue({ data: [rawEntry], error: null })
      const { list } = await repo.getSeasonLeaderboard()
      expect(list[0].seasonId).toBe('season-1')
      expect(list[0].seasonSlug).toBe('s1')
      expect(list[0].rank).toBe(1)
      expect(list[0].lenserId).toBe(LENSER_ID)
      expect(list[0].user.displayName).toBe('Alice')
    })

    it('sets userEntry when session user is in list', async () => {
      mockRpc.mockResolvedValue({ data: [rawEntry], error: null })
      mockCachedSession.mockReturnValue({ user: { id: LENSER_ID } })
      const { userEntry } = await repo.getSeasonLeaderboard()
      expect(userEntry?.lenserId).toBe(LENSER_ID)
    })

    it('sets userEntry null when no session', async () => {
      mockRpc.mockResolvedValue({ data: [rawEntry], error: null })
      mockCachedSession.mockReturnValue(null)
      const { userEntry } = await repo.getSeasonLeaderboard()
      expect(userEntry).toBeNull()
    })

    it('passes seasonId and pagination params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSeasonLeaderboard(XP_APP_IDS.arena, 'season-2', 10, 5)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_season_leaderboard', {
        p_app_id: XP_APP_IDS.arena,
        p_season_id: 'season-2',
        p_limit: 10,
        p_offset: 5,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('season lb error') })
      await expect(repo.getSeasonLeaderboard()).rejects.toThrow('season lb error')
    })
  })
})
