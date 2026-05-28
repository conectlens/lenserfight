import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockGetUser } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  },
}))

import { SupabaseReactionRepository } from './reactionRepository'

const LENSER_ID = 'lenser-uuid-1'
const TARGET_ID = 'target-uuid-1'

const rawReaction = {
  id: 'reaction-1',
  lenser_id: LENSER_ID,
  entity_type: 'lens',
  entity_id: TARGET_ID,
  reaction: 'like',
  created_at: '2026-01-01T00:00:00Z',
}

const mappedReaction = {
  id: 'reaction-1',
  lenser_id: LENSER_ID,
  target_type: 'lens',
  target_id: TARGET_ID,
  reaction: 'like',
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseReactionRepository', () => {
  let repo: SupabaseReactionRepository

  beforeEach(() => {
    repo = new SupabaseReactionRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: LENSER_ID } } })
  })

  // ---------------------------------------------------------------------------
  // getReactionsFor
  // ---------------------------------------------------------------------------
  describe('getReactionsFor', () => {
    it('calls fn_get_entity_reactions_by_lenser with null p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawReaction], error: null })
      const result = await repo.getReactionsFor('lens', TARGET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_entity_reactions_by_lenser', {
        p_entity_type: 'lens',
        p_entity_id: TARGET_ID,
        p_lenser_id: null,
      })
      expect(result).toEqual([mappedReaction])
    })

    it('maps entity_type→target_type and entity_id→target_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawReaction], error: null })
      const [rec] = await repo.getReactionsFor('lens', TARGET_ID)
      expect(rec.target_type).toBe('lens')
      expect(rec.target_id).toBe(TARGET_ID)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getReactionsFor('lens', TARGET_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('reactions error') })
      await expect(repo.getReactionsFor('lens', TARGET_ID)).rejects.toThrow('reactions error')
    })
  })

  // ---------------------------------------------------------------------------
  // getUserReaction
  // ---------------------------------------------------------------------------
  describe('getUserReaction', () => {
    it('returns empty array when no authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await repo.getUserReaction('lens', TARGET_ID, LENSER_ID)).toEqual([])
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls fn_get_entity_reaction_status and returns reacted reactions', async () => {
      const status = [{ reaction: 'like', reacted: true }, { reaction: 'love', reacted: false }]
      mockRpc.mockResolvedValue({ data: status, error: null })
      const result = await repo.getUserReaction('lens', TARGET_ID, LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_entity_reaction_status', {
        p_entity_type: 'lens',
        p_entity_id: TARGET_ID,
      })
      expect(result).toHaveLength(1)
      expect(result[0].reaction).toBe('like')
      expect(result[0].lenser_id).toBe(LENSER_ID)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('status error') })
      await expect(repo.getUserReaction('lens', TARGET_ID, LENSER_ID)).rejects.toThrow('status error')
    })
  })

  // ---------------------------------------------------------------------------
  // toggleReaction — compound: rpc + getUserReaction
  // ---------------------------------------------------------------------------
  describe('toggleReaction', () => {
    it('calls fn_content_reactions_toggle and returns added + summary', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: { added: true, counts: { like: 5, love: 2, clap: 1, saved: 0, copy: 0 } }, error: null })
        .mockResolvedValueOnce({ data: [{ reaction: 'like', reacted: true }], error: null })

      const result = await repo.toggleReaction('lens', TARGET_ID, LENSER_ID, 'like')

      expect(mockRpc.mock.calls[0][0]).toBe('fn_content_reactions_toggle')
      expect(mockRpc.mock.calls[0][1]).toEqual({
        p_target_type: 'lens',
        p_target_id: TARGET_ID,
        p_reaction: 'like',
      })
      expect(result.added).toBe(true)
      expect(result.summary.counts.like).toBe(5)
      expect(result.summary.total).toBe(8) // like + love + clap
      expect(result.summary.userReactions).toContain('like')
    })

    it('rethrows errors from toggle RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('toggle error') })
      await expect(repo.toggleReaction('lens', TARGET_ID, LENSER_ID, 'like')).rejects.toThrow('toggle error')
    })
  })

  // ---------------------------------------------------------------------------
  // getBatchUserReactions
  // ---------------------------------------------------------------------------
  describe('getBatchUserReactions', () => {
    it('returns empty array immediately for empty targetIds', async () => {
      expect(await repo.getBatchUserReactions('lens', [], LENSER_ID)).toEqual([])
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns empty array when no authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await repo.getBatchUserReactions('lens', [TARGET_ID], LENSER_ID)).toEqual([])
    })

    it('calls fn_get_entity_reactions_by_lenser once per targetId with user.id', async () => {
      mockRpc.mockResolvedValue({ data: [rawReaction], error: null })
      const result = await repo.getBatchUserReactions('lens', [TARGET_ID, 'target-2'], LENSER_ID)
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(mockRpc.mock.calls[0][1].p_lenser_id).toBe(LENSER_ID)
      expect(result).toHaveLength(2)
    })

    it('silently skips targetIds that return errors', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: [rawReaction], error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('err') })
      const result = await repo.getBatchUserReactions('lens', [TARGET_ID, 'bad-id'], LENSER_ID)
      expect(result).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // countReactions
  // ---------------------------------------------------------------------------
  describe('countReactions', () => {
    it('calls fn_get_entity_reaction_counts with p_entity_type and p_entity_id', async () => {
      mockRpc.mockResolvedValue({ data: [{ reaction: 'like', count: '5' }], error: null })
      const result = await repo.countReactions('lens', TARGET_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_entity_reaction_counts', {
        p_entity_type: 'lens',
        p_entity_id: TARGET_ID,
      })
      expect(result[0].count).toBe(5)
      expect(result[0].reaction).toBe('like')
    })

    it('converts count to Number', async () => {
      mockRpc.mockResolvedValue({ data: [{ reaction: 'clap', count: '12' }], error: null })
      const [r] = await repo.countReactions('lens', TARGET_ID)
      expect(typeof r.count).toBe('number')
      expect(r.count).toBe(12)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.countReactions('lens', TARGET_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getLenserHistory
  // ---------------------------------------------------------------------------
  describe('getLenserHistory', () => {
    it('calls fn_get_lenser_profile_brief then fn_get_entity_reactions_by_lenser', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: [{ id: LENSER_ID }], error: null })
        .mockResolvedValueOnce({ data: [rawReaction], error: null })
      const result = await repo.getLenserHistory('alice')
      expect(mockRpc.mock.calls[0][0]).toBe('fn_get_lenser_profile_brief')
      expect(mockRpc.mock.calls[1][0]).toBe('fn_get_entity_reactions_by_lenser')
      expect(result.data).toHaveLength(1)
    })

    it('returns empty envelope when profile not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.getLenserHistory('unknown')
      expect(result.data).toEqual([])
    })

    it('paginates client-side with offset and limit', async () => {
      const reactions = Array.from({ length: 5 }, (_, i) => ({ ...rawReaction, id: `r-${i}` }))
      mockRpc
        .mockResolvedValueOnce({ data: [{ id: LENSER_ID }], error: null })
        .mockResolvedValueOnce({ data: reactions, error: null })
      const result = await repo.getLenserHistory('alice', 2, 2)
      expect(result.data).toHaveLength(2)
    })
  })
})
