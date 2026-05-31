import { describe, expect, it, vi, beforeEach } from 'vitest'

// Hoist mock repo before module initialization
const { mockRepo } = vi.hoisted(() => ({
  mockRepo: {
    getBattleBySlug: vi.fn(),
    getBattlesFeed: vi.fn(),
    getContenders: vi.fn(),
    getSubmissions: vi.fn(),
    getVoteAggregates: vi.fn(),
    getScorecards: vi.fn(),
    getRubricCriteria: vi.fn(),
    getMyVote: vi.fn(),
    submitVote: vi.fn(),
    getBattlesFeedItems: vi.fn(),
    createBattle: vi.fn(),
    updateBattle: vi.fn(),
    getLatestDraftBattleByWorkflowId: vi.fn(),
    getAIHandicapPolicy: vi.fn(),
    checkVoterEligibility: vi.fn(),
    publishBattle: vi.fn(),
    getBattleComments: vi.fn(),
    postComment: vi.fn(),
    getGlobalMessages: vi.fn(),
    postGlobalMessage: vi.fn(),
    removeContender: vi.fn(),
    inviteContender: vi.fn(),
    submitContenderEntry: vi.fn(),
    linkForumThread: vi.fn(),
    assignLensToContender: vi.fn(),
    getLensAssignment: vi.fn(),
    openVoting: vi.fn(),
    closeVoting: vi.fn(),
    finalizeBattle: vi.fn(),
    getAiJudgeVerdicts: vi.fn(),
    getDLQEntries: vi.fn(),
    retryDLQEntry: vi.fn(),
    getPublicExecutionJobs: vi.fn(),
  },
}))

vi.mock('../repositories/battlesRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../repositories/battlesRepository')>()
  return {
    ...original,
    // Must be a regular function so `new` works — arrow functions are not constructors.
    // Returning an object from a constructor causes `new` to return that object.
    SupabaseBattlesRepository: function () { return mockRepo },
  }
})

import { battlesService } from './battlesService'
import type { VoteAggregateRecord, ContenderRecord, ScorecardRecord } from '../repositories/battlesRepository'

const BATTLE_ID = 'battle-uuid-1'
const CONTENDER_A_ID = 'contender-a'
const CONTENDER_B_ID = 'contender-b'
const CRITERION_ID = 'criterion-1'

describe('battlesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Delegation checks (sample — services must not swallow repo errors)
  // ---------------------------------------------------------------------------
  describe('delegation', () => {
    it('getBattleBySlug delegates to battlesRepo', async () => {
      const battle = { id: BATTLE_ID, slug: 'my-battle' }
      mockRepo.getBattleBySlug.mockResolvedValue(battle)
      const result = await battlesService.getBattleBySlug('my-battle')
      expect(mockRepo.getBattleBySlug).toHaveBeenCalledWith('my-battle')
      expect(result).toEqual(battle)
    })

    it('propagates errors from battlesRepo without swallowing', async () => {
      mockRepo.getBattleBySlug.mockRejectedValue(new Error('repo error'))
      await expect(battlesService.getBattleBySlug('slug')).rejects.toThrow('repo error')
    })

    it('submitVote resolves to undefined (void return)', async () => {
      mockRepo.submitVote.mockResolvedValue({ data: null })
      const result = await battlesService.submitVote({ battle_id: BATTLE_ID, vote_value: 'A' } as any)
      expect(result).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // finalize lifecycle — scoring → closed (+ closed → published) delegation
  // ---------------------------------------------------------------------------
  describe('finalize lifecycle', () => {
    it('finalizeBattle delegates to battlesRepo.finalizeBattle(battleId)', async () => {
      mockRepo.finalizeBattle.mockResolvedValue(undefined)
      await battlesService.finalizeBattle(BATTLE_ID)
      expect(mockRepo.finalizeBattle).toHaveBeenCalledTimes(1)
      expect(mockRepo.finalizeBattle).toHaveBeenCalledWith(BATTLE_ID)
    })

    it('propagates repo errors from finalizeBattle without swallowing', async () => {
      mockRepo.finalizeBattle.mockRejectedValue(new Error('finalize error'))
      await expect(battlesService.finalizeBattle(BATTLE_ID)).rejects.toThrow('finalize error')
    })

    it('publishBattle delegates to battlesRepo.publishBattle(battleId)', async () => {
      const published = { id: BATTLE_ID, status: 'published' }
      mockRepo.publishBattle.mockResolvedValue(published)
      const result = await battlesService.publishBattle(BATTLE_ID)
      expect(mockRepo.publishBattle).toHaveBeenCalledTimes(1)
      expect(mockRepo.publishBattle).toHaveBeenCalledWith(BATTLE_ID)
      expect(result).toEqual(published)
    })
  })

  // ---------------------------------------------------------------------------
  // getContendersAndSubmissions — concurrent fetch
  // ---------------------------------------------------------------------------
  describe('getContendersAndSubmissions', () => {
    it('fetches contenders and submissions concurrently', async () => {
      const contenders = [{ id: CONTENDER_A_ID, slot: 'A' }]
      const submissions = [{ id: 'sub-1', contender_id: CONTENDER_A_ID }]
      mockRepo.getContenders.mockResolvedValue(contenders)
      mockRepo.getSubmissions.mockResolvedValue(submissions)

      const result = await battlesService.getContendersAndSubmissions(BATTLE_ID)

      expect(mockRepo.getContenders).toHaveBeenCalledWith(BATTLE_ID)
      expect(mockRepo.getSubmissions).toHaveBeenCalledWith(BATTLE_ID)
      expect(result).toEqual({ contenders, submissions })
    })

    it('propagates rejection from either concurrent call', async () => {
      mockRepo.getContenders.mockResolvedValue([])
      mockRepo.getSubmissions.mockRejectedValue(new Error('submissions error'))
      await expect(battlesService.getContendersAndSubmissions(BATTLE_ID)).rejects.toThrow('submissions error')
    })
  })

  // ---------------------------------------------------------------------------
  // getScorecardData — deduplicates criterion IDs before fetching
  // ---------------------------------------------------------------------------
  describe('getScorecardData', () => {
    it('passes deduplicated criterion IDs to getRubricCriteria', async () => {
      const scorecards: Partial<ScorecardRecord>[] = [
        { rubric_criterion_id: CRITERION_ID },
        { rubric_criterion_id: CRITERION_ID },
        { rubric_criterion_id: 'criterion-2' },
      ]
      mockRepo.getScorecards.mockResolvedValue(scorecards)
      mockRepo.getRubricCriteria.mockResolvedValue([])

      await battlesService.getScorecardData(BATTLE_ID)

      const criterionIdsArg = mockRepo.getRubricCriteria.mock.calls[0][0] as string[]
      expect(criterionIdsArg).toHaveLength(2)
      expect(criterionIdsArg).toContain(CRITERION_ID)
      expect(criterionIdsArg).toContain('criterion-2')
    })

    it('returns both scorecards and criteria', async () => {
      const scorecards = [{ rubric_criterion_id: CRITERION_ID }]
      const criteria = [{ id: CRITERION_ID, label: 'Clarity' }]
      mockRepo.getScorecards.mockResolvedValue(scorecards)
      mockRepo.getRubricCriteria.mockResolvedValue(criteria)

      const result = await battlesService.getScorecardData(BATTLE_ID)
      expect(result).toEqual({ scorecards, criteria })
    })

    it('calls getRubricCriteria with empty array when no scorecards', async () => {
      mockRepo.getScorecards.mockResolvedValue([])
      mockRepo.getRubricCriteria.mockResolvedValue([])
      await battlesService.getScorecardData(BATTLE_ID)
      expect(mockRepo.getRubricCriteria).toHaveBeenCalledWith([])
    })
  })

  // ---------------------------------------------------------------------------
  // getAiJudgeVerdictsByContender — groups by contender_id
  // ---------------------------------------------------------------------------
  describe('getAiJudgeVerdictsByContender', () => {
    it('groups verdicts by contender_id', async () => {
      const verdicts = [
        { contender_id: CONTENDER_A_ID, score: 8 },
        { contender_id: CONTENDER_B_ID, score: 7 },
        { contender_id: CONTENDER_A_ID, score: 9 },
      ]
      mockRepo.getAiJudgeVerdicts.mockResolvedValue(verdicts)

      const result = await battlesService.getAiJudgeVerdictsByContender(BATTLE_ID)

      expect(result[CONTENDER_A_ID]).toHaveLength(2)
      expect(result[CONTENDER_B_ID]).toHaveLength(1)
    })

    it('returns empty object when no verdicts', async () => {
      mockRepo.getAiJudgeVerdicts.mockResolvedValue([])
      const result = await battlesService.getAiJudgeVerdictsByContender(BATTLE_ID)
      expect(result).toEqual({})
    })
  })

  // ---------------------------------------------------------------------------
  // deriveWinner — pure business logic
  // ---------------------------------------------------------------------------
  describe('deriveWinner', () => {
    const contenderA: Partial<ContenderRecord> = { id: CONTENDER_A_ID, slot: 'A', display_name: 'Alice' }
    const contenderB: Partial<ContenderRecord> = { id: CONTENDER_B_ID, slot: 'B', display_name: 'Bob' }

    const aggA = (rank: number, votes: number): Partial<VoteAggregateRecord> => ({
      contender_id: CONTENDER_A_ID,
      rank_position: rank,
      raw_vote_count: votes,
    })
    const aggB = (rank: number, votes: number): Partial<VoteAggregateRecord> => ({
      contender_id: CONTENDER_B_ID,
      rank_position: rank,
      raw_vote_count: votes,
    })

    it('returns slot A when A has rank_position=1 and B does not', () => {
      const result = battlesService.deriveWinner(
        [aggA(1, 10), aggB(2, 5)] as VoteAggregateRecord[],
        [contenderA, contenderB] as ContenderRecord[]
      )
      expect(result.slot).toBe('A')
      expect(result.name).toBe('Alice')
    })

    it('returns slot B when B has rank_position=1 and A does not', () => {
      const result = battlesService.deriveWinner(
        [aggA(2, 5), aggB(1, 10)] as VoteAggregateRecord[],
        [contenderA, contenderB] as ContenderRecord[]
      )
      expect(result.slot).toBe('B')
      expect(result.name).toBe('Bob')
    })

    it('returns draw when both have equal votes > 0 and neither is rank 1 exclusively', () => {
      const result = battlesService.deriveWinner(
        [aggA(1, 10), aggB(1, 10)] as VoteAggregateRecord[],
        [contenderA, contenderB] as ContenderRecord[]
      )
      expect(result.slot).toBe('draw')
      expect(result.name).toBeUndefined()
    })

    it('returns undefined slot when aggregates are missing', () => {
      const result = battlesService.deriveWinner([], [contenderA, contenderB] as ContenderRecord[])
      expect(result.slot).toBeUndefined()
      expect(result.name).toBeUndefined()
    })

    it('returns undefined slot when contenders list is empty', () => {
      const result = battlesService.deriveWinner([aggA(1, 10)] as VoteAggregateRecord[], [])
      expect(result.slot).toBeUndefined()
    })

    it('returns undefined slot when both have 0 votes (no draw)', () => {
      const result = battlesService.deriveWinner(
        [aggA(1, 0), aggB(1, 0)] as VoteAggregateRecord[],
        [contenderA, contenderB] as ContenderRecord[]
      )
      // Both rank_position === 1 but voteCountA === voteCountB === 0 — no draw
      expect(result.slot).toBeUndefined()
    })

    it('returns undefined slot when no slot-A contender exists', () => {
      const result = battlesService.deriveWinner(
        [aggA(1, 5), aggB(2, 3)] as VoteAggregateRecord[],
        [contenderB] as ContenderRecord[]
      )
      expect(result.slot).toBeUndefined()
    })
  })
})
