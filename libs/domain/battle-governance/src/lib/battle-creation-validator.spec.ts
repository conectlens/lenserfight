import { BattleCreationValidator, type BattleCreationInput } from './battle-creation-validator'
import type { BattleContentType, BattleFormat, BattleType } from './battle.constants'
import type { LenserBattlePolicy } from './lenser-battle-policy.types'

describe('BattleCreationValidator', () => {
  const validator = new BattleCreationValidator()

  // ── Format-Type compatibility ────────────────────────────────────────────

  describe('validateFormatTypeCompatibility', () => {
    it('returns no violations for valid format-type pairs', () => {
      expect(validator.validateFormatTypeCompatibility('workflow', 'ai_vs_ai')).toHaveLength(0)
      expect(validator.validateFormatTypeCompatibility('lens', 'human_vs_ai')).toHaveLength(0)
      expect(validator.validateFormatTypeCompatibility('lenser_battle', 'lenser_battle')).toHaveLength(0)
      expect(validator.validateFormatTypeCompatibility(null, 'ai_vs_ai')).toHaveLength(0)
    })

    it('returns error for incompatible format-type pairs', () => {
      const violations = validator.validateFormatTypeCompatibility('workflow', 'lenser_battle')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('FORMAT_TYPE_INCOMPATIBLE')
      expect(violations[0].severity).toBe('error')
      expect(violations[0].message).toContain('Workflow Battle')
    })

    it('lens format rejects workflow_battle', () => {
      const violations = validator.validateFormatTypeCompatibility('lens', 'workflow_battle')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('FORMAT_TYPE_INCOMPATIBLE')
    })

    it('lenser_battle format rejects ai_vs_ai', () => {
      const violations = validator.validateFormatTypeCompatibility('lenser_battle', 'ai_vs_ai')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('FORMAT_TYPE_INCOMPATIBLE')
    })
  })

  // ── Content type vs model output ─────────────────────────────────────────

  describe('validateContentTypeVsModelOutput', () => {
    it('returns no violations when model supports required modality', () => {
      expect(validator.validateContentTypeVsModelOutput('text', ['text', 'image'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('image', ['text', 'image'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('code', ['text'])).toHaveLength(0)
    })

    it('returns error when model cannot produce required modality', () => {
      const violations = validator.validateContentTypeVsModelOutput('image', ['text'])
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('CONTENT_TYPE_MODEL_INCOMPATIBLE')
      expect(violations[0].severity).toBe('error')
      expect(violations[0].message).toContain('image')
    })

    it('returns no violations when contentType is null', () => {
      expect(validator.validateContentTypeVsModelOutput(null, ['text'])).toHaveLength(0)
    })

    it('returns no violations when modelOutputModalities is undefined', () => {
      expect(validator.validateContentTypeVsModelOutput('text', undefined)).toHaveLength(0)
    })

    it('maps code content type to text modality', () => {
      expect(validator.validateContentTypeVsModelOutput('code', ['text'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('code', ['image'])).toHaveLength(1)
    })

    it('maps drawing content type to image modality', () => {
      expect(validator.validateContentTypeVsModelOutput('drawing', ['image'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('drawing', ['text'])).toHaveLength(1)
    })

    it('validates video and audio content types', () => {
      expect(validator.validateContentTypeVsModelOutput('video', ['video'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('video', ['text'])).toHaveLength(1)
      expect(validator.validateContentTypeVsModelOutput('audio', ['audio'])).toHaveLength(0)
      expect(validator.validateContentTypeVsModelOutput('audio', ['text'])).toHaveLength(1)
    })
  })

  // ── Human performability ─────────────────────────────────────────────────

  describe('validateHumanPerformability', () => {
    it('returns no violations for AI-only battle types', () => {
      expect(validator.validateHumanPerformability('ai_vs_ai', 'image')).toHaveLength(0)
      expect(validator.validateHumanPerformability('workflow_battle', 'video')).toHaveLength(0)
      expect(validator.validateHumanPerformability('lenser_battle', 'audio')).toHaveLength(0)
    })

    it('returns no violations for human-producible content types', () => {
      expect(validator.validateHumanPerformability('human_vs_ai', 'text')).toHaveLength(0)
      expect(validator.validateHumanPerformability('human_vs_human_open_votes', 'code')).toHaveLength(0)
      expect(validator.validateHumanPerformability('human_vs_human_ai_votes', 'poem')).toHaveLength(0)
    })

    it('returns error for human battles with image content type', () => {
      const violations = validator.validateHumanPerformability('human_vs_ai', 'image')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('CONTENT_TYPE_HUMAN_INCOMPATIBLE')
      expect(violations[0].severity).toBe('error')
    })

    it('returns error for human battles with video content type', () => {
      const violations = validator.validateHumanPerformability('human_vs_human_open_votes', 'video')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('CONTENT_TYPE_HUMAN_INCOMPATIBLE')
      expect(violations[0].severity).toBe('error')
    })

    it('returns error for human battles with audio content type', () => {
      const violations = validator.validateHumanPerformability('human_vs_ai', 'audio')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('CONTENT_TYPE_HUMAN_INCOMPATIBLE')
      expect(violations[0].severity).toBe('error')
    })

    it('returns warning for human battles with drawing content type', () => {
      const violations = validator.validateHumanPerformability('human_vs_ai', 'drawing')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('CONTENT_TYPE_HUMAN_INCOMPATIBLE')
      expect(violations[0].severity).toBe('warning')
    })

    it('returns no violations when contentType is null', () => {
      expect(validator.validateHumanPerformability('human_vs_ai', null)).toHaveLength(0)
    })
  })

  // ── Judging vs content type ──────────────────────────────────────────────

  describe('validateJudgingVsContentType', () => {
    it('returns no violations for standard combinations', () => {
      expect(validator.validateJudgingVsContentType('open', 'text')).toHaveLength(0)
      expect(validator.validateJudgingVsContentType('verified_lenser', 'image')).toHaveLength(0)
      expect(validator.validateJudgingVsContentType('ai_only', 'text')).toHaveLength(0)
    })

    it('returns warning for ai_only judging of video content', () => {
      const violations = validator.validateJudgingVsContentType('ai_only', 'video')
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('JUDGING_CONTENT_INCOMPATIBLE')
      expect(violations[0].severity).toBe('warning')
    })

    it('returns warning for ai_only judging of audio content', () => {
      const violations = validator.validateJudgingVsContentType('ai_only', 'audio')
      expect(violations).toHaveLength(1)
      expect(violations[0].severity).toBe('warning')
    })

    it('returns no violations when inputs are null/undefined', () => {
      expect(validator.validateJudgingVsContentType(undefined, 'text')).toHaveLength(0)
      expect(validator.validateJudgingVsContentType('open', null)).toHaveLength(0)
    })
  })

  // ── Lens parameter validation ────────────────────────────────────────────

  describe('validateLensParams', () => {
    const params = [
      { id: 'p1', label: 'topic', required: true },
      { id: 'p2', label: 'tone', required: true },
      { id: 'p3', label: 'reference', required: false },
    ]

    it('returns no violations when all required params are provided', () => {
      const values = { p1: 'AI productivity', p2: 'technical' }
      expect(validator.validateLensParams(params, values)).toHaveLength(0)
    })

    it('returns violations for missing required params', () => {
      const values = { p1: 'AI productivity' }
      const violations = validator.validateLensParams(params, values)
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('LENS_PARAMS_INCOMPLETE')
      expect(violations[0].field).toContain('tone')
    })

    it('returns violations for all missing required params', () => {
      const violations = validator.validateLensParams(params, {})
      expect(violations).toHaveLength(2)
    })

    it('ignores optional params', () => {
      const values = { p1: 'topic', p2: 'tone' }
      expect(validator.validateLensParams(params, values)).toHaveLength(0)
    })

    it('treats empty string as missing', () => {
      const values = { p1: '', p2: 'tone' }
      const violations = validator.validateLensParams(params, values)
      expect(violations).toHaveLength(1)
      expect(violations[0].field).toContain('topic')
    })

    it('returns no violations when no params required', () => {
      expect(validator.validateLensParams(undefined, undefined)).toHaveLength(0)
      expect(validator.validateLensParams([], {})).toHaveLength(0)
    })
  })

  // ── Lenser Battle policy validation ──────────────────────────────────────

  describe('validateLenserBattlePolicy', () => {
    it('returns no violations for valid policy', () => {
      const policy: LenserBattlePolicy = {
        memory_mode: 'personality',
        instruction_disclosure: 'visible_after_close',
        model_binding_override: false,
      }
      expect(validator.validateLenserBattlePolicy('lenser_battle', policy)).toHaveLength(0)
    })

    it('returns no violations for non-lenser formats', () => {
      const policy = { memory_mode: 'invalid' as any, instruction_disclosure: 'bad' as any, model_binding_override: false }
      expect(validator.validateLenserBattlePolicy('lens', policy)).toHaveLength(0)
      expect(validator.validateLenserBattlePolicy('workflow', policy)).toHaveLength(0)
    })

    it('returns no violations when policy is null', () => {
      expect(validator.validateLenserBattlePolicy('lenser_battle', null)).toHaveLength(0)
    })

    it('returns error for invalid memory_mode', () => {
      const policy = { memory_mode: 'invalid' as any, instruction_disclosure: 'hidden', model_binding_override: false }
      const violations = validator.validateLenserBattlePolicy('lenser_battle', policy)
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('LENSER_POLICY_INVALID')
      expect(violations[0].field).toContain('memory_mode')
    })

    it('returns error for invalid instruction_disclosure', () => {
      const policy = { memory_mode: 'clean_room', instruction_disclosure: 'bad' as any, model_binding_override: false }
      const violations = validator.validateLenserBattlePolicy('lenser_battle', policy)
      expect(violations).toHaveLength(1)
      expect(violations[0].code).toBe('LENSER_POLICY_INVALID')
      expect(violations[0].field).toContain('instruction_disclosure')
    })

    it('validates all memory modes', () => {
      for (const mode of ['clean_room', 'personality', 'unrestricted'] as const) {
        const policy: LenserBattlePolicy = { memory_mode: mode, instruction_disclosure: 'hidden', model_binding_override: false }
        expect(validator.validateLenserBattlePolicy('lenser_battle', policy)).toHaveLength(0)
      }
    })

    it('validates all instruction disclosures', () => {
      for (const disclosure of ['hidden', 'visible_after_close', 'always_visible'] as const) {
        const policy: LenserBattlePolicy = { memory_mode: 'clean_room', instruction_disclosure: disclosure, model_binding_override: false }
        expect(validator.validateLenserBattlePolicy('lenser_battle', policy)).toHaveLength(0)
      }
    })
  })

  // ── validateAll integration ──────────────────────────────────────────────

  describe('validateAll', () => {
    it('returns valid for a correct ai_vs_ai lens battle', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'ai_vs_ai',
        contentType: 'text',
        modelOutputModalities: ['text'],
        voterEligibility: 'open',
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('catches format-type incompatibility', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'workflow_battle',
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'FORMAT_TYPE_INCOMPATIBLE')).toBe(true)
    })

    it('catches model output incompatibility', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'ai_vs_ai',
        contentType: 'image',
        modelOutputModalities: ['text'],
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'CONTENT_TYPE_MODEL_INCOMPATIBLE')).toBe(true)
    })

    it('catches human performability issue for human_vs_ai + video', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'human_vs_ai',
        contentType: 'video',
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'CONTENT_TYPE_HUMAN_INCOMPATIBLE')).toBe(true)
    })

    it('collects warnings without making result invalid', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'human_vs_ai',
        contentType: 'drawing',
      }
      const result = validator.validateAll(input)
      // drawing is a warning, not an error
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('CONTENT_TYPE_HUMAN_INCOMPATIBLE')
    })

    it('validates lens params when provided', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'ai_vs_ai',
        lensParamRequirements: [
          { id: 'p1', label: 'topic', required: true },
        ],
        lensParamValues: {},
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'LENS_PARAMS_INCOMPLETE')).toBe(true)
    })

    it('validates lenser battle policy when provided', () => {
      const input: BattleCreationInput = {
        format: 'lenser_battle',
        battleType: 'lenser_battle',
        lenserBattlePolicy: {
          memory_mode: 'invalid' as any,
          instruction_disclosure: 'hidden',
          model_binding_override: false,
        },
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'LENSER_POLICY_INVALID')).toBe(true)
    })

    it('accumulates multiple violations from different validators', () => {
      const input: BattleCreationInput = {
        format: 'lens',
        battleType: 'workflow_battle', // incompatible with lens format
        contentType: 'image',
        modelOutputModalities: ['text'], // can't produce image
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('returns valid result with empty violations for minimal valid input', () => {
      const input: BattleCreationInput = {
        format: null,
        battleType: 'ai_vs_ai',
      }
      const result = validator.validateAll(input)
      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  // ── V2 validateAllV2 ────────────────────────────────────────────────────

  describe('validateAllV2', () => {
    it('returns valid for lens + ai_vs_ai + community_vote', () => {
      const result = validator.validateAllV2({
        taskSource: 'lens',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('catches task source / contender incompatibility', () => {
      const result = validator.validateAllV2({
        taskSource: 'challenge',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'TASK_SOURCE_CONTENDER_INCOMPATIBLE')).toBe(true)
    })

    it('catches contender / judging incompatibility', () => {
      const result = validator.validateAllV2({
        taskSource: 'lens',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'auto_score',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'CONTENDER_JUDGING_INCOMPATIBLE')).toBe(true)
    })

    it('catches missing challenge type for challenge task source', () => {
      const result = validator.validateAllV2({
        taskSource: 'challenge',
        contenderStructure: 'human_vs_human',
        judgingMode: 'community_vote',
        challengeType: null,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'CHALLENGE_TYPE_INVALID')).toBe(true)
    })

    it('catches invalid challenge type', () => {
      const result = validator.validateAllV2({
        taskSource: 'challenge',
        contenderStructure: 'human_vs_human',
        judgingMode: 'community_vote',
        challengeType: 'nonexistent_game',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'CHALLENGE_TYPE_INVALID')).toBe(true)
    })

    it('validates challenge + human_vs_human + auto_score as valid', () => {
      const result = validator.validateAllV2({
        taskSource: 'challenge',
        contenderStructure: 'human_vs_human',
        judgingMode: 'auto_score',
        challengeType: 'math_calculation',
      })
      expect(result.valid).toBe(true)
    })

    it('validates lenser policy on any task source', () => {
      const result = validator.validateAllV2({
        taskSource: 'lens',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
        lenserBattlePolicy: {
          memory_mode: 'invalid' as any,
          instruction_disclosure: 'hidden',
          model_binding_override: false,
        },
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'LENSER_POLICY_INVALID')).toBe(true)
    })
  })
})
