import { describe, it, expect } from 'vitest'

import { deriveBattleWinner } from './deriveWinner'

import type { Battle, Contender, VoteAggregate } from '../types/battle.types'

const cA = { id: 'a', slot: 'A', display_name: 'Alpha' } as Contender
const cB = { id: 'b', slot: 'B', display_name: 'Beta' } as Contender
const contenders = [cA, cB]

function agg(id: string, votes: number, rank: number | null = null): VoteAggregate {
  return {
    battle_id: 'x',
    contender_id: id,
    raw_vote_count: votes,
    weighted_vote_sum: votes,
    draw_count: 0,
    rank_position: rank,
  }
}

function battle(status: Battle['status'], winner: string | null = null): Battle {
  return { status, winner_contender_id: winner } as Battle
}

describe('deriveBattleWinner', () => {
  it('uses authoritative winner_contender_id over vote counts (AI-judge F2 fix)', () => {
    // B has more votes, but the DB finalized A as winner (e.g. AI-judge mode).
    const result = deriveBattleWinner(battle('closed', 'a'), contenders, [agg('a', 1), agg('b', 99)])
    expect(result).toEqual({ slot: 'A', name: 'Alpha', isFinal: true })
  })

  it('treats a finalized battle with no winner id as final-but-unknown (never a draw)', () => {
    // fn_battles_finalize always writes a deterministic winner, so a NULL winner
    // on a finalized battle is an unexpected edge state, not a draw.
    const result = deriveBattleWinner(battle('closed', null), contenders, [])
    expect(result).toEqual({ slot: undefined, name: undefined, isFinal: true })
  })

  it('treats an archived battle as final', () => {
    const result = deriveBattleWinner(battle('archived', 'a'), contenders, [])
    expect(result).toEqual({ slot: 'A', name: 'Alpha', isFinal: true })
  })

  it('resolves authoritative winner for slot B', () => {
    const result = deriveBattleWinner(battle('published', 'b'), contenders, [])
    expect(result).toEqual({ slot: 'B', name: 'Beta', isFinal: true })
  })

  it('falls back to live vote tally before finalize', () => {
    const result = deriveBattleWinner(battle('voting', null), contenders, [agg('a', 10), agg('b', 4)])
    expect(result).toEqual({ slot: 'A', name: 'Alpha', isFinal: false })
  })

  it('prefers rank_position when present (pre-finalize)', () => {
    const result = deriveBattleWinner(
      battle('voting', null),
      contenders,
      [agg('a', 3, 2), agg('b', 5, 1)],
    )
    expect(result).toEqual({ slot: 'B', name: 'Beta', isFinal: false })
  })

  it('reports a provisional draw on an equal live tally', () => {
    const result = deriveBattleWinner(battle('voting', null), contenders, [agg('a', 5), agg('b', 5)])
    expect(result).toEqual({ slot: 'draw', name: undefined, isFinal: false })
  })

  it('returns undefined when no votes and not finalized', () => {
    const result = deriveBattleWinner(battle('voting', null), contenders, [agg('a', 0), agg('b', 0)])
    expect(result).toEqual({ slot: undefined, name: undefined, isFinal: false })
  })
})
