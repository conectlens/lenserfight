/**
 * Re-export bridge — all logic lives in @lenserfight/domain/battle-governance.
 *
 * This file preserves the public API so existing consumers (wizard, specs,
 * BattleTypeSelector) keep working with zero import changes.
 */

export type { BattleFormat } from '@lenserfight/domain/battle-governance'

export {
  BATTLE_TYPES as ALL_BATTLE_TYPES,
  FORMAT_LABEL,
  getAllowedTypesForFormat,
  getDefaultBattleTypeForFormat,
  getDisabledReason,
  getRecommendedBattleType,
  getTypeStepCopy,
  isBattleTypeAllowedForFormat,
  isCompatibleCombination,
  isExperimentalBattleFormat,
  isExperimentalBattleType,
} from '@lenserfight/domain/battle-governance'

// V2 concept separation re-exports
export type { TaskSource } from '@lenserfight/domain/battle-governance'
export type { ContenderStructure } from '@lenserfight/domain/battle-governance'
export type { JudgingMode } from '@lenserfight/domain/battle-governance'

export {
  TASK_SOURCES,
  TASK_SOURCE_LABEL,
  isExperimentalTaskSource,
  CONTENDER_STRUCTURES,
  isContenderAllowedForTaskSource,
  getRecommendedContender,
  getContenderDisabledReason,
  hasHumanContenders,
  JUDGING_MODES,
  isJudgingAllowedForContender,
  getRecommendedJudging,
  getJudgingDisabledReason,
  isExperimentalJudgingMode,
  resolveToLegacyBattleType,
  decomposeFromLegacyBattleType,
} from '@lenserfight/domain/battle-governance'
