/**
 * Canonical constants for the Battle domain.
 *
 * These arrays and derived union types are the single source of truth for
 * battle formats, types, content types, and experimental flags. Both frontend
 * UI and backend validation consume these via the domain barrel.
 */

// ─── Battle Format ───────────────────────────────────────────────────────────
// Step 0 of the creation wizard — determines the overall execution model.
// @deprecated — Use TaskSource from './task-source.types' instead.
// Kept for backward compatibility with existing consumers.

export const BATTLE_FORMATS = ['workflow', 'lens', 'lenser_battle'] as const
/** @deprecated Use `TaskSource` from `task-source.types` instead. */
export type BattleFormat = (typeof BATTLE_FORMATS)[number]

// ─── Battle Type ─────────────────────────────────────────────────────────────
// Determines who competes and how voting works.

export const BATTLE_TYPES = [
  'ai_vs_ai',
  'human_vs_ai',
  'human_vs_human_open_votes',
  'human_vs_human_ai_votes',
  'workflow_battle',
  'lenser_battle',
] as const
export type BattleType = (typeof BATTLE_TYPES)[number]

// ─── Content Type ────────────────────────────────────────────────────────────
// Expected output type of a battle. Drives output compatibility validation.

export const BATTLE_CONTENT_TYPES = [
  'text',
  'code',
  'poem',
  'drawing',
  'image',
  'video',
  'audio',
  'workflow',
  'map',
  'avatar',
  'image_edit',
  'kaggle',
] as const
export type BattleContentType = (typeof BATTLE_CONTENT_TYPES)[number]

// ─── Voter Eligibility ───────────────────────────────────────────────────────

export const VOTER_ELIGIBILITY_OPTIONS = [
  'open',
  'human_only',
  'ai_only',
  'verified_lenser',
  'lenser_only',
] as const
export type VoterEligibility = (typeof VOTER_ELIGIBILITY_OPTIONS)[number]

// ─── Experimental Flags ──────────────────────────────────────────────────────
// Production-grade executors carry the flagship treatment; everything else is
// surfaced as "Evolving" / experimental.

export const EXPERIMENTAL_BATTLE_TYPES: readonly BattleType[] = [
  'human_vs_human_open_votes',
  'human_vs_human_ai_votes',
  'workflow_battle',
  'lenser_battle',
]

export const EXPERIMENTAL_BATTLE_FORMATS: readonly BattleFormat[] = ['lenser_battle']

// ─── Battle types that involve AI execution ──────────────────────────────────

export const AI_BATTLE_TYPES: readonly BattleType[] = [
  'ai_vs_ai',
  'human_vs_ai',
  'human_vs_human_ai_votes',
  'lenser_battle',
]

// ─── Battle types that support automatic server-side execution ────────────────

export const AUTO_EXEC_BATTLE_TYPES: readonly BattleType[] = [
  'ai_vs_ai',
  'workflow_battle',
]

// ─── Human-involving battle types ────────────────────────────────────────────

export const HUMAN_CONTENDER_BATTLE_TYPES: readonly BattleType[] = [
  'human_vs_ai',
  'human_vs_human_open_votes',
  'human_vs_human_ai_votes',
]
