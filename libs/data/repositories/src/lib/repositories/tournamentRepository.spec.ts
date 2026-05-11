import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseTournamentRepository } from './tournamentRepository'

const TOURNAMENT_ID = 'tournament-uuid-1'
const MATCH_ID = 'match-uuid-1'
const LENSER_ID = 'lenser-uuid-1'

const rawTournament = {
  id: TOURNAMENT_ID,
  title: 'Spring Cup',
  slug: 'spring-cup',
  creator_lenser_id: LENSER_ID,
  format: 'single_elimination',
  status: 'pending',
  max_contenders: 8,
  battle_type: 'ai_vs_ai',
  ai_judge_enabled: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseTournamentRepository', () => {
  let repo: SupabaseTournamentRepository

  beforeEach(() => {
    repo = new SupabaseTournamentRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getTournament
  // ---------------------------------------------------------------------------
  describe('getTournament', () => {
    it('calls fn_get_tournament_by_slug with p_slug', async () => {
      mockRpc.mockResolvedValue({ data: [rawTournament], error: null })
      const result = await repo.getTournament('spring-cup')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_tournament_by_slug', { p_slug: 'spring-cup' })
      expect(result).toEqual(rawTournament)
    })

    it('handles non-array data response', async () => {
      mockRpc.mockResolvedValue({ data: rawTournament, error: null })
      const result = await repo.getTournament('spring-cup')
      expect(result).toEqual(rawTournament)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTournament('spring-cup')).toBeNull()
    })

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getTournament('spring-cup')).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('tournament error') })
      await expect(repo.getTournament('spring-cup')).rejects.toThrow('tournament error')
    })
  })

  // ---------------------------------------------------------------------------
  // listTournaments
  // ---------------------------------------------------------------------------
  describe('listTournaments', () => {
    it('calls fn_list_tournaments with default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTournaments()
      expect(mockRpc).toHaveBeenCalledWith('fn_list_tournaments', { p_limit: 20 })
    })

    it('supports custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTournaments(50)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_tournaments', { p_limit: 50 })
    })

    it('returns tournament records', async () => {
      mockRpc.mockResolvedValue({ data: [rawTournament], error: null })
      const result = await repo.listTournaments()
      expect(result).toEqual([rawTournament])
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listTournaments()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.listTournaments()).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // getTournamentBracket
  // ---------------------------------------------------------------------------
  describe('getTournamentBracket', () => {
    const match = {
      round_number: 1,
      round_status: 'pending',
      match_id: MATCH_ID,
      battle_id: null,
      battle_slug: null,
      contender_a_lenser_id: LENSER_ID,
      contender_a_handle: 'alice',
      contender_a_avatar_url: null,
      contender_b_lenser_id: null,
      contender_b_handle: null,
      contender_b_avatar_url: null,
      winner_lenser_id: null,
      winner_handle: null,
      winner_avatar_url: null,
    }

    it('calls fn_get_tournament_bracket with p_tournament_id', async () => {
      mockRpc.mockResolvedValue({ data: [match], error: null })
      const result = await repo.getTournamentBracket(TOURNAMENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_tournament_bracket', { p_tournament_id: TOURNAMENT_ID })
      expect(result).toEqual([match])
    })

    it('returns empty array when no matches', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTournamentBracket(TOURNAMENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('bracket error') })
      await expect(repo.getTournamentBracket(TOURNAMENT_ID)).rejects.toThrow('bracket error')
    })
  })

  // ---------------------------------------------------------------------------
  // getTournamentContenders
  // ---------------------------------------------------------------------------
  describe('getTournamentContenders', () => {
    const contender = {
      id: 'contender-1',
      tournament_id: TOURNAMENT_ID,
      lenser_id: LENSER_ID,
      seed: 1,
      status: 'registered',
      created_at: '2026-01-01T00:00:00Z',
      handle: 'alice',
      display_name: 'Alice',
      avatar_url: null,
    }

    it('calls fn_get_tournament_contenders with p_tournament_id', async () => {
      mockRpc.mockResolvedValue({ data: [contender], error: null })
      const result = await repo.getTournamentContenders(TOURNAMENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_tournament_contenders', { p_tournament_id: TOURNAMENT_ID })
      expect(result).toEqual([contender])
    })

    it('returns empty array when no contenders', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTournamentContenders(TOURNAMENT_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('contenders error') })
      await expect(repo.getTournamentContenders(TOURNAMENT_ID)).rejects.toThrow('contenders error')
    })
  })

  // ---------------------------------------------------------------------------
  // createTournament
  // ---------------------------------------------------------------------------
  describe('createTournament', () => {
    it('calls fn_create_tournament with provided title and defaults', async () => {
      mockRpc.mockResolvedValue({ data: [rawTournament], error: null })
      const result = await repo.createTournament({ title: 'Spring Cup' })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_tournament', {
        p_title: 'Spring Cup',
        p_format: 'single_elimination',
        p_max_contenders: 8,
        p_battle_type: 'ai_vs_ai',
        p_ai_judge_enabled: false,
      })
      expect(result).toEqual(rawTournament)
    })

    it('uses provided values over defaults', async () => {
      mockRpc.mockResolvedValue({ data: [rawTournament], error: null })
      await repo.createTournament({
        title: 'Grand Prix',
        format: 'round_robin',
        maxContenders: 16,
        battleType: 'human_vs_ai',
        aiJudgeEnabled: true,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_tournament', {
        p_title: 'Grand Prix',
        p_format: 'round_robin',
        p_max_contenders: 16,
        p_battle_type: 'human_vs_ai',
        p_ai_judge_enabled: true,
      })
    })

    it('handles non-array data response', async () => {
      mockRpc.mockResolvedValue({ data: rawTournament, error: null })
      const result = await repo.createTournament({ title: 'Spring Cup' })
      expect(result).toEqual(rawTournament)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createTournament({ title: 'Spring Cup' })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // registerContender
  // ---------------------------------------------------------------------------
  describe('registerContender', () => {
    const contender = { id: 'contender-1', tournament_id: TOURNAMENT_ID, lenser_id: LENSER_ID, status: 'registered', seed: null, created_at: '2026-01-01T00:00:00Z' }

    it('calls fn_register_tournament_contender with p_tournament_id', async () => {
      mockRpc.mockResolvedValue({ data: [contender], error: null })
      const result = await repo.registerContender(TOURNAMENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_register_tournament_contender', { p_tournament_id: TOURNAMENT_ID })
      expect(result).toEqual(contender)
    })

    it('handles non-array data response', async () => {
      mockRpc.mockResolvedValue({ data: contender, error: null })
      expect(await repo.registerContender(TOURNAMENT_ID)).toEqual(contender)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('register error') })
      await expect(repo.registerContender(TOURNAMENT_ID)).rejects.toThrow('register error')
    })
  })

  // ---------------------------------------------------------------------------
  // startTournament
  // ---------------------------------------------------------------------------
  describe('startTournament', () => {
    it('calls fn_start_tournament with p_tournament_id', async () => {
      await repo.startTournament(TOURNAMENT_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_start_tournament', { p_tournament_id: TOURNAMENT_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('start error') })
      await expect(repo.startTournament(TOURNAMENT_ID)).rejects.toThrow('start error')
    })
  })

  // ---------------------------------------------------------------------------
  // advanceTournament
  // ---------------------------------------------------------------------------
  describe('advanceTournament', () => {
    it('calls fn_advance_tournament with p_match_id', async () => {
      await repo.advanceTournament(MATCH_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_advance_tournament', { p_match_id: MATCH_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('advance error') })
      await expect(repo.advanceTournament(MATCH_ID)).rejects.toThrow('advance error')
    })
  })
})
