import type { Battle, Contender, VoteAggregate } from '../types/battle.types'

export interface DerivedWinner {
  slot: 'A' | 'B' | 'draw' | undefined
  name: string | undefined
  /** True once the battle has been finalized (winner is authoritative, not a live tally). */
  isFinal: boolean
}

/**
 * Resolve the battle winner for display.
 *
 * Source of truth ordering:
 * 1. battle.winner_contender_id — the authoritative winner written by
 *    public.fn_battles_finalize (scoring -> closed). This is mode-aware on the
 *    DB side: AI-judge / ai_vs_ai battles are ranked by ai_judge_verdicts, not
 *    by vote counts, and ties are resolved with a deterministic tie-break
 *    (score DESC, raw_vote_count DESC, weighted_vote_sum DESC, earliest
 *    submitted_at, contender_id ASC) so a finalized battle ALWAYS has a single
 *    winner_contender_id — it is NEVER left NULL and a finalized battle is never
 *    a draw. The UI must not re-derive the winner from raw vote counts for these
 *    modes, or it would show a NULL/garbage winner (the F2 bug) because
 *    vote_aggregates is empty.
 * 2. Finalized with no winner id is not expected (see above); we keep a harmless
 *    'unknown' fallback rather than implying the DB returned a draw.
 * 3. Pre-finalize (voting / scoring, not yet closed): fall back to the live
 *    vote tally so standings still render. This is provisional, not final, so an
 *    equal live tally may show as a tie until the DB applies its tie-break at
 *    finalize.
 */
export function deriveBattleWinner(
  battle: Pick<Battle, 'status' | 'winner_contender_id'> | null | undefined,
  contenders: Pick<Contender, 'id' | 'slot' | 'display_name'>[],
  aggregates: Pick<VoteAggregate, 'contender_id' | 'raw_vote_count' | 'rank_position'>[],
): DerivedWinner {
  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  // 'archived' is also a final phase (useBattleStateMachine maps it to 'result').
  const isFinal =
    battle?.status === 'closed' ||
    battle?.status === 'published' ||
    battle?.status === 'archived'

  // 1. Authoritative finalized winner.
  if (battle?.winner_contender_id) {
    if (battle.winner_contender_id === contenderA?.id) {
      return { slot: 'A', name: contenderA?.display_name, isFinal: true }
    }
    if (battle.winner_contender_id === contenderB?.id) {
      return { slot: 'B', name: contenderB?.display_name, isFinal: true }
    }
    // Winner id present but not matched to a known contender — unknown.
    return { slot: undefined, name: undefined, isFinal: true }
  }

  // 2. Finalized but no winner id resolved. fn_battles_finalize always writes a
  //    deterministic winner, so this is an unexpected/edge state, not a draw.
  //    Harmless fallback: render as final with an unknown winner.
  if (isFinal) {
    return { slot: undefined, name: undefined, isFinal: true }
  }

  // 3. Provisional standings from the live vote tally (pre-finalize).
  const aggA = contenderA ? aggregates.find((v) => v.contender_id === contenderA.id) : undefined
  const aggB = contenderB ? aggregates.find((v) => v.contender_id === contenderB.id) : undefined
  if (!aggA || !aggB) return { slot: undefined, name: undefined, isFinal: false }

  if (aggA.rank_position === 1 && aggB.rank_position !== 1) {
    return { slot: 'A', name: contenderA?.display_name, isFinal: false }
  }
  if (aggB.rank_position === 1 && aggA.rank_position !== 1) {
    return { slot: 'B', name: contenderB?.display_name, isFinal: false }
  }

  const countA = aggA.raw_vote_count ?? 0
  const countB = aggB.raw_vote_count ?? 0
  if (countA === countB) {
    return countA > 0
      ? { slot: 'draw', name: undefined, isFinal: false }
      : { slot: undefined, name: undefined, isFinal: false }
  }
  return countA > countB
    ? { slot: 'A', name: contenderA?.display_name, isFinal: false }
    : { slot: 'B', name: contenderB?.display_name, isFinal: false }
}
