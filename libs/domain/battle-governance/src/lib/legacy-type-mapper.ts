/**
 * Legacy Type Mapper — backward-compatibility bridge.
 *
 * Maps the new 3-axis model (TaskSource × ContenderStructure × JudgingMode)
 * to the existing 6-value `battle_type_enum` in the database, and vice versa.
 *
 * The DB enum is unchanged. Every new battle still writes a valid
 * `battle_type` value via this mapper.
 */

import type { BattleType } from './battle.constants'
import type { TaskSource } from './task-source.types'
import type { ContenderStructure } from './contender-structure.types'
import type { JudgingMode } from './judging-mode.types'
import type { LenserBattlePolicy } from './lenser-battle-policy.types'

// ─── Forward mapping (new → legacy) ────────────────────────────────────────

export interface LegacyTypeInput {
  taskSource: TaskSource
  contenderStructure: ContenderStructure
  judgingMode: JudgingMode
  /** When present and all contenders are AI Lensers with policy, map to 'lenser_battle'. */
  lenserPolicy?: LenserBattlePolicy | null
}

/**
 * Deterministically resolve the new 3-axis battle model to a legacy
 * `battle_type_enum` value for database writes.
 *
 * Priority order:
 * 1. Lenser policy present → 'lenser_battle'
 * 2. Workflow task source → 'workflow_battle'
 * 3. Contender + judging combination → specific legacy type
 */
export function resolveToLegacyBattleType(input: LegacyTypeInput): BattleType {
  const { taskSource, contenderStructure, judgingMode, lenserPolicy } = input

  // Lenser policy takes highest priority — it's the old "lenser_battle" format
  if (lenserPolicy && taskSource !== 'challenge') {
    return 'lenser_battle'
  }

  // Workflow task source maps to workflow_battle regardless of contender/judging
  if (taskSource === 'workflow') {
    return 'workflow_battle'
  }

  // Contender structure + judging mode → legacy type
  if (contenderStructure === 'ai_vs_ai') {
    return 'ai_vs_ai'
  }

  if (contenderStructure === 'human_vs_ai') {
    return 'human_vs_ai'
  }

  // human_vs_human: judging mode determines the specific legacy value
  if (contenderStructure === 'human_vs_human') {
    if (judgingMode === 'ai_judge') {
      return 'human_vs_human_ai_votes'
    }
    return 'human_vs_human_open_votes'
  }

  // Fallback (should never reach here with valid inputs)
  return 'ai_vs_ai'
}

// ─── Reverse mapping (legacy → new) ────────────────────────────────────────

export interface DecomposedBattleType {
  taskSource: TaskSource
  contenderStructure: ContenderStructure
  judgingMode: JudgingMode
}

/**
 * Decompose a legacy `battle_type_enum` value into the new 3-axis model.
 *
 * Requires context about the battle to determine the task source
 * (the legacy enum doesn't encode this for all types).
 */
export function decomposeFromLegacyBattleType(
  battleType: BattleType,
  context?: {
    workflowId?: string | null
    lensId?: string | null
    challengeType?: string | null
  },
): DecomposedBattleType {
  // Determine task source from context
  const taskSource: TaskSource = context?.challengeType
    ? 'challenge'
    : context?.workflowId
      ? 'workflow'
      : 'lens'

  switch (battleType) {
    case 'ai_vs_ai':
      return { taskSource, contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }

    case 'human_vs_ai':
      return { taskSource, contenderStructure: 'human_vs_ai', judgingMode: 'community_vote' }

    case 'human_vs_human_open_votes':
      return { taskSource, contenderStructure: 'human_vs_human', judgingMode: 'community_vote' }

    case 'human_vs_human_ai_votes':
      return { taskSource, contenderStructure: 'human_vs_human', judgingMode: 'ai_judge' }

    case 'workflow_battle':
      return { taskSource: 'workflow', contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }

    case 'lenser_battle':
      return { taskSource, contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }

    default:
      return { taskSource: 'lens', contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }
  }
}
