/**
 * Task Source — Step 0 of the creation wizard.
 *
 * Determines what the battle is about — a lens prompt, a workflow pipeline,
 * or a standalone human challenge. Replaces the old `BattleFormat` axis
 * which conflated task source with contender identity (lenser_battle).
 */

// ─── Values ─────────────────────────────────────────────────────────────────

export const TASK_SOURCES = ['lens', 'workflow', 'challenge'] as const
export type TaskSource = (typeof TASK_SOURCES)[number]

// ─── Experimental flags ─────────────────────────────────────────────────────

export const EXPERIMENTAL_TASK_SOURCES: readonly TaskSource[] = ['challenge']

export function isExperimentalTaskSource(source: TaskSource): boolean {
  return EXPERIMENTAL_TASK_SOURCES.includes(source)
}

// ─── Labels & descriptions ──────────────────────────────────────────────────

export const TASK_SOURCE_LABEL: Record<TaskSource, string> = {
  lens: 'Lens Task',
  workflow: 'Workflow Task',
  challenge: 'Challenge Task',
}

export const TASK_SOURCE_DESCRIPTION: Record<TaskSource, string> = {
  lens: 'Single prompt lens — ideal for model comparison and benchmarking.',
  workflow: 'Multi-step lens workflow — structured end-to-end pipeline battles.',
  challenge: 'Human-friendly contests — math, writing, grammar quizzes, and more.',
}

export const TASK_SOURCE_HELP_PATH: Record<TaskSource, string> = {
  lens: '/tutorials/battle-walkthroughs/lens-battle',
  workflow: '/tutorials/battle-walkthroughs/workflow-battle',
  challenge: '/tutorials/battle-walkthroughs/challenge-battle',
}
