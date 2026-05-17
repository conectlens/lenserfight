/**
 * BattleCreationValidator — GRASP Information Expert.
 *
 * Pure stateless validator that owns all knowledge about whether a battle
 * creation configuration is valid. Consumed by:
 * - Wizard UI (inline warnings/errors, disabled cards)
 * - Backend service (pre-insert validation)
 * - CLI (battle validate subcommand)
 *
 * Zero framework dependencies. Zero side-effects.
 */

import type { BattleContentType, BattleFormat, BattleType, VoterEligibility } from './battle.constants'
import { HUMAN_CONTENDER_BATTLE_TYPES } from './battle.constants'
import { isBattleTypeAllowedForFormat, FORMAT_LABEL } from './compatibility-matrix'
import { CONTENT_TYPE_TO_MODALITY, HUMAN_PRODUCIBLE_CONTENT_TYPES } from './content-type-mapping'
import type { LenserBattlePolicy } from './lenser-battle-policy.types'
import { MEMORY_MODES, INSTRUCTION_DISCLOSURES } from './lenser-battle-policy.types'
import type { BattleViolation } from './violation.types'
import type { TaskSource as TaskSourceType } from './task-source.types'
import { TASK_SOURCE_LABEL as TASK_SOURCE_LABEL_MAP } from './task-source.types'
import type { ContenderStructure as ContenderStructureType } from './contender-structure.types'
import {
  isContenderAllowedForTaskSource as isContenderAllowedForTaskSourceFn,
  CONTENDER_STRUCTURE_LABEL as CONTENDER_STRUCTURE_LABEL_MAP,
} from './contender-structure.types'
import type { JudgingMode as JudgingModeType } from './judging-mode.types'
import { isJudgingAllowedForContender as isJudgingAllowedForContenderFn } from './judging-mode.types'
import { getChallengeType as getChallengeTypeFn } from './challenge-type.registry'

// ─── Input shape ─────────────────────────────────────────────────────────────

export interface BattleCreationInput {
  format: BattleFormat | null
  battleType: BattleType
  contentType?: BattleContentType | null
  /** Model output_modalities from ai.models — e.g. ['text', 'image'] */
  modelOutputModalities?: string[]
  voterEligibility?: VoterEligibility
  /** Whether the battle has human contenders (derived from battleType or explicit) */
  hasHumanContenders?: boolean
  /** Lens parameter requirements — keys are param IDs, values indicate if required */
  lensParamRequirements?: Array<{ id: string; label: string; required: boolean }>
  /** Provided lens parameter values — keys are param IDs */
  lensParamValues?: Record<string, unknown>
  /** Lenser Battle policy (only for lenser_battle format) */
  lenserBattlePolicy?: LenserBattlePolicy | null
}

// ─── V2 Input shape (concept separation) ────────────────────────────────────

export interface BattleCreationInputV2 {
  taskSource: TaskSourceType | null
  contenderStructure: ContenderStructureType
  judgingMode: JudgingModeType
  challengeType?: string | null
  contentType?: BattleContentType | null
  modelOutputModalities?: string[]
  voterEligibility?: VoterEligibility
  lensParamRequirements?: Array<{ id: string; label: string; required: boolean }>
  lensParamValues?: Record<string, unknown>
  lenserBattlePolicy?: LenserBattlePolicy | null
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface BattleValidationResult {
  valid: boolean
  violations: BattleViolation[]
  errors: BattleViolation[]
  warnings: BattleViolation[]
}

// ─── Validator ───────────────────────────────────────────────────────────────

export class BattleCreationValidator {
  /**
   * Validates format ↔ type compatibility.
   */
  validateFormatTypeCompatibility(
    format: BattleFormat | null,
    battleType: BattleType,
  ): BattleViolation[] {
    if (isBattleTypeAllowedForFormat(format, battleType)) return []
    const formatLabel = format ? FORMAT_LABEL[format] : 'unknown format'
    return [
      {
        code: 'FORMAT_TYPE_INCOMPATIBLE',
        field: 'battle_type',
        message: `"${battleType}" is not available for ${formatLabel}. Choose a compatible battle type.`,
        severity: 'error',
      },
    ]
  }

  /**
   * Validates that the selected AI model can produce the battle's content type.
   *
   * Skipped when modelOutputModalities is not provided (e.g. model not yet
   * selected, or Lenser Battle where each contender brings their own model).
   */
  validateContentTypeVsModelOutput(
    contentType: BattleContentType | null | undefined,
    modelOutputModalities: string[] | undefined,
  ): BattleViolation[] {
    if (!contentType || !modelOutputModalities || modelOutputModalities.length === 0) return []

    const requiredModality = CONTENT_TYPE_TO_MODALITY[contentType]
    if (!requiredModality) return []

    if (!modelOutputModalities.includes(requiredModality)) {
      return [
        {
          code: 'CONTENT_TYPE_MODEL_INCOMPATIBLE',
          field: 'content_type',
          message: `Content type "${contentType}" requires "${requiredModality}" output, but the selected model only supports: ${modelOutputModalities.join(', ')}.`,
          severity: 'error',
        },
      ]
    }
    return []
  }

  /**
   * Validates that human contenders can produce the expected content type.
   *
   * Emits an error for content types that humans cannot produce through
   * the standard UI (e.g. raw image generation, audio, video).
   */
  validateHumanPerformability(
    battleType: BattleType,
    contentType: BattleContentType | null | undefined,
  ): BattleViolation[] {
    if (!contentType) return []

    const hasHuman = HUMAN_CONTENDER_BATTLE_TYPES.includes(battleType)
    if (!hasHuman) return []

    if (!(HUMAN_PRODUCIBLE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
      const isDrawing = contentType === 'drawing'
      return [
        {
          code: 'CONTENT_TYPE_HUMAN_INCOMPATIBLE',
          field: 'content_type',
          message: isDrawing
            ? `Content type "drawing" requires a drawing/upload UI which is currently experimental. Human contenders may not be able to produce this output.`
            : `Content type "${contentType}" cannot be produced by human contenders through the standard UI. Consider AI vs AI or change the content type.`,
          severity: isDrawing ? 'warning' : 'error',
        },
      ]
    }
    return []
  }

  /**
   * Validates that the judging/voting mode is compatible with the content type.
   *
   * For example, AI-only voting on image content requires an image-capable
   * AI judge, and embedding-type outputs are not directly human-votable.
   */
  validateJudgingVsContentType(
    voterEligibility: VoterEligibility | undefined,
    contentType: BattleContentType | null | undefined,
  ): BattleViolation[] {
    if (!voterEligibility || !contentType) return []

    // AI-only judging of media content is valid but worth noting
    if (voterEligibility === 'ai_only' && ['video', 'audio'].includes(contentType)) {
      return [
        {
          code: 'JUDGING_CONTENT_INCOMPATIBLE',
          field: 'voter_eligibility',
          message: `AI-only judging of "${contentType}" content requires a multimodal AI judge. Ensure the judge model supports ${contentType} input.`,
          severity: 'warning',
        },
      ]
    }

    return []
  }

  /**
   * Validates that all required Lens parameters have values.
   *
   * Only relevant for Lens Battle format. Ensures the shared input snapshot
   * is complete before battle creation.
   */
  validateLensParams(
    lensParamRequirements: Array<{ id: string; label: string; required: boolean }> | undefined,
    lensParamValues: Record<string, unknown> | undefined,
  ): BattleViolation[] {
    if (!lensParamRequirements || lensParamRequirements.length === 0) return []

    const values = lensParamValues ?? {}
    const violations: BattleViolation[] = []

    for (const param of lensParamRequirements) {
      if (!param.required) continue
      const value = values[param.id]
      if (value === undefined || value === null || value === '') {
        violations.push({
          code: 'LENS_PARAMS_INCOMPLETE',
          field: `lens_param.${param.label}`,
          message: `Required Lens parameter "${param.label}" is missing. All contenders must receive the same shared input values.`,
          severity: 'error',
        })
      }
    }

    return violations
  }

  /**
   * Validates the Lenser Battle policy structure.
   */
  validateLenserBattlePolicy(
    format: BattleFormat | null,
    policy: LenserBattlePolicy | null | undefined,
  ): BattleViolation[] {
    if (format !== 'lenser_battle') return []
    if (!policy) return [] // policy is optional, uses defaults

    const violations: BattleViolation[] = []

    if (!(MEMORY_MODES as readonly string[]).includes(policy.memory_mode)) {
      violations.push({
        code: 'LENSER_POLICY_INVALID',
        field: 'lenser_battle_policy.memory_mode',
        message: `Invalid memory mode "${policy.memory_mode}". Must be one of: ${MEMORY_MODES.join(', ')}.`,
        severity: 'error',
      })
    }

    if (!(INSTRUCTION_DISCLOSURES as readonly string[]).includes(policy.instruction_disclosure)) {
      violations.push({
        code: 'LENSER_POLICY_INVALID',
        field: 'lenser_battle_policy.instruction_disclosure',
        message: `Invalid instruction disclosure "${policy.instruction_disclosure}". Must be one of: ${INSTRUCTION_DISCLOSURES.join(', ')}.`,
        severity: 'error',
      })
    }

    return violations
  }

  /**
   * Runs all validation checks and returns a structured result.
   */
  validateAll(input: BattleCreationInput): BattleValidationResult {
    const violations: BattleViolation[] = [
      ...this.validateFormatTypeCompatibility(input.format, input.battleType),
      ...this.validateContentTypeVsModelOutput(input.contentType, input.modelOutputModalities),
      ...this.validateHumanPerformability(input.battleType, input.contentType),
      ...this.validateJudgingVsContentType(input.voterEligibility, input.contentType),
      ...this.validateLensParams(input.lensParamRequirements, input.lensParamValues),
      ...this.validateLenserBattlePolicy(input.format, input.lenserBattlePolicy),
    ]

    const errors = violations.filter((v) => v.severity === 'error')
    const warnings = violations.filter((v) => v.severity === 'warning')

    return {
      valid: errors.length === 0,
      violations,
      errors,
      warnings,
    }
  }

  // ─── V2 validation methods (concept separation refactor) ─────────────────

  /**
   * Validates task source ↔ contender structure compatibility.
   */
  validateTaskSourceContenderCompatibility(
    taskSource: TaskSourceType | null,
    contenderStructure: ContenderStructureType,
  ): BattleViolation[] {
    if (!isContenderAllowedForTaskSourceFn(taskSource, contenderStructure)) {
      const sourceLabel = taskSource
        ? TASK_SOURCE_LABEL_MAP[taskSource]
        : 'unknown task source'
      return [
        {
          code: 'TASK_SOURCE_CONTENDER_INCOMPATIBLE',
          field: 'contender_structure',
          message: `"${contenderStructure}" contenders are not available for ${sourceLabel}. Choose a compatible contender structure.`,
          severity: 'error',
        },
      ]
    }
    return []
  }

  /**
   * Validates contender structure ↔ judging mode compatibility.
   */
  validateContenderJudgingCompatibility(
    contenderStructure: ContenderStructureType | null,
    judgingMode: JudgingModeType,
  ): BattleViolation[] {
    if (!isJudgingAllowedForContenderFn(contenderStructure, judgingMode)) {
      const contenderLabel = contenderStructure
        ? CONTENDER_STRUCTURE_LABEL_MAP[contenderStructure]
        : 'unknown contender structure'
      return [
        {
          code: 'CONTENDER_JUDGING_INCOMPATIBLE',
          field: 'judging_mode',
          message: `"${judgingMode}" judging is not available for ${contenderLabel} battles. Choose a compatible judging mode.`,
          severity: 'error',
        },
      ]
    }
    return []
  }

  /**
   * Validates challenge type selection.
   */
  validateChallengeType(
    taskSource: TaskSourceType | null,
    challengeType: string | null | undefined,
    contenderStructure?: ContenderStructureType,
  ): BattleViolation[] {
    // Only required for challenge task source
    if (taskSource !== 'challenge') return []
    if (!challengeType) {
      return [
        {
          code: 'CHALLENGE_TYPE_INVALID',
          field: 'challenge_type',
          message: 'A challenge type must be selected for Challenge tasks.',
          severity: 'error',
        },
      ]
    }

    const def = getChallengeTypeFn(challengeType)
    if (!def) {
      return [
        {
          code: 'CHALLENGE_TYPE_INVALID',
          field: 'challenge_type',
          message: `Unknown challenge type "${challengeType}".`,
          severity: 'error',
        },
      ]
    }

    if (contenderStructure && !def.allowedContenders.includes(contenderStructure)) {
      return [
        {
          code: 'CHALLENGE_TYPE_CONTENDER_INCOMPATIBLE',
          field: 'challenge_type',
          message: `"${def.label}" does not support ${contenderStructure} contenders.`,
          severity: 'error',
        },
      ]
    }

    return []
  }

  /**
   * Runs all V2 validation checks using the new 3-axis model.
   */
  validateAllV2(input: BattleCreationInputV2): BattleValidationResult {
    const violations: BattleViolation[] = [
      ...this.validateTaskSourceContenderCompatibility(input.taskSource, input.contenderStructure),
      ...this.validateContenderJudgingCompatibility(input.contenderStructure, input.judgingMode),
      ...this.validateChallengeType(input.taskSource, input.challengeType, input.contenderStructure),
      ...this.validateContentTypeVsModelOutput(input.contentType, input.modelOutputModalities),
      ...this.validateHumanPerformability(
        // Map contender structure to a legacy battle type for human performability check
        input.contenderStructure === 'human_vs_human' ? 'human_vs_human_open_votes' : input.contenderStructure === 'human_vs_ai' ? 'human_vs_ai' : 'ai_vs_ai',
        input.contentType,
      ),
      ...this.validateJudgingVsContentType(input.voterEligibility, input.contentType),
      ...this.validateLensParams(input.lensParamRequirements, input.lensParamValues),
      ...this.validateLenserBattlePolicy(
        // Policy is now valid for any task source when AI lensers are present
        input.lenserBattlePolicy ? 'lenser_battle' : null,
        input.lenserBattlePolicy,
      ),
    ]

    const errors = violations.filter((v) => v.severity === 'error')
    const warnings = violations.filter((v) => v.severity === 'warning')

    return {
      valid: errors.length === 0,
      violations,
      errors,
      warnings,
    }
  }
}

/** Singleton instance for convenience. */
export const battleCreationValidator = new BattleCreationValidator()
