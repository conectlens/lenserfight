import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseReputationRepository } from './reputationRepository'

const LENSER_ID = 'lenser-uuid-1'

describe('SupabaseReputationRepository', () => {
  let repo: SupabaseReputationRepository

  beforeEach(() => {
    repo = new SupabaseReputationRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // handleError (via getLenserScores)
  // ---------------------------------------------------------------------------
  describe('handleError (via getLenserScores)', () => {
    it('throws "Reputation record not found." on PGRST116', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      await expect(repo.getLenserScores(LENSER_ID)).rejects.toThrow('Reputation record not found.')
    })

    it('rethrows generic errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('db error') })
      await expect(repo.getLenserScores(LENSER_ID)).rejects.toThrow('db error')
    })
  })

  // ---------------------------------------------------------------------------
  // getLenserScores
  // ---------------------------------------------------------------------------
  describe('getLenserScores', () => {
    it('calls fn_get_lenser_scores with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getLenserScores(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lenser_scores', { p_lenser_id: LENSER_ID })
    })

    it('returns scores from RPC', async () => {
      const score = { lenser_id: LENSER_ID, score_type: 'elo', score: 1200 }
      mockRpc.mockResolvedValue({ data: [score], error: null })
      const result = await repo.getLenserScores(LENSER_ID)
      expect(result).toHaveLength(1)
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLenserScores(LENSER_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getContenderRating
  // ---------------------------------------------------------------------------
  describe('getContenderRating', () => {
    it('calls fn_get_contender_rating with lenserId and null category by default', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getContenderRating(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_contender_rating', {
        p_lenser_id: LENSER_ID,
        p_category: null,
      })
    })

    it('passes category when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getContenderRating(LENSER_ID, 'coding')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_contender_rating', expect.objectContaining({
        p_category: 'coding',
      }))
    })

    it('returns first item from data array', async () => {
      const rating = { lenser_id: LENSER_ID, elo: 1200, battles: 5 }
      mockRpc.mockResolvedValue({ data: [rating], error: null })
      const result = await repo.getContenderRating(LENSER_ID)
      expect(result).toEqual(rating)
    })

    it('returns null when data is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getContenderRating(LENSER_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getJudgeCalibration
  // ---------------------------------------------------------------------------
  describe('getJudgeCalibration', () => {
    it('calls fn_get_judge_calibration with p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getJudgeCalibration(LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_judge_calibration', { p_lenser_id: LENSER_ID })
    })

    it('returns null when no calibration data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getJudgeCalibration(LENSER_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getEloLeaderboard
  // ---------------------------------------------------------------------------
  describe('getEloLeaderboard', () => {
    it('calls fn_get_leaderboard with p_order_by="elo" and default limit/offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getEloLeaderboard()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_leaderboard', {
        p_order_by: 'elo',
        p_limit: 50,
        p_offset: 0,
      })
    })

    it('supports custom limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getEloLeaderboard(10, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_leaderboard', expect.objectContaining({
        p_limit: 10,
        p_offset: 20,
      }))
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getEloLeaderboard()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('leaderboard error') })
      await expect(repo.getEloLeaderboard()).rejects.toThrow('leaderboard error')
    })
  })
})
