/**
 * Judging Mode — how the winner of a battle is decided.
 *
 * Extracted from the old BattleType enum which conflated contender structure
 * with judging method (e.g. `human_vs_human_ai_votes` = contender structure
 * "human_vs_human" + judging mode "ai_judge").
 */

import type { ContenderStructure } from './contender-structure.types'

// ─── Values ─────────────────────────────────────────────────────────────────

export const JUDGING_MODES = ['community_vote', 'ai_judge', 'rubric_score', 'auto_score'] as const
export type JudgingMode = (typeof JUDGING_MODES)[number]

// ─── Labels & descriptions ──────────────────────────────────────────────────

export const JUDGING_MODE_LABEL: Record<JudgingMode, string> = {
  community_vote: 'Community Vote',
  ai_judge: 'AI Judge',
  rubric_score: 'Rubric Score',
  auto_score: 'Auto-score',
}

export const JUDGING_MODE_DESCRIPTION: Record<JudgingMode, string> = {
  community_vote: 'The community votes openly on the best output. Most popular wins.',
  ai_judge: 'An AI lenser casts weighted judging votes based on quality criteria.',
  rubric_score: 'Outputs are scored against a structured rubric with weighted criteria.',
  auto_score: 'Answers are scored automatically — best for math, quizzes, and objective tasks.',
}

export const JUDGING_MODE_DOCS_PATH: Record<JudgingMode, string> = {
  community_vote: '/how-to/battles/voting#community-vote',
  ai_judge: '/how-to/battles/voting#ai-judge',
  rubric_score: '/how-to/battles/voting#rubric-score',
  auto_score: '/how-to/battles/voting#auto-score',
}

// ─── Experimental flags ─────────────────────────────────────────────────────

export const EXPERIMENTAL_JUDGING_MODES: readonly JudgingMode[] = ['rubric_score', 'auto_score']

export function isExperimentalJudgingMode(mode: JudgingMode): boolean {
  return EXPERIMENTAL_JUDGING_MODES.includes(mode)
}

// ─── Contender Structure → Judging Mode matrix ─────────────────────────────

/**
 * Which judging modes are valid for each contender structure.
 *
 * - ai_vs_ai: community vote or AI judge (humans or AI evaluate outputs)
 * - human_vs_human: all modes — community, AI, rubric, or auto for objective tasks
 * - human_vs_ai: community vote or AI judge
 */
export const JUDGING_BY_CONTENDER: Record<ContenderStructure, readonly JudgingMode[]> = {
  ai_vs_ai: ['community_vote', 'ai_judge'],
  human_vs_human: ['community_vote', 'ai_judge', 'rubric_score', 'auto_score'],
  human_vs_ai: ['community_vote', 'ai_judge'],
}

export const RECOMMENDED_JUDGING_BY_CONTENDER: Record<ContenderStructure, JudgingMode> = {
  ai_vs_ai: 'community_vote',
  human_vs_human: 'community_vote',
  human_vs_ai: 'community_vote',
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function isJudgingAllowedForContender(
  contender: ContenderStructure | null,
  mode: JudgingMode,
): boolean {
  if (contender === null) return true
  return JUDGING_BY_CONTENDER[contender].includes(mode)
}

export function getRecommendedJudging(contender: ContenderStructure | null): JudgingMode | null {
  return contender ? RECOMMENDED_JUDGING_BY_CONTENDER[contender] : null
}

export function getAllowedJudgingForContender(
  contender: ContenderStructure | null,
): readonly JudgingMode[] {
  if (!contender) return JUDGING_MODES
  return JUDGING_BY_CONTENDER[contender]
}

export function getJudgingDisabledReason(
  contender: ContenderStructure | null,
  mode: JudgingMode,
): string | null {
  if (!contender) return null
  if (JUDGING_BY_CONTENDER[contender].includes(mode)) return null
  const label = contender === 'ai_vs_ai' ? 'AI vs AI' : contender === 'human_vs_human' ? 'Human vs Human' : 'Human vs AI'
  return `Unavailable for ${label} battles`
}
