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
import { getChallengeType as getChallengeTypeFn, challengeTypeRequiresGenerator } from './challenge-type.registry'
import { isBenchmarkChallengeType } from './benchmark-game.registry'

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

export interface GeneratorConfig {
  generatorLensId?: string | null
  generatorModelId?: string | null
  challengeLocked?: boolean
  /** Canonical model key (e.g. 'claude-sonnet-4-6') for benchmark model conflict detection. */
  generatorModelKey?: string | null
}

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
  /** Generator configuration for challenge battles with AI-generated questions. */
  generatorConfig?: GeneratorConfig
  /** Contender lens IDs — used to detect generator-contender identity conflicts. */
  contenderLensIds?: string[]
  /** Contender model keys — used to detect generator-model conflicts in benchmark games. */
  contenderModelKeys?: string[]
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
   * Validates that a challenge generator is configured when required.
   *
   * For challenge task source with human contenders, if the challenge type
   * declares generatorRequirements, the generator lens and model must be set.
   */
  validateGeneratorRequired(
    taskSource: TaskSourceType | null,
    contenderStructure: ContenderStructureType,
    challengeType: string | null | undefined,
    generatorConfig: GeneratorConfig | undefined,
  ): BattleViolation[] {
    if (taskSource !== 'challenge') return []
    if (contenderStructure === 'ai_vs_ai') return []
    if (!challengeType) return []
    if (!challengeTypeRequiresGenerator(challengeType)) return []

    const violations: BattleViolation[] = []

    if (!generatorConfig?.generatorLensId) {
      violations.push({
        code: 'GENERATOR_REQUIRED',
        field: 'generator_lens_id',
        message: 'This challenge type requires an AI question generator. Select a generator Lens.',
        severity: 'error',
      })
    }

    if (!generatorConfig?.generatorModelId) {
      violations.push({
        code: 'GENERATOR_MODEL_MISSING',
        field: 'generator_model_id',
        message: 'A model must be selected for the AI question generator.',
        severity: 'error',
      })
    }

    return violations
  }

  /**
   * Validates that the generator Lens is not the same as a contender's Lens.
   *
   * This prevents information leakage where the AI that generated the question
   * is the same AI competing in the battle (especially in Human vs AI).
   */
  validateGeneratorContenderConflict(
    generatorLensId: string | null | undefined,
    contenderLensIds: string[] | undefined,
  ): BattleViolation[] {
    if (!generatorLensId || !contenderLensIds || contenderLensIds.length === 0) return []

    if (contenderLensIds.includes(generatorLensId)) {
      return [
        {
          code: 'GENERATOR_CONTENDER_CONFLICT',
          field: 'generator_lens_id',
          message: 'The question generator Lens is the same as a contender\'s Lens. This may create an unfair advantage due to information leakage.',
          severity: 'warning',
        },
      ]
    }

    return []
  }

  /**
   * Validates that a generated challenge is locked before battle can start.
   *
   * This is a pre-start check: the challenge must be in 'locked' state
   * (i.e. challengeLocked = true) before the battle transitions to executing.
   */
  validateChallengeLocked(
    taskSource: TaskSourceType | null,
    contenderStructure: ContenderStructureType,
    challengeType: string | null | undefined,
    generatorConfig: GeneratorConfig | undefined,
  ): BattleViolation[] {
    if (taskSource !== 'challenge') return []
    if (contenderStructure === 'ai_vs_ai') return []
    if (!challengeType || !challengeTypeRequiresGenerator(challengeType)) return []

    if (generatorConfig?.generatorLensId && !generatorConfig.challengeLocked) {
      return [
        {
          code: 'CHALLENGE_NOT_LOCKED',
          field: 'generated_challenge',
          message: 'The generated challenge must be locked before the battle can start. Generate and lock the challenge question.',
          severity: 'error',
        },
      ]
    }

    return []
  }

  /**
   * Validates that benchmark AI-vs-AI games do not use community_vote judging.
   *
   * Community voting introduces human subjectivity bias into AI-only benchmark
   * comparisons. AI-vs-AI benchmarks must use ai_judge, rubric_score, or
   * auto_score to ensure reproducible, objective scoring.
   *
   * Only applies when the challenge_type is a registered benchmark game type.
   */
  validateBenchmarkAIvsAIConstraints(
    contenderStructure: ContenderStructureType,
    judgingMode: JudgingModeType,
    challengeType: string | null | undefined,
  ): BattleViolation[] {
    if (contenderStructure !== 'ai_vs_ai') return []
    if (!isBenchmarkChallengeType(challengeType)) return []
    if (judgingMode === 'community_vote') {
      return [
        {
          code: 'BENCHMARK_JUDGING_INCOMPATIBLE',
          field: 'judging_mode',
          message:
            'Community vote is not allowed for AI vs AI benchmark games. ' +
            'Use AI Judge to ensure reproducible, bias-free scoring.',
          severity: 'error',
        },
      ]
    }
    return []
  }

  /**
   * Validates that the generator model key does not match any contender model key.
   *
   * When the same model generates the benchmark question and competes as a contender,
   * it may have a structural advantage (e.g. familiarity with its own output patterns).
   * This is a warning rather than a hard block to allow intentional same-model tests.
   */
  validateBenchmarkModelConflict(
    generatorModelKey: string | null | undefined,
    contenderModelKeys: string[] | undefined,
  ): BattleViolation[] {
    if (!generatorModelKey || !contenderModelKeys || contenderModelKeys.length === 0) return []
    if (contenderModelKeys.includes(generatorModelKey)) {
      return [
        {
          code: 'BENCHMARK_MODEL_CONFLICT',
          field: 'generator_model_key',
          message:
            'The benchmark generator model matches a contender model. ' +
            'This may create an advantage if the model is familiar with its own output patterns.',
          severity: 'warning',
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
      // Generated challenge validation
      ...this.validateGeneratorRequired(
        input.taskSource, input.contenderStructure, input.challengeType, input.generatorConfig,
      ),
      ...this.validateGeneratorContenderConflict(
        input.generatorConfig?.generatorLensId, input.contenderLensIds,
      ),
      ...this.validateChallengeLocked(
        input.taskSource, input.contenderStructure, input.challengeType, input.generatorConfig,
      ),
      // Benchmark game validation
      ...this.validateBenchmarkAIvsAIConstraints(
        input.contenderStructure, input.judgingMode, input.challengeType,
      ),
      ...this.validateBenchmarkModelConflict(
        input.generatorConfig?.generatorModelKey, input.contenderModelKeys,
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
