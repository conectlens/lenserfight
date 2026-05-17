/**
 * Contender Structure — who competes in a battle.
 *
 * Extracted from the old BattleType enum which conflated contender identity
 * with judging mode (e.g. `human_vs_human_ai_votes` encoded both "human vs
 * human" and "AI judge" in one value).
 */

import type { TaskSource } from './task-source.types'

// ─── Values ─────────────────────────────────────────────────────────────────

export const CONTENDER_STRUCTURES = ['ai_vs_ai', 'human_vs_human', 'human_vs_ai'] as const
export type ContenderStructure = (typeof CONTENDER_STRUCTURES)[number]

// ─── Labels & descriptions ──────────────────────────────────────────────────

export const CONTENDER_STRUCTURE_LABEL: Record<ContenderStructure, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human: 'Human vs Human',
  human_vs_ai: 'Human vs AI',
}

export const CONTENDER_STRUCTURE_DESCRIPTION: Record<ContenderStructure, string> = {
  ai_vs_ai: 'Two AI models compete on the same prompt. Best for benchmarking and model comparison.',
  human_vs_human: 'Two humans compete in a challenge. The community or an AI judge decides the winner.',
  human_vs_ai: 'A human faces off against an AI model. Tests human skill against machine capability.',
}

export const CONTENDER_STRUCTURE_DOCS_PATH: Record<ContenderStructure, string> = {
  ai_vs_ai: '/how-to/battles/battle-types#ai-vs-ai',
  human_vs_human: '/how-to/battles/battle-types#human-vs-human',
  human_vs_ai: '/how-to/battles/battle-types#human-vs-ai',
}

// ─── Task Source → Contender Structure matrix ───────────────────────────────

/**
 * Which contender structures are valid for each task source.
 *
 * - lens: any combination — AI benchmarking (recommended) or human contests
 * - workflow: AI or mixed — workflows typically need AI execution
 * - challenge: human-involving only — standalone human game mechanics
 */
export const CONTENDER_BY_TASK_SOURCE: Record<TaskSource, readonly ContenderStructure[]> = {
  lens: ['ai_vs_ai', 'human_vs_ai', 'human_vs_human'],
  workflow: ['ai_vs_ai', 'human_vs_ai'],
  challenge: ['human_vs_human', 'human_vs_ai'],
}

export const RECOMMENDED_CONTENDER_BY_TASK_SOURCE: Record<TaskSource, ContenderStructure> = {
  lens: 'ai_vs_ai',
  workflow: 'ai_vs_ai',
  challenge: 'human_vs_human',
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function isContenderAllowedForTaskSource(
  taskSource: TaskSource | null,
  contender: ContenderStructure,
): boolean {
  if (taskSource === null) return true
  return CONTENDER_BY_TASK_SOURCE[taskSource].includes(contender)
}

export function getRecommendedContender(taskSource: TaskSource | null): ContenderStructure | null {
  return taskSource ? RECOMMENDED_CONTENDER_BY_TASK_SOURCE[taskSource] : null
}

export function getAllowedContendersForTaskSource(
  taskSource: TaskSource | null,
): readonly ContenderStructure[] {
  if (!taskSource) return CONTENDER_STRUCTURES
  return CONTENDER_BY_TASK_SOURCE[taskSource]
}

export function getContenderDisabledReason(
  taskSource: TaskSource | null,
  contender: ContenderStructure,
): string | null {
  if (!taskSource) return null
  if (CONTENDER_BY_TASK_SOURCE[taskSource].includes(contender)) return null
  return `Unavailable for ${taskSource === 'lens' ? 'Lens' : taskSource === 'workflow' ? 'Workflow' : 'Challenge'} tasks`
}

/** Whether a contender structure involves human participants. */
export function hasHumanContenders(contender: ContenderStructure): boolean {
  return contender === 'human_vs_human' || contender === 'human_vs_ai'
}
