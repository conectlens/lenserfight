import {
  CONTENDER_STRUCTURES,
  JUDGING_MODES,
  TASK_SOURCES,
  resolveToLegacyBattleType,
  type ContenderStructure,
  type JudgingMode,
  type LenserBattlePolicy,
  type TaskSource,
} from '@lenserfight/domain/battle-governance'

import type { BattleType } from '../types/battle.types'

export interface BattleAxes {
  task_source?: string | null
  contender_structure?: string | null
  judging_mode?: string | null
  lenser_battle_policy?: Record<string, unknown> | null
  workflow_id?: string | null
  lens_id?: string | null
  challenge_type?: string | null
  battle_type?: BattleType | string | null
}

const LEGACY_TYPES: readonly BattleType[] = [
  'ai_vs_ai',
  'human_vs_human_ai_votes',
  'human_vs_human_open_votes',
  'human_vs_ai',
  'workflow_battle',
  'lenser_battle',
]

function isTaskSource(value: unknown): value is TaskSource {
  return typeof value === 'string' && (TASK_SOURCES as readonly string[]).includes(value)
}

function isContenderStructure(value: unknown): value is ContenderStructure {
  return typeof value === 'string' && (CONTENDER_STRUCTURES as readonly string[]).includes(value)
}

function isJudgingMode(value: unknown): value is JudgingMode {
  return typeof value === 'string' && (JUDGING_MODES as readonly string[]).includes(value)
}

function isBattleType(value: unknown): value is BattleType {
  return typeof value === 'string' && (LEGACY_TYPES as readonly string[]).includes(value)
}

function hasPolicy(value: Record<string, unknown> | null | undefined): value is LenserBattlePolicy {
  return !!value && Object.keys(value).length > 0
}

/**
 * Derive the legacy battle_type presentation value from the V2 battle axes.
 * The DB field remains as a compatibility fallback, but UI code should call
 * this codec instead of branching on battle.battle_type directly.
 */
export function deriveBattleType(axes: BattleAxes): BattleType {
  if (
    isTaskSource(axes.task_source) &&
    isContenderStructure(axes.contender_structure) &&
    isJudgingMode(axes.judging_mode)
  ) {
    return resolveToLegacyBattleType({
      taskSource: axes.task_source,
      contenderStructure: axes.contender_structure,
      judgingMode: axes.judging_mode,
      lenserPolicy: hasPolicy(axes.lenser_battle_policy) ? axes.lenser_battle_policy : null,
    })
  }

  if (isBattleType(axes.battle_type)) return axes.battle_type
  if (axes.workflow_id) return 'workflow_battle'
  return 'ai_vs_ai'
}
