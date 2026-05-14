import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseBattlesRepository } from './battlesRepository'

const BATTLE_ID = 'battle-uuid-1'
const LENSER_ID = 'lenser-uuid-1'

const fakeBattle = {
  id: BATTLE_ID,
  slug: 'test-battle',
  title: 'Test Battle',
  task_prompt: 'Write something',
  status: 'open',
  total_vote_count: 0,
  published_at: null,
  voting_opens_at: null,
  voting_closes_at: null,
  battle_type: 'ai_vs_ai',
  voter_eligibility: 'open',
  handicap_config: {},
  creator_lenser_id: LENSER_ID,
  forum_thread_id: null,
  workflow_id: null,
  lens_id: null,
  execution_starts_at: null,
  auto_publish: false,
  voting_duration_hours: 24,
  vote_velocity: 0,
  og_image_url: null,
}

describe('SupabaseBattlesRepository', () => {
  let repo: SupabaseBattlesRepository

  beforeEach(() => {
    repo = new SupabaseBattlesRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getBattleBySlug
  // ---------------------------------------------------------------------------
  describe('getBattleBySlug', () => {
    it('calls fn_get_battle_by_slug with p_slug', async () => {
      mockRpc.mockResolvedValue({ data: [fakeBattle], error: null })
      const result = await repo.getBattleBySlug('test-battle')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_by_slug', { p_slug: 'test-battle' })
      expect(result).toEqual(fakeBattle)
    })

    it('unwraps scalar data (non-array response)', async () => {
      mockRpc.mockResolvedValue({ data: fakeBattle, error: null })
      const result = await repo.getBattleBySlug('test-battle')
      expect(result).toEqual(fakeBattle)
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await repo.getBattleBySlug('missing')
      expect(result).toBeNull()
    })

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const result = await repo.getBattleBySlug('missing')
      expect(result).toBeNull()
    })

    it('maps PGRST116 error to "Battle not found."', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'row not found' } })
      await expect(repo.getBattleBySlug('missing')).rejects.toThrow('Battle not found.')
    })

    it('rethrows generic Supabase errors', async () => {
      const err = new Error('DB failure')
      mockRpc.mockResolvedValue({ data: null, error: err })
      await expect(repo.getBattleBySlug('x')).rejects.toThrow('DB failure')
    })
  })

  // ---------------------------------------------------------------------------
  // getBattlesFeed
  // ---------------------------------------------------------------------------
  describe('getBattlesFeed', () => {
    it('calls fn_get_battles_feed with defaults', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeed()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', {
        p_status: null,
        p_battle_type: null,
        p_limit: 20,
        p_cursor: null,
      })
    })

    it('passes filter as p_status, "all" becomes null', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeed('all', 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', expect.objectContaining({ p_status: null }))
    })

    it('passes non-all filter as p_status', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeed('voting', 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', expect.objectContaining({ p_status: 'voting' }))
    })

    it('passes battleType and cursor', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeed(undefined, 5, 'ai_vs_ai', 'cursor-123')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', expect.objectContaining({
        p_battle_type: 'ai_vs_ai',
        p_limit: 5,
        p_cursor: 'cursor-123',
      }))
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getBattlesFeed()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('feed error') })
      await expect(repo.getBattlesFeed()).rejects.toThrow('feed error')
    })
  })

  // ---------------------------------------------------------------------------
  // getBattlesFeedItems
  // ---------------------------------------------------------------------------
  describe('getBattlesFeedItems', () => {
    it('calls fn_get_battles_feed with default options', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeedItems()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', {
        p_status: null,
        p_battle_type: null,
        p_limit: 20,
        p_cursor: null,
      })
    })

    it('passes provided options', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeedItems({ status: 'voting', battleType: 'ai_vs_ai', limit: 10, cursor: 'cur' })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', {
        p_status: 'voting',
        p_battle_type: 'ai_vs_ai',
        p_limit: 10,
        p_cursor: 'cur',
      })
    })

    it('enforces default limit of 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattlesFeedItems({})
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battles_feed', expect.objectContaining({ p_limit: 20 }))
    })

    it('returns empty array on null data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getBattlesFeedItems()).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getContenders
  // ---------------------------------------------------------------------------
  describe('getContenders', () => {
    it('calls fn_get_battle_contenders with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getContenders(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_contenders', { p_battle_id: BATTLE_ID })
    })

    it('returns contenders array', async () => {
      const contenders = [{ id: 'c1', battle_id: BATTLE_ID, slot: 'A' }]
      mockRpc.mockResolvedValue({ data: contenders, error: null })
      expect(await repo.getContenders(BATTLE_ID)).toEqual(contenders)
    })

    it('returns empty array when no contenders', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getContenders(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('contenders error') })
      await expect(repo.getContenders(BATTLE_ID)).rejects.toThrow('contenders error')
    })
  })

  // ---------------------------------------------------------------------------
  // getSubmissions
  // ---------------------------------------------------------------------------
  describe('getSubmissions', () => {
    it('calls fn_get_battle_submissions with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSubmissions(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_submissions', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no submissions', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getSubmissions(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('submissions error') })
      await expect(repo.getSubmissions(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getVoteAggregates
  // ---------------------------------------------------------------------------
  describe('getVoteAggregates', () => {
    it('calls fn_get_vote_aggregates with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getVoteAggregates(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_vote_aggregates', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no aggregates', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getVoteAggregates(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('agg error') })
      await expect(repo.getVoteAggregates(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getScorecards
  // ---------------------------------------------------------------------------
  describe('getScorecards', () => {
    it('calls fn_get_battle_scorecards with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getScorecards(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_scorecards', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no scorecards', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getScorecards(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('sc error') })
      await expect(repo.getScorecards(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getRubricCriteria
  // ---------------------------------------------------------------------------
  describe('getRubricCriteria', () => {
    it('returns empty array immediately without calling Supabase when given empty array', async () => {
      const result = await repo.getRubricCriteria([])
      expect(mockRpc).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('calls fn_get_rubric_criteria with p_criterion_ids', async () => {
      const ids = ['id-1', 'id-2']
      mockRpc.mockResolvedValue({ data: [{ id: 'id-1' }, { id: 'id-2' }], error: null })
      await repo.getRubricCriteria(ids)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_rubric_criteria', { p_criterion_ids: ids })
    })

    it('returns criteria list', async () => {
      const criteria = [{ id: 'c1', title: 'Clarity', weight: 1 }]
      mockRpc.mockResolvedValue({ data: criteria, error: null })
      expect(await repo.getRubricCriteria(['c1'])).toEqual(criteria)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('criteria error') })
      await expect(repo.getRubricCriteria(['c1'])).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getMyVote
  // ---------------------------------------------------------------------------
  describe('getMyVote', () => {
    it('calls fn_get_my_vote with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [{ vote_value: 'contender_a' }], error: null })
      const result = await repo.getMyVote(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_my_vote', { p_battle_id: BATTLE_ID })
      expect(result).toEqual({ vote_value: 'contender_a' })
    })

    it('returns null when user has not voted', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getMyVote(BATTLE_ID)).toBeNull()
    })

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getMyVote(BATTLE_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('vote error') })
      await expect(repo.getMyVote(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // submitVote
  // ---------------------------------------------------------------------------
  describe('submitVote', () => {
    const voteResult = { vote_id: 'vote-1', status: 'accepted', battle_id: BATTLE_ID }

    it('calls fn_submit_vote with all parameters', async () => {
      mockRpc.mockResolvedValue({ data: voteResult, error: null })
      const result = await repo.submitVote({
        battle_id: BATTLE_ID,
        voter_lenser_id: LENSER_ID,
        vote_value: 'contender_a',
        voted_contender_id: 'c-1',
        rationale: 'great',
        is_draw: false,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_submit_vote', {
        p_battle_id: BATTLE_ID,
        p_voted_contender_id: 'c-1',
        p_vote_value: 'contender_a',
        p_is_draw: false,
        p_rationale: 'great',
      })
      expect(result).toEqual(voteResult)
    })

    it('derives is_draw from vote_value when is_draw not provided', async () => {
      mockRpc.mockResolvedValue({ data: voteResult, error: null })
      await repo.submitVote({ battle_id: BATTLE_ID, voter_lenser_id: LENSER_ID, vote_value: 'draw', voted_contender_id: null })
      expect(mockRpc).toHaveBeenCalledWith('fn_submit_vote', expect.objectContaining({ p_is_draw: true }))
    })

    it('defaults rationale to null when not provided', async () => {
      mockRpc.mockResolvedValue({ data: voteResult, error: null })
      await repo.submitVote({ battle_id: BATTLE_ID, voter_lenser_id: LENSER_ID, vote_value: 'contender_a', voted_contender_id: 'c-1' })
      expect(mockRpc).toHaveBeenCalledWith('fn_submit_vote', expect.objectContaining({ p_rationale: null }))
    })

    it('rethrows errors (including rate-limit errors)', async () => {
      const err = { code: 'P0429', message: 'rate limited' }
      mockRpc.mockResolvedValue({ data: null, error: err })
      await expect(repo.submitVote({ battle_id: BATTLE_ID, voter_lenser_id: LENSER_ID, vote_value: 'contender_a', voted_contender_id: 'c-1' })).rejects.toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // createBattle
  // ---------------------------------------------------------------------------
  describe('createBattle', () => {
    // fn_battles_create returns a UUID; createBattle then calls fn_update_battle
    // to apply remaining settings and get back the full BattleRecord.
    const setupCreateMocks = () => {
      mockRpc
        .mockResolvedValueOnce({ data: BATTLE_ID, error: null })    // fn_battles_create → UUID
        .mockResolvedValueOnce({ data: [fakeBattle], error: null })  // fn_update_battle → record
    }

    it('calls fn_battles_create with title, slug, task_prompt', async () => {
      setupCreateMocks()
      await repo.createBattle({ title: 'My Battle', task_prompt: 'Do something', battle_type: 'ai_vs_ai', voter_eligibility: 'open' })
      expect(mockRpc).toHaveBeenCalledWith('fn_battles_create', expect.objectContaining({
        p_title: 'My Battle',
        p_task_prompt: 'Do something',
        p_rubric_id: null,
      }))
    })

    it('generates a slug from the title', async () => {
      setupCreateMocks()
      await repo.createBattle({ title: 'My Battle!', task_prompt: 'x', battle_type: 'ai_vs_ai', voter_eligibility: 'open' })
      const call = mockRpc.mock.calls[0]
      expect(call[1].p_slug).toMatch(/^my-battle-[a-z0-9]{6}$/)
    })

    it('returns the created battle record', async () => {
      setupCreateMocks()
      const result = await repo.createBattle({ title: 'T', task_prompt: 'P', battle_type: 'ai_vs_ai', voter_eligibility: 'open' })
      expect(result).toEqual(fakeBattle)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createBattle({ title: 'T', task_prompt: 'P', battle_type: 'ai_vs_ai', voter_eligibility: 'open' })).rejects.toThrow('create error')
    })
  })

  // ---------------------------------------------------------------------------
  // updateBattle
  // ---------------------------------------------------------------------------
  describe('updateBattle', () => {
    it('calls fn_update_battle with all nullable fields', async () => {
      mockRpc.mockResolvedValue({ data: [fakeBattle], error: null })
      await repo.updateBattle(BATTLE_ID, { title: 'New Title', task_prompt: 'New prompt' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_battle', {
        p_battle_id: BATTLE_ID,
        p_title: 'New Title',
        p_task_prompt: 'New prompt',
        p_battle_type: null,
        p_voter_eligibility: null,
        p_handicap_config: null,
        p_workflow_id: null,
        p_lens_id: null,
      })
    })

    it('passes partial input with nulls for missing fields', async () => {
      mockRpc.mockResolvedValue({ data: [fakeBattle], error: null })
      await repo.updateBattle(BATTLE_ID, { battle_type: 'ai_vs_ai' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_battle', expect.objectContaining({
        p_title: null,
        p_battle_type: 'ai_vs_ai',
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('update error') })
      await expect(repo.updateBattle(BATTLE_ID, {})).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getLatestDraftBattleByWorkflowId
  // ---------------------------------------------------------------------------
  describe('getLatestDraftBattleByWorkflowId', () => {
    it('calls fn_get_latest_draft_battle_by_workflow with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeBattle], error: null })
      const result = await repo.getLatestDraftBattleByWorkflowId('wf-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_latest_draft_battle_by_workflow', { p_workflow_id: 'wf-1' })
      expect(result).toEqual(fakeBattle)
    })

    it('returns null when no draft exists', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLatestDraftBattleByWorkflowId('wf-1')).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('draft error') })
      await expect(repo.getLatestDraftBattleByWorkflowId('wf-1')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getAIHandicapPolicy
  // ---------------------------------------------------------------------------
  describe('getAIHandicapPolicy', () => {
    it('calls fn_get_ai_handicap_policy with p_battle_id', async () => {
      const policy = { id: 'p-1', battle_id: BATTLE_ID, injected_delay_ms: 100 }
      mockRpc.mockResolvedValue({ data: [policy], error: null })
      const result = await repo.getAIHandicapPolicy(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_ai_handicap_policy', { p_battle_id: BATTLE_ID })
      expect(result).toEqual(policy)
    })

    it('returns null when no policy exists', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAIHandicapPolicy(BATTLE_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('policy error') })
      await expect(repo.getAIHandicapPolicy(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // checkVoterEligibility
  // ---------------------------------------------------------------------------
  describe('checkVoterEligibility', () => {
    it('calls fn_check_voter_eligibility with p_battle_id and p_lenser_id', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await repo.checkVoterEligibility(BATTLE_ID, LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_check_voter_eligibility', {
        p_battle_id: BATTLE_ID,
        p_lenser_id: LENSER_ID,
      })
    })

    it('returns true when RPC returns true', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      expect(await repo.checkVoterEligibility(BATTLE_ID, LENSER_ID)).toBe(true)
    })

    it('returns false when RPC returns false', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      expect(await repo.checkVoterEligibility(BATTLE_ID, LENSER_ID)).toBe(false)
    })

    it('returns false (not throws) on Supabase error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('auth error') })
      expect(await repo.checkVoterEligibility(BATTLE_ID, LENSER_ID)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // publishBattle
  // ---------------------------------------------------------------------------
  describe('publishBattle', () => {
    it('calls fn_publish_battle then fn_get_battle and returns updated record', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })   // fn_publish_battle
        .mockResolvedValueOnce({ data: [fakeBattle], error: null }) // fn_get_battle
      const result = await repo.publishBattle(BATTLE_ID)
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_publish_battle', { p_battle_id: BATTLE_ID })
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'fn_get_battle', { p_battle_id: BATTLE_ID })
      expect(result).toEqual(fakeBattle)
    })

    it('throws when fn_publish_battle fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('publish error') })
      await expect(repo.publishBattle(BATTLE_ID)).rejects.toThrow('publish error')
    })

    it('throws when fn_get_battle fails after publish', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('fetch error') })
      await expect(repo.publishBattle(BATTLE_ID)).rejects.toThrow('fetch error')
    })
  })

  // ---------------------------------------------------------------------------
  // getBattleComments
  // ---------------------------------------------------------------------------
  describe('getBattleComments', () => {
    const comments = [
      { id: 'c2', created_at: '2026-01-02T00:00:00Z', body: 'second' },
      { id: 'c1', created_at: '2026-01-01T00:00:00Z', body: 'first' },
    ]

    it('calls fn_get_battle_comments with default limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattleComments(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_comments', {
        p_battle_id: BATTLE_ID,
        p_limit: 50,
        p_before_ts: null,
        p_before_id: null,
      })
    })

    it('reverses RPC result to chronological order', async () => {
      mockRpc.mockResolvedValue({ data: comments, error: null })
      const result = await repo.getBattleComments(BATTLE_ID)
      expect(result[0].id).toBe('c1')
      expect(result[1].id).toBe('c2')
    })

    it('passes cursor values', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattleComments(BATTLE_ID, 20, { before_ts: '2026-01-01T00:00:00Z', before_id: 'msg-1' })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_comments', expect.objectContaining({
        p_before_ts: '2026-01-01T00:00:00Z',
        p_before_id: 'msg-1',
      }))
    })

    it('returns empty array when no comments', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getBattleComments(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('comments error') })
      await expect(repo.getBattleComments(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // postComment
  // ---------------------------------------------------------------------------
  describe('postComment', () => {
    const fakeComment = { id: 'cmt-1', battle_id: BATTLE_ID, lenser_id: LENSER_ID, body: 'hello', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }

    it('calls fn_post_battle_comment with correct params', async () => {
      mockRpc.mockResolvedValue({ data: [fakeComment], error: null })
      const result = await repo.postComment(BATTLE_ID, LENSER_ID, 'hello')
      expect(mockRpc).toHaveBeenCalledWith('fn_post_battle_comment', {
        p_battle_id: BATTLE_ID,
        p_lenser_id: LENSER_ID,
        p_body: 'hello',
      })
      expect(result).toEqual(fakeComment)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('comment error') })
      await expect(repo.postComment(BATTLE_ID, LENSER_ID, 'x')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getGlobalMessages
  // ---------------------------------------------------------------------------
  describe('getGlobalMessages', () => {
    const messages = [
      { id: 'm2', created_at: '2026-01-02T00:00:00Z', body: 'second' },
      { id: 'm1', created_at: '2026-01-01T00:00:00Z', body: 'first' },
    ]

    it('calls fn_get_global_messages with default limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGlobalMessages(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_global_messages', {
        p_battle_id: BATTLE_ID,
        p_limit: 50,
        p_before_ts: null,
        p_before_id: null,
      })
    })

    it('reverses RPC result to chronological order', async () => {
      mockRpc.mockResolvedValue({ data: messages, error: null })
      const result = await repo.getGlobalMessages(BATTLE_ID)
      expect(result[0].id).toBe('m1')
      expect(result[1].id).toBe('m2')
    })

    it('passes cursor when provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getGlobalMessages(BATTLE_ID, 10, { before_ts: '2026-01-01T00:00:00Z', before_id: 'msg-1' })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_global_messages', expect.objectContaining({
        p_before_ts: '2026-01-01T00:00:00Z',
        p_before_id: 'msg-1',
      }))
    })

    it('returns empty array when no messages', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getGlobalMessages(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('messages error') })
      await expect(repo.getGlobalMessages(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // postGlobalMessage
  // ---------------------------------------------------------------------------
  describe('postGlobalMessage', () => {
    const fakeMsg = { id: 'msg-1', battle_id: BATTLE_ID, sender_handle: 'alice', sender_role: 'lenser', body: 'hi', created_at: '2026-01-01T00:00:00Z' }

    it('calls fn_post_global_message ignoring senderId', async () => {
      mockRpc.mockResolvedValue({ data: [fakeMsg], error: null })
      const result = await repo.postGlobalMessage(BATTLE_ID, 'ignored-sender-id', 'alice', 'lenser', 'hi')
      expect(mockRpc).toHaveBeenCalledWith('fn_post_global_message', {
        p_battle_id: BATTLE_ID,
        p_body: 'hi',
        p_sender_handle: 'alice',
        p_sender_role: 'lenser',
      })
      expect(result).toEqual(fakeMsg)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('msg error') })
      await expect(repo.postGlobalMessage(BATTLE_ID, 'id', 'handle', 'role', 'body')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // removeContender
  // ---------------------------------------------------------------------------
  describe('removeContender', () => {
    it('calls fn_remove_battle_contender with p_contender_id', async () => {
      await repo.removeContender('c-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_remove_battle_contender', { p_contender_id: 'c-1' })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('remove error') })
      await expect(repo.removeContender('c-1')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // inviteContender
  // ---------------------------------------------------------------------------
  describe('inviteContender', () => {
    const input = { battle_id: BATTLE_ID, slot: 'A' as const, contender_ref_id: 'agent-1', display_name: 'Agent Alpha', contender_type: 'ai_agent' as const }
    const fakeContender = { id: 'c-1', ...input }

    it('calls fn_invite_battle_contender with all params', async () => {
      mockRpc.mockResolvedValue({ data: [fakeContender], error: null })
      const result = await repo.inviteContender(input)
      expect(mockRpc).toHaveBeenCalledWith('fn_invite_battle_contender', {
        p_battle_id: BATTLE_ID,
        p_slot: 'A',
        p_contender_type: 'ai_agent',
        p_contender_ref_id: 'agent-1',
        p_display_name: 'Agent Alpha',
      })
      expect(result).toEqual(fakeContender)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('invite error') })
      await expect(repo.inviteContender(input)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // submitContenderEntry
  // ---------------------------------------------------------------------------
  describe('submitContenderEntry', () => {
    const fakeSubmission = { id: 'sub-1', battle_id: BATTLE_ID, contender_id: 'c-1', content_text: 'my answer', content_url: null, status: 'submitted' }

    it('calls fn_battles_submit with required fields', async () => {
      mockRpc.mockResolvedValue({ data: [fakeSubmission], error: null })
      const result = await repo.submitContenderEntry(BATTLE_ID, 'c-1', 'my answer')
      expect(mockRpc).toHaveBeenCalledWith('fn_battles_submit', {
        p_battle_id: BATTLE_ID,
        p_content_text: 'my answer',
        p_content_url: null,
        p_content_media: null,
        p_execution_run_id: null,
        p_artifact_id: null,
        p_source_type: 'text',
        p_adapter_id: null,
        p_model_id: null,
      })
      expect(result).toEqual(fakeSubmission)
    })

    it('calls validate function before submitting when provided', async () => {
      mockRpc.mockResolvedValue({ data: [fakeSubmission], error: null })
      const validate = vi.fn().mockResolvedValue(undefined)
      await repo.submitContenderEntry(BATTLE_ID, 'c-1', 'text', validate)
      expect(validate).toHaveBeenCalledWith('text')
      expect(validate).toHaveBeenCalledBefore(mockRpc as unknown as ReturnType<typeof vi.fn>)
    })

    it('aborts submission when validate throws', async () => {
      const validate = vi.fn().mockRejectedValue(new Error('content blocked'))
      await expect(repo.submitContenderEntry(BATTLE_ID, 'c-1', 'bad text', validate)).rejects.toThrow('content blocked')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('rethrows RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('submit error') })
      await expect(repo.submitContenderEntry(BATTLE_ID, 'c-1', 'text')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // linkForumThread
  // ---------------------------------------------------------------------------
  describe('linkForumThread', () => {
    it('calls fn_battles_link_forum_thread with p_battle_id and p_forum_thread_id', async () => {
      await repo.linkForumThread(BATTLE_ID, 'thread-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_battles_link_forum_thread', {
        p_battle_id: BATTLE_ID,
        p_forum_thread_id: 'thread-1',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('link error') })
      await expect(repo.linkForumThread(BATTLE_ID, 'thread-1')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // assignLensToContender
  // ---------------------------------------------------------------------------
  describe('assignLensToContender', () => {
    const assignInput = { contender_id: 'c-1', battle_id: BATTLE_ID, lens_id: 'lens-1', version_id: 'v-1' }
    const fakeAssignment = { id: 'a-1', ...assignInput, assigned_at: '2026-01-01T00:00:00Z' }

    it('calls fn_assign_lens_to_contender with all params', async () => {
      mockRpc.mockResolvedValue({ data: [fakeAssignment], error: null })
      const result = await repo.assignLensToContender(assignInput)
      expect(mockRpc).toHaveBeenCalledWith('fn_assign_lens_to_contender', {
        p_contender_id: 'c-1',
        p_battle_id: BATTLE_ID,
        p_lens_id: 'lens-1',
        p_version_id: 'v-1',
      })
      expect(result).toEqual(fakeAssignment)
    })

    it('passes null for version_id when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [fakeAssignment], error: null })
      await repo.assignLensToContender({ contender_id: 'c-1', battle_id: BATTLE_ID, lens_id: 'lens-1' })
      expect(mockRpc).toHaveBeenCalledWith('fn_assign_lens_to_contender', expect.objectContaining({ p_version_id: null }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('assign error') })
      await expect(repo.assignLensToContender(assignInput)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getLensAssignment
  // ---------------------------------------------------------------------------
  describe('getLensAssignment', () => {
    it('calls fn_get_lens_assignment with p_contender_id', async () => {
      const fakeAssignment = { id: 'a-1', contender_id: 'c-1', battle_id: BATTLE_ID, lens_id: 'lens-1', version_id: null, assigned_at: '2026-01-01T00:00:00Z' }
      mockRpc.mockResolvedValue({ data: [fakeAssignment], error: null })
      const result = await repo.getLensAssignment('c-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_assignment', { p_contender_id: 'c-1' })
      expect(result).toEqual(fakeAssignment)
    })

    it('returns null when no assignment exists', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getLensAssignment('c-1')).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('assignment error') })
      await expect(repo.getLensAssignment('c-1')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // openVoting / closeVoting
  // ---------------------------------------------------------------------------
  describe('openVoting', () => {
    it('calls fn_battle_open_voting with p_battle_id', async () => {
      await repo.openVoting(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_battle_open_voting', { p_battle_id: BATTLE_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('open voting error') })
      await expect(repo.openVoting(BATTLE_ID)).rejects.toThrow()
    })
  })

  describe('closeVoting', () => {
    it('calls fn_battle_close_voting with p_battle_id', async () => {
      await repo.closeVoting(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_battle_close_voting', { p_battle_id: BATTLE_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('close voting error') })
      await expect(repo.closeVoting(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // scheduleBattle
  // ---------------------------------------------------------------------------
  describe('scheduleBattle', () => {
    it('calls fn_schedule_battle then fn_get_battle', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [fakeBattle], error: null })
      const result = await repo.scheduleBattle({ battle_id: BATTLE_ID, execution_starts_at: '2026-06-01T00:00:00Z' })
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_schedule_battle', {
        p_battle_id: BATTLE_ID,
        p_execution_starts_at: '2026-06-01T00:00:00Z',
        p_voting_duration_hours: 24,
        p_auto_publish: true,
      })
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'fn_get_battle', { p_battle_id: BATTLE_ID })
      expect(result).toEqual(fakeBattle)
    })

    it('uses provided voting_duration_hours and auto_publish', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [fakeBattle], error: null })
      await repo.scheduleBattle({ battle_id: BATTLE_ID, execution_starts_at: '2026-06-01T00:00:00Z', voting_duration_hours: 48, auto_publish: false })
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_schedule_battle', expect.objectContaining({
        p_voting_duration_hours: 48,
        p_auto_publish: false,
      }))
    })

    it('throws when fn_schedule_battle fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('schedule error') })
      await expect(repo.scheduleBattle({ battle_id: BATTLE_ID, execution_starts_at: '2026-06-01T00:00:00Z' })).rejects.toThrow('schedule error')
    })
  })

  // ---------------------------------------------------------------------------
  // getBattleExecutionJobs
  // ---------------------------------------------------------------------------
  describe('getBattleExecutionJobs', () => {
    it('calls fn_get_battle_execution_jobs with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getBattleExecutionJobs(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_execution_jobs', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no jobs', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getBattleExecutionJobs(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('jobs error') })
      await expect(repo.getBattleExecutionJobs(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getTrendingBattles
  // ---------------------------------------------------------------------------
  describe('getTrendingBattles', () => {
    it('calls fn_get_trending_battles with default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingBattles()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_trending_battles', { p_limit: 20, p_cursor: null })
    })

    it('passes custom limit and cursor', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getTrendingBattles({ limit: 5, cursor: 3 })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_trending_battles', { p_limit: 5, p_cursor: 3 })
    })

    it('returns empty array when no trending battles', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getTrendingBattles()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('trending error') })
      await expect(repo.getTrendingBattles()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getAiJudgeVerdicts
  // ---------------------------------------------------------------------------
  describe('getAiJudgeVerdicts', () => {
    it('calls fn_get_ai_judge_verdicts with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getAiJudgeVerdicts(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_ai_judge_verdicts', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no verdicts', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getAiJudgeVerdicts(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('verdict error') })
      await expect(repo.getAiJudgeVerdicts(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getDLQEntries
  // ---------------------------------------------------------------------------
  describe('getDLQEntries', () => {
    it('calls fn_get_battle_dlq_entries with defaults', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getDLQEntries()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_dlq_entries', {
        p_battle_id: null,
        p_unresolved_only: false,
        p_limit: 50,
      })
    })

    it('passes provided options', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getDLQEntries({ battleId: BATTLE_ID, unresolvedOnly: true, limit: 10 })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_dlq_entries', {
        p_battle_id: BATTLE_ID,
        p_unresolved_only: true,
        p_limit: 10,
      })
    })

    it('returns empty array when no DLQ entries', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getDLQEntries()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('dlq error') })
      await expect(repo.getDLQEntries()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // retryDLQEntry
  // ---------------------------------------------------------------------------
  describe('retryDLQEntry', () => {
    it('calls fn_retry_dead_letter_battle_job with p_dead_letter_id', async () => {
      await repo.retryDLQEntry('dlq-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_retry_dead_letter_battle_job', { p_dead_letter_id: 'dlq-1' })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('retry error') })
      await expect(repo.retryDLQEntry('dlq-1')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getPublicExecutionJobs
  // ---------------------------------------------------------------------------
  describe('getPublicExecutionJobs', () => {
    it('calls fn_get_battle_execution_jobs with p_battle_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPublicExecutionJobs(BATTLE_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_battle_execution_jobs', { p_battle_id: BATTLE_ID })
    })

    it('returns empty array when no jobs', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getPublicExecutionJobs(BATTLE_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('public jobs error') })
      await expect(repo.getPublicExecutionJobs(BATTLE_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // listBattleTemplates
  // ---------------------------------------------------------------------------
  describe('listBattleTemplates', () => {
    it('calls fn_list_battle_templates with limit 100', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listBattleTemplates()
      expect(mockRpc).toHaveBeenCalledWith('fn_list_battle_templates', { p_limit: 100 })
    })

    it('returns empty array when no templates', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listBattleTemplates()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('templates error') })
      await expect(repo.listBattleTemplates()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // toggleBattleTemplatePublic
  // ---------------------------------------------------------------------------
  describe('toggleBattleTemplatePublic', () => {
    it('calls fn_toggle_battle_template_public with id and isPublic=true', async () => {
      await repo.toggleBattleTemplatePublic('tmpl-1', true)
      expect(mockRpc).toHaveBeenCalledWith('fn_toggle_battle_template_public', {
        p_template_id: 'tmpl-1',
        p_is_public: true,
      })
    })

    it('calls with isPublic=false', async () => {
      await repo.toggleBattleTemplatePublic('tmpl-1', false)
      expect(mockRpc).toHaveBeenCalledWith('fn_toggle_battle_template_public', {
        p_template_id: 'tmpl-1',
        p_is_public: false,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('toggle error') })
      await expect(repo.toggleBattleTemplatePublic('tmpl-1', true)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // createBattleFromTemplate
  // ---------------------------------------------------------------------------
  describe('createBattleFromTemplate', () => {
    it('calls fn_battles_create_from_template and returns new battle id', async () => {
      mockRpc.mockResolvedValue({ data: 'new-battle-uuid', error: null })
      const result = await repo.createBattleFromTemplate('tmpl-1', 'New Battle', 'new-battle-slug')
      expect(mockRpc).toHaveBeenCalledWith('fn_battles_create_from_template', {
        p_template_id: 'tmpl-1',
        p_title: 'New Battle',
        p_slug: 'new-battle-slug',
      })
      expect(result).toBe('new-battle-uuid')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('template create error') })
      await expect(repo.createBattleFromTemplate('tmpl-1', 'T', 's')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // handleError — PGRST116 mapping
  // ---------------------------------------------------------------------------
  describe('handleError (via public methods)', () => {
    it('maps PGRST116 to "Battle not found." for getContenders', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
      await expect(repo.getContenders(BATTLE_ID)).rejects.toThrow('Battle not found.')
    })

    it('rethrows non-PGRST116 errors unchanged', async () => {
      const original = new Error('unexpected db error')
      mockRpc.mockResolvedValue({ data: null, error: original })
      await expect(repo.getContenders(BATTLE_ID)).rejects.toBe(original)
    })

    it('does not throw when error is null', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await expect(repo.getContenders(BATTLE_ID)).resolves.toEqual([])
    })
  })
})
