import type { BattleType } from '../../types/battle.types'

export type BattleFormat = 'workflow' | 'lens' | 'lenser_battle'

export const ALL_BATTLE_TYPES: readonly BattleType[] = [
  'ai_vs_ai',
  'human_vs_ai',
  'human_vs_human_open_votes',
  'human_vs_human_ai_votes',
  'workflow_battle',
  'lenser_battle',
]

const FORMAT_TYPE_MATRIX: Record<BattleFormat, readonly BattleType[]> = {
  workflow: ['ai_vs_ai', 'human_vs_ai', 'workflow_battle'],
  lens: ['ai_vs_ai', 'human_vs_ai', 'human_vs_human_open_votes', 'human_vs_human_ai_votes'],
  lenser_battle: ['lenser_battle'],
}

const RECOMMENDED_TYPE_BY_FORMAT: Record<BattleFormat, BattleType> = {
  workflow: 'ai_vs_ai',
  lens: 'ai_vs_ai',
  lenser_battle: 'lenser_battle',
}

// Production-grade executors carry the flagship treatment; everything else is
// surfaced as "Evolving" / experimental. Lenser Battle is intentionally listed
// here too — the format card is also flagged experimental on the Format step.
const EXPERIMENTAL_TYPES: readonly BattleType[] = [
  'human_vs_human_open_votes',
  'human_vs_human_ai_votes',
  'workflow_battle',
  'lenser_battle',
]

const EXPERIMENTAL_FORMATS: readonly BattleFormat[] = ['lenser_battle']

export const FORMAT_LABEL: Record<BattleFormat, string> = {
  workflow: 'Workflow Battle',
  lens: 'Lens Battle',
  lenser_battle: 'Lenser Battle',
}

export function isBattleTypeAllowedForFormat(format: BattleFormat | null, type: BattleType): boolean {
  if (format === null) return true
  return FORMAT_TYPE_MATRIX[format].includes(type)
}

export function getDefaultBattleTypeForFormat(format: BattleFormat): BattleType {
  return RECOMMENDED_TYPE_BY_FORMAT[format]
}

export function getRecommendedBattleType(format: BattleFormat | null): BattleType | null {
  return format ? RECOMMENDED_TYPE_BY_FORMAT[format] : null
}

export function getAllowedTypesForFormat(format: BattleFormat | null): readonly BattleType[] {
  if (!format) return ALL_BATTLE_TYPES
  return FORMAT_TYPE_MATRIX[format]
}

export function getDisabledReason(format: BattleFormat | null, type: BattleType): string | null {
  if (!format) return null
  if (FORMAT_TYPE_MATRIX[format].includes(type)) return null
  return `Unavailable for ${FORMAT_LABEL[format]}`
}

export function isExperimentalBattleType(type: BattleType): boolean {
  return EXPERIMENTAL_TYPES.includes(type)
}

export function isExperimentalBattleFormat(format: BattleFormat): boolean {
  return EXPERIMENTAL_FORMATS.includes(format)
}

interface StepCopy {
  title: string
  description: string
}

const TYPE_STEP_COPY_BY_FORMAT: Record<BattleFormat, StepCopy> = {
  workflow: {
    title: 'Choose execution mode',
    description: 'Set how the workflow is run and judged.',
  },
  lens: {
    title: 'Choose competition structure',
    description: 'Decide who runs the prompt and who votes.',
  },
  lenser_battle: {
    title: 'Choose judging mode',
    description: 'Lensers bring their own setup — only judging is up to you.',
  },
}

const FALLBACK_TYPE_STEP_COPY: StepCopy = {
  title: 'Battle type',
  description: 'Choose who competes and how voting works.',
}

export function getTypeStepCopy(format: BattleFormat | null): StepCopy {
  if (!format) return FALLBACK_TYPE_STEP_COPY
  return TYPE_STEP_COPY_BY_FORMAT[format]
}

/**
 * Single deterministic check used by the wizard's `canProceed` / submit
 * validation. Future server-side validation (and DB CHECK constraint) should
 * mirror this exact rule.
 */
export function isCompatibleCombination(format: BattleFormat | null, type: BattleType): boolean {
  return isBattleTypeAllowedForFormat(format, type)
}
