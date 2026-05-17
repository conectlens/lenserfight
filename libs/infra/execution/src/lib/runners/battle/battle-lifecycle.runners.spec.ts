// Batch 3 — JudgeBattleRunner, VoteCollectorRunner, ScoreAggregatorRunner,
// LeaderboardUpdateRunner tests.
//
// All four runners call Supabase via fetch. globalThis.fetch is mocked with
// vi.stubGlobal so the runners never make real HTTP calls.

import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { JudgeBattleRunner } from './judge-battle.runner'
import { VoteCollectorRunner } from './vote-collector.runner'
import { ScoreAggregatorRunner } from './score-aggregator.runner'
import { LeaderboardUpdateRunner } from './leaderboard-update.runner'
import type { NodeRunnerContext } from '../node-runner.interface'
import type { ExecutionResult } from '../../execution.types'

// ─── Environment setup ────────────────────────────────────────────────────────

// The lifecycle runners guard against running outside server context.
// Stub the required env vars before any runner is instantiated.
beforeAll(() => {
  process.env['SUPABASE_URL']              = 'https://test.supabase.co'
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key'
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<NodeRunnerContext> = {},
  nodeConfig: Record<string, unknown> = { battleId: 'battle-test-123' },
): NodeRunnerContext {
  return {
    nodeId:          'lifecycle-node',
    upstreamOutputs: new Map(),
    resolvedParams:  {},
    nodeConfig,
    ...overrides,
  }
}

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok:     status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json:   () => Promise.resolve(body),
    text:   () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }))
}

// ─── JudgeBattleRunner ───────────────────────────────────────────────────────

describe('JudgeBattleRunner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has nodeType = judge_battle', () => {
    expect(new JudgeBattleRunner().nodeType).toBe('judge_battle')
  })

  it('returns error output when battleId is missing', async () => {
    const runner = new JudgeBattleRunner()
    const result = await runner.execute(makeCtx({}, {}))

    expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleId') })
    expect(result.output.text).toBe('')
  })

  it('POSTs to ai-judge-battle edge function and returns judged=true', async () => {
    mockFetch(200, { verdict: 'A', score_a: 85, score_b: 72 })
    const runner = new JudgeBattleRunner()

    const result = await runner.execute(makeCtx())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('ai-judge-battle'),
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify({ battle_id: 'battle-test-123' }),
      }),
    )
    expect(result.output.data).toMatchObject({ battleId: 'battle-test-123', judged: true })
    expect(result.output.metadata).toMatchObject({ battleId: 'battle-test-123', executedBy: 'judge_battle_runner' })
  })

  it('throws when edge function returns non-200', async () => {
    mockFetch(502, 'Bad Gateway')
    const runner = new JudgeBattleRunner()

    await expect(runner.execute(makeCtx())).rejects.toThrow('502')
  })

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const runner = new JudgeBattleRunner()

    await expect(runner.execute(makeCtx({ signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ─── VoteCollectorRunner ─────────────────────────────────────────────────────

describe('VoteCollectorRunner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has nodeType = vote_collector', () => {
    expect(new VoteCollectorRunner().nodeType).toBe('vote_collector')
  })

  it('returns error output when battleId is missing', async () => {
    const runner = new VoteCollectorRunner()
    const result = await runner.execute(makeCtx({}, {}))

    expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleId') })
  })

  it('calls fn_get_battle_scores and returns votesBySlot', async () => {
    mockFetch(200, [
      { slot: 'A', vote_count: 42 },
      { slot: 'B', vote_count: 17 },
    ])
    const runner = new VoteCollectorRunner()

    const result = await runner.execute(makeCtx())

    expect(result.output.data).toMatchObject({
      battleId:    'battle-test-123',
      votesBySlot: { A: 42, B: 17 },
      totalVotes:  59,
    })
  })

  it('throws when RPC returns non-200', async () => {
    mockFetch(500, 'Internal Server Error')
    const runner = new VoteCollectorRunner()

    await expect(runner.execute(makeCtx())).rejects.toThrow('500')
  })

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(new VoteCollectorRunner().execute(makeCtx({ signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ─── ScoreAggregatorRunner ───────────────────────────────────────────────────

describe('ScoreAggregatorRunner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has nodeType = score_aggregator', () => {
    expect(new ScoreAggregatorRunner().nodeType).toBe('score_aggregator')
  })

  it('returns error output when battleId is missing', async () => {
    const runner = new ScoreAggregatorRunner()
    const result = await runner.execute(makeCtx({}, {}))

    expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleId') })
  })

  it('reads votesBySlot from upstream and calls fn_battles_finalize', async () => {
    mockFetch(200, { winner_id: 'contender-a-id', status: 'closed' })

    const upstreamOutput: ExecutionResult = {
      mediaType: 'text',
      text:      '',
      data: {
        battleId:    'battle-test-123',
        votesBySlot: { A: 30, B: 10 },
        totalVotes:  40,
      },
    }
    const upstreamOutputs = new Map([['vote-node', upstreamOutput]])
    const runner = new ScoreAggregatorRunner()

    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('fn_battles_finalize'),
      expect.objectContaining({ body: JSON.stringify({ p_battle_id: 'battle-test-123' }) }),
    )
    expect(result.output.data).toMatchObject({
      battleId:    'battle-test-123',
      finalized:   true,
      winnerId:    'contender-a-id',
      votesBySlot: { A: 30, B: 10 },
    })
  })

  it('throws when fn_battles_finalize returns non-200', async () => {
    mockFetch(503, 'Service Unavailable')

    await expect(new ScoreAggregatorRunner().execute(makeCtx())).rejects.toThrow('503')
  })

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(new ScoreAggregatorRunner().execute(makeCtx({ signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ─── LeaderboardUpdateRunner ─────────────────────────────────────────────────

describe('LeaderboardUpdateRunner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has nodeType = leaderboard_update', () => {
    expect(new LeaderboardUpdateRunner().nodeType).toBe('leaderboard_update')
  })

  it('returns error output when battleId is missing', async () => {
    const result = await new LeaderboardUpdateRunner().execute(makeCtx({}, {}))

    expect(result.output.data).toMatchObject({ error: expect.stringContaining('battleId') })
  })

  it('calls fn_compute_elo_after_battle and returns updated=true', async () => {
    mockFetch(200, null)
    const runner = new LeaderboardUpdateRunner()

    const result = await runner.execute(makeCtx())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('fn_compute_elo_after_battle'),
      expect.objectContaining({ body: JSON.stringify({ p_battle_id: 'battle-test-123' }) }),
    )
    expect(result.output.data).toMatchObject({ battleId: 'battle-test-123', updated: true })
  })

  it('reads winnerId from upstream ScoreAggregatorRunner metadata', async () => {
    mockFetch(200, null)

    const upstreamOutput: ExecutionResult = {
      mediaType: 'text',
      text:      '',
      data:      {},
      metadata: { battleId: 'battle-test-123', winnerId: 'winner-contender-id', executedBy: 'score_aggregator_runner' },
    }
    const upstreamOutputs = new Map([['score-node', upstreamOutput]])
    const runner = new LeaderboardUpdateRunner()

    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(result.output.data).toMatchObject({ winnerId: 'winner-contender-id' })
  })

  it('throws when ELO RPC returns non-200', async () => {
    mockFetch(500, 'DB error')

    await expect(new LeaderboardUpdateRunner().execute(makeCtx())).rejects.toThrow('500')
  })

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(new LeaderboardUpdateRunner().execute(makeCtx({ signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})
