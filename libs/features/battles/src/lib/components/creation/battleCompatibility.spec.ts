import {
  type BattleFormat,
  ALL_BATTLE_TYPES,
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
} from './battleCompatibility'
import type { BattleType } from '../../types/battle.types'

describe('battleCompatibility — matrix module', () => {
  const formats: BattleFormat[] = ['workflow', 'lens', 'lenser_battle']

  describe('isBattleTypeAllowedForFormat', () => {
    it('returns true for null format (pre-selection state)', () => {
      ALL_BATTLE_TYPES.forEach((type) => {
        expect(isBattleTypeAllowedForFormat(null, type)).toBe(true)
      })
    })

    it('workflow allows ai_vs_ai, human_vs_ai, workflow_battle', () => {
      expect(isBattleTypeAllowedForFormat('workflow', 'ai_vs_ai')).toBe(true)
      expect(isBattleTypeAllowedForFormat('workflow', 'human_vs_ai')).toBe(true)
      expect(isBattleTypeAllowedForFormat('workflow', 'workflow_battle')).toBe(true)
    })

    it('workflow rejects human-vs-human and lenser_battle types', () => {
      expect(isBattleTypeAllowedForFormat('workflow', 'human_vs_human_open_votes')).toBe(false)
      expect(isBattleTypeAllowedForFormat('workflow', 'human_vs_human_ai_votes')).toBe(false)
      expect(isBattleTypeAllowedForFormat('workflow', 'lenser_battle')).toBe(false)
    })

    it('lens allows ai_vs_ai, human_vs_ai, hvh_open, hvh_ai_votes', () => {
      expect(isBattleTypeAllowedForFormat('lens', 'ai_vs_ai')).toBe(true)
      expect(isBattleTypeAllowedForFormat('lens', 'human_vs_ai')).toBe(true)
      expect(isBattleTypeAllowedForFormat('lens', 'human_vs_human_open_votes')).toBe(true)
      expect(isBattleTypeAllowedForFormat('lens', 'human_vs_human_ai_votes')).toBe(true)
    })

    it('lens rejects workflow_battle and lenser_battle types', () => {
      expect(isBattleTypeAllowedForFormat('lens', 'workflow_battle')).toBe(false)
      expect(isBattleTypeAllowedForFormat('lens', 'lenser_battle')).toBe(false)
    })

    it('lenser_battle format only allows lenser_battle type', () => {
      ALL_BATTLE_TYPES.forEach((type) => {
        expect(isBattleTypeAllowedForFormat('lenser_battle', type)).toBe(type === 'lenser_battle')
      })
    })
  })

  describe('getDefaultBattleTypeForFormat', () => {
    it('returns AI vs AI for workflow and lens (flagship arena framing)', () => {
      expect(getDefaultBattleTypeForFormat('workflow')).toBe('ai_vs_ai')
      expect(getDefaultBattleTypeForFormat('lens')).toBe('ai_vs_ai')
    })

    it('returns lenser_battle for lenser format (only valid option)', () => {
      expect(getDefaultBattleTypeForFormat('lenser_battle')).toBe('lenser_battle')
    })

    it('every recommended default is itself in the allowed set', () => {
      formats.forEach((f) => {
        const def = getDefaultBattleTypeForFormat(f)
        expect(isBattleTypeAllowedForFormat(f, def)).toBe(true)
      })
    })
  })

  describe('getRecommendedBattleType', () => {
    it('returns null when format is null', () => {
      expect(getRecommendedBattleType(null)).toBeNull()
    })

    it('returns same value as getDefaultBattleTypeForFormat for each format', () => {
      formats.forEach((f) => {
        expect(getRecommendedBattleType(f)).toBe(getDefaultBattleTypeForFormat(f))
      })
    })
  })

  describe('getAllowedTypesForFormat', () => {
    it('returns all types when format is null', () => {
      expect(getAllowedTypesForFormat(null)).toEqual(ALL_BATTLE_TYPES)
    })

    it('returns non-empty allowed sets for every format', () => {
      formats.forEach((f) => {
        const list = getAllowedTypesForFormat(f)
        expect(list.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getDisabledReason', () => {
    it('returns null when format is null', () => {
      expect(getDisabledReason(null, 'ai_vs_ai')).toBeNull()
    })

    it('returns null for allowed combinations', () => {
      expect(getDisabledReason('workflow', 'ai_vs_ai')).toBeNull()
      expect(getDisabledReason('lens', 'human_vs_human_open_votes')).toBeNull()
      expect(getDisabledReason('lenser_battle', 'lenser_battle')).toBeNull()
    })

    it('returns user-facing reason including the format label for disallowed pairs', () => {
      const r1 = getDisabledReason('workflow', 'human_vs_human_open_votes')
      expect(r1).toMatch(/Workflow Battle/)
      const r2 = getDisabledReason('lens', 'workflow_battle')
      expect(r2).toMatch(/Lens Battle/)
      const r3 = getDisabledReason('lenser_battle', 'ai_vs_ai')
      expect(r3).toMatch(/Lenser Battle/)
    })
  })

  describe('isExperimentalBattleType', () => {
    it('marks production-grade executors as non-experimental', () => {
      expect(isExperimentalBattleType('ai_vs_ai')).toBe(false)
      expect(isExperimentalBattleType('human_vs_ai')).toBe(false)
    })

    it('marks frontier types as experimental', () => {
      expect(isExperimentalBattleType('human_vs_human_open_votes')).toBe(true)
      expect(isExperimentalBattleType('human_vs_human_ai_votes')).toBe(true)
      expect(isExperimentalBattleType('workflow_battle')).toBe(true)
      expect(isExperimentalBattleType('lenser_battle')).toBe(true)
    })
  })

  describe('isExperimentalBattleFormat', () => {
    it('marks lenser_battle format as experimental', () => {
      expect(isExperimentalBattleFormat('lenser_battle')).toBe(true)
    })

    it('does not mark workflow or lens as experimental', () => {
      expect(isExperimentalBattleFormat('workflow')).toBe(false)
      expect(isExperimentalBattleFormat('lens')).toBe(false)
    })
  })

  describe('getTypeStepCopy', () => {
    it('returns fallback copy when format is null', () => {
      const copy = getTypeStepCopy(null)
      expect(copy.title).toBe('Battle type')
      expect(copy.description).toBeTruthy()
    })

    it('returns format-specific copy for each format', () => {
      const workflow = getTypeStepCopy('workflow')
      const lens = getTypeStepCopy('lens')
      const lenser = getTypeStepCopy('lenser_battle')

      expect(workflow.title).toBe('Choose execution mode')
      expect(lens.title).toBe('Choose competition structure')
      expect(lenser.title).toBe('Choose judging mode')

      // Each format produces a distinct heading — confirms the dynamic-title
      // contract the StepWizard depends on.
      expect(new Set([workflow.title, lens.title, lenser.title]).size).toBe(3)
    })
  })

  describe('isCompatibleCombination — submit-time gate', () => {
    it('is identical to isBattleTypeAllowedForFormat for every (format,type) pair', () => {
      const inputs: Array<[BattleFormat | null, BattleType]> = []
      const allFormats: Array<BattleFormat | null> = [...formats, null]
      allFormats.forEach((f) => {
        ALL_BATTLE_TYPES.forEach((t) => inputs.push([f, t]))
      })
      inputs.forEach(([f, t]) => {
        expect(isCompatibleCombination(f, t)).toBe(isBattleTypeAllowedForFormat(f, t))
      })
    })
  })

  describe('FORMAT_LABEL', () => {
    it('exposes a label for every format', () => {
      formats.forEach((f) => {
        expect(FORMAT_LABEL[f]).toBeTruthy()
      })
    })
  })
})
