import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseLenserboardRepository } from './lenserboardRepository'

const LENSER_ID = 'lenser-uuid-1'

describe('SupabaseLenserboardRepository', () => {
  let repo: SupabaseLenserboardRepository

  beforeEach(() => {
    repo = new SupabaseLenserboardRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getGlobalLenserboard
  // ---------------------------------------------------------------------------
  describe('getGlobalLenserboard', () => {
    it('calls fn_get_global_lenserboard with default limit 50', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGlobalLenserboard()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_global_lenserboard', { p_limit: 50 })
    })

    it('supports custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGlobalLenserboard(10)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_global_lenserboard', { p_limit: 10 })
    })

    it('returns entries from RPC', async () => {
      const entry = { lenser_id: LENSER_ID, handle: 'alice', display_name: 'Alice', avatar_url: null, total_wins: 5, total_battles: 10, win_rate: 0.5, total_votes_received: 100 }
      mockRpc.mockResolvedValue({ data: [entry], error: null })
      const result = await repo.getGlobalLenserboard()
      expect(result).toHaveLength(1)
      expect(result[0].handle).toBe('alice')
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getGlobalLenserboard()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('board error') })
      await expect(repo.getGlobalLenserboard()).rejects.toThrow('board error')
    })
  })

  // ---------------------------------------------------------------------------
  // getContenderRatings
  // ---------------------------------------------------------------------------
  describe('getContenderRatings', () => {
    it('calls fn_get_contender_ratings with lenserId and default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getContenderRatings(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_contender_ratings', {
        p_lenser_id: LENSER_ID,
        p_limit: 20,
      })
    })

    it('returns ratings from RPC', async () => {
      const rating = { contender_id: 'c-1', battle_id: 'b-1', battle_slug: 'battle', battle_title: 'Battle', slot: 'A', winner_slot: 'A', total_vote_count: 10, vote_velocity: 0.5, published_at: '2026-01-01' }
      mockRpc.mockResolvedValue({ data: [rating], error: null })
      const result = await repo.getContenderRatings(LENSER_ID)
      expect(result[0].slot).toBe('A')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('ratings error') })
      await expect(repo.getContenderRatings(LENSER_ID)).rejects.toThrow('ratings error')
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingBattles
  // ---------------------------------------------------------------------------
  describe('getTrendingBattles', () => {
    it('calls fn_get_trending_battles with default limit 20 and null cursor', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingBattles()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_trending_battles', {
        p_limit: 20,
        p_cursor: null,
      })
    })

    it('passes cursor when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingBattles(10, 5)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_trending_battles', { p_limit: 10, p_cursor: 5 })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('trending error') })
      await expect(repo.getTrendingBattles()).rejects.toThrow('trending error')
    })
  })
})
