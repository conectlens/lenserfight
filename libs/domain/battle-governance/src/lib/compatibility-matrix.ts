/**
 * Battle format ↔ type compatibility matrix.
 *
 * Determines which BattleType values are valid for each BattleFormat.
 * This is the single source of truth consumed by the wizard UI, backend
 * validation, and CLI validation.
 */

import type { BattleFormat, BattleType } from './battle.constants'
import {
  BATTLE_TYPES,
  EXPERIMENTAL_BATTLE_FORMATS,
  EXPERIMENTAL_BATTLE_TYPES,
} from './battle.constants'

// ─── Format → Type matrix ────────────────────────────────────────────────────

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

export const FORMAT_LABEL: Record<BattleFormat, string> = {
  workflow: 'Workflow Battle',
  lens: 'Lens Battle',
  lenser_battle: 'Lenser Battle',
}

// ─── Queries ─────────────────────────────────────────────────────────────────

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
  if (!format) return BATTLE_TYPES
  return FORMAT_TYPE_MATRIX[format]
}

export function getDisabledReason(format: BattleFormat | null, type: BattleType): string | null {
  if (!format) return null
  if (FORMAT_TYPE_MATRIX[format].includes(type)) return null
  return `Unavailable for ${FORMAT_LABEL[format]}`
}

export function isExperimentalBattleType(type: BattleType): boolean {
  return EXPERIMENTAL_BATTLE_TYPES.includes(type)
}

export function isExperimentalBattleFormat(format: BattleFormat): boolean {
  return EXPERIMENTAL_BATTLE_FORMATS.includes(format)
}

// ─── Wizard step copy ────────────────────────────────────────────────────────

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
 * validation. Server-side validation (and DB CHECK constraint) mirrors
 * this exact rule.
 */
export function isCompatibleCombination(format: BattleFormat | null, type: BattleType): boolean {
  return isBattleTypeAllowedForFormat(format, type)
}
