import {
  resolveToLegacyBattleType,
  decomposeFromLegacyBattleType,
  type LegacyTypeInput,
} from './legacy-type-mapper'
import { BATTLE_TYPES, type BattleType } from './battle.constants'
import { CONTENDER_STRUCTURES } from './contender-structure.types'
import { JUDGING_MODES } from './judging-mode.types'
import { TASK_SOURCES } from './task-source.types'

describe('legacy-type-mapper', () => {
  describe('resolveToLegacyBattleType', () => {
    it('maps ai_vs_ai + community_vote to ai_vs_ai', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
      })).toBe('ai_vs_ai')
    })

    it('maps human_vs_human + community_vote to human_vs_human_open_votes', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'human_vs_human',
        judgingMode: 'community_vote',
      })).toBe('human_vs_human_open_votes')
    })

    it('maps human_vs_human + ai_judge to human_vs_human_ai_votes', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'human_vs_human',
        judgingMode: 'ai_judge',
      })).toBe('human_vs_human_ai_votes')
    })

    it('maps human_vs_ai + any judging to human_vs_ai', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'human_vs_ai',
        judgingMode: 'community_vote',
      })).toBe('human_vs_ai')
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'human_vs_ai',
        judgingMode: 'ai_judge',
      })).toBe('human_vs_ai')
    })

    it('maps workflow task source to workflow_battle', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'workflow',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
      })).toBe('workflow_battle')
    })

    it('maps lenser policy present to lenser_battle', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'lens',
        contenderStructure: 'ai_vs_ai',
        judgingMode: 'community_vote',
        lenserPolicy: {
          memory_mode: 'personality',
          instruction_disclosure: 'visible_after_close',
          model_binding_override: false,
        },
      })).toBe('lenser_battle')
    })

    it('lenser policy on challenge task source does NOT map to lenser_battle', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'challenge',
        contenderStructure: 'human_vs_human',
        judgingMode: 'community_vote',
        lenserPolicy: {
          memory_mode: 'personality',
          instruction_disclosure: 'visible_after_close',
          model_binding_override: false,
        },
      })).toBe('human_vs_human_open_votes')
    })

    it('challenge task source + human_vs_human + auto_score maps to human_vs_human_open_votes', () => {
      expect(resolveToLegacyBattleType({
        taskSource: 'challenge',
        contenderStructure: 'human_vs_human',
        judgingMode: 'auto_score',
      })).toBe('human_vs_human_open_votes')
    })

    it('every output is a valid BattleType', () => {
      for (const ts of TASK_SOURCES) {
        for (const cs of CONTENDER_STRUCTURES) {
          for (const jm of JUDGING_MODES) {
            const result = resolveToLegacyBattleType({
              taskSource: ts,
              contenderStructure: cs,
              judgingMode: jm,
            })
            expect((BATTLE_TYPES as readonly string[]).includes(result)).toBe(true)
          }
        }
      }
    })
  })

  describe('decomposeFromLegacyBattleType', () => {
    it('decomposes ai_vs_ai correctly', () => {
      const result = decomposeFromLegacyBattleType('ai_vs_ai')
      expect(result.contenderStructure).toBe('ai_vs_ai')
      expect(result.judgingMode).toBe('community_vote')
    })

    it('decomposes human_vs_human_open_votes correctly', () => {
      const result = decomposeFromLegacyBattleType('human_vs_human_open_votes')
      expect(result.contenderStructure).toBe('human_vs_human')
      expect(result.judgingMode).toBe('community_vote')
    })

    it('decomposes human_vs_human_ai_votes correctly', () => {
      const result = decomposeFromLegacyBattleType('human_vs_human_ai_votes')
      expect(result.contenderStructure).toBe('human_vs_human')
      expect(result.judgingMode).toBe('ai_judge')
    })

    it('decomposes human_vs_ai correctly', () => {
      const result = decomposeFromLegacyBattleType('human_vs_ai')
      expect(result.contenderStructure).toBe('human_vs_ai')
      expect(result.judgingMode).toBe('community_vote')
    })

    it('decomposes workflow_battle correctly', () => {
      const result = decomposeFromLegacyBattleType('workflow_battle')
      expect(result.taskSource).toBe('workflow')
      expect(result.contenderStructure).toBe('ai_vs_ai')
    })

    it('decomposes lenser_battle correctly', () => {
      const result = decomposeFromLegacyBattleType('lenser_battle')
      expect(result.contenderStructure).toBe('ai_vs_ai')
      expect(result.judgingMode).toBe('community_vote')
    })

    it('uses workflow context when workflowId is present', () => {
      const result = decomposeFromLegacyBattleType('ai_vs_ai', { workflowId: 'wf-123' })
      expect(result.taskSource).toBe('workflow')
    })

    it('uses challenge context when challengeType is present', () => {
      const result = decomposeFromLegacyBattleType('human_vs_human_open_votes', { challengeType: 'math_calculation' })
      expect(result.taskSource).toBe('challenge')
    })

    it('defaults to lens task source when no context', () => {
      const result = decomposeFromLegacyBattleType('ai_vs_ai')
      expect(result.taskSource).toBe('lens')
    })
  })

  describe('round-trip consistency', () => {
    const simpleCases: Array<{ input: LegacyTypeInput; expectedType: BattleType }> = [
      { input: { taskSource: 'lens', contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }, expectedType: 'ai_vs_ai' },
      { input: { taskSource: 'lens', contenderStructure: 'human_vs_human', judgingMode: 'community_vote' }, expectedType: 'human_vs_human_open_votes' },
      { input: { taskSource: 'lens', contenderStructure: 'human_vs_human', judgingMode: 'ai_judge' }, expectedType: 'human_vs_human_ai_votes' },
      { input: { taskSource: 'lens', contenderStructure: 'human_vs_ai', judgingMode: 'community_vote' }, expectedType: 'human_vs_ai' },
      { input: { taskSource: 'workflow', contenderStructure: 'ai_vs_ai', judgingMode: 'community_vote' }, expectedType: 'workflow_battle' },
    ]

    it.each(simpleCases)('resolves $expectedType and decomposes back', ({ input, expectedType }) => {
      const legacy = resolveToLegacyBattleType(input)
      expect(legacy).toBe(expectedType)

      const decomposed = decomposeFromLegacyBattleType(legacy, {
        workflowId: input.taskSource === 'workflow' ? 'wf-123' : null,
      })
      expect(decomposed.contenderStructure).toBe(input.contenderStructure)
    })
  })
})
