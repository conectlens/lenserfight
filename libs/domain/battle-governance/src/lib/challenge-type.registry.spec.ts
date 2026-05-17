import {
  CHALLENGE_TYPE_REGISTRY,
  CHALLENGE_TYPE_ORDER,
  getChallengeType,
  listChallengeTypeDefinitions,
  listAvailableChallengeTypes,
  listChallengeTypesForContender,
  challengeTypeRequiresGenerator,
} from './challenge-type.registry'
import { BATTLE_CONTENT_TYPES } from './battle.constants'
import { CONTENDER_STRUCTURES } from './contender-structure.types'
import { JUDGING_MODES } from './judging-mode.types'

describe('challenge-type.registry', () => {
  const allDefs = listChallengeTypeDefinitions()

  it('has at least 9 challenge types registered', () => {
    expect(Object.keys(CHALLENGE_TYPE_REGISTRY).length).toBeGreaterThanOrEqual(9)
  })

  it('CHALLENGE_TYPE_ORDER covers all registered types', () => {
    const registeredIds = Object.keys(CHALLENGE_TYPE_REGISTRY)
    for (const id of registeredIds) {
      expect(CHALLENGE_TYPE_ORDER).toContain(id)
    }
  })

  it('every type in CHALLENGE_TYPE_ORDER is in the registry', () => {
    for (const id of CHALLENGE_TYPE_ORDER) {
      expect(CHALLENGE_TYPE_REGISTRY[id]).toBeDefined()
    }
  })

  describe('ChallengeTypeDefinition completeness', () => {
    it('every type has required fields', () => {
      for (const def of allDefs) {
        expect(def.id).toBeTruthy()
        expect(def.label).toBeTruthy()
        expect(def.description).toBeTruthy()
        expect(def.icon).toBeTruthy()
        expect(def.badgeColor).toBeTruthy()
        expect(def.allowedContenders.length).toBeGreaterThan(0)
        expect(def.scoringOptions.length).toBeGreaterThan(0)
        expect(typeof def.humanUIRequired).toBe('boolean')
        expect(typeof def.aiCompatible).toBe('boolean')
        expect(typeof def.localeDependent).toBe('boolean')
        expect(typeof def.implemented).toBe('boolean')
      }
    })

    it('every type has a valid outputType', () => {
      for (const def of allDefs) {
        expect((BATTLE_CONTENT_TYPES as readonly string[]).includes(def.outputType)).toBe(true)
      }
    })

    it('every type has valid allowedContenders', () => {
      for (const def of allDefs) {
        for (const cs of def.allowedContenders) {
          expect((CONTENDER_STRUCTURES as readonly string[]).includes(cs)).toBe(true)
        }
      }
    })

    it('every type has valid scoringOptions', () => {
      for (const def of allDefs) {
        for (const mode of def.scoringOptions) {
          expect((JUDGING_MODES as readonly string[]).includes(mode)).toBe(true)
        }
      }
    })

    it('id matches the registry key', () => {
      for (const [key, def] of Object.entries(CHALLENGE_TYPE_REGISTRY)) {
        expect(def.id).toBe(key)
      }
    })
  })

  describe('getChallengeType', () => {
    it('returns the definition for a valid id', () => {
      expect(getChallengeType('writing_contest')).toBeDefined()
      expect(getChallengeType('writing_contest')?.label).toBe('Writing Contest')
    })

    it('returns undefined for an invalid id', () => {
      expect(getChallengeType('nonexistent')).toBeUndefined()
    })
  })

  describe('listChallengeTypeDefinitions', () => {
    it('returns all types in CHALLENGE_TYPE_ORDER sequence', () => {
      const ids = allDefs.map((d) => d.id)
      expect(ids).toEqual([...CHALLENGE_TYPE_ORDER])
    })
  })

  describe('listAvailableChallengeTypes', () => {
    it('returns only implemented types', () => {
      const available = listAvailableChallengeTypes()
      for (const def of available) {
        expect(def.implemented).toBe(true)
      }
    })

    it('includes writing_contest, math_calculation, grammar_quiz', () => {
      const ids = listAvailableChallengeTypes().map((d) => d.id)
      expect(ids).toContain('writing_contest')
      expect(ids).toContain('math_calculation')
      expect(ids).toContain('grammar_quiz')
    })
  })

  describe('listChallengeTypesForContender', () => {
    it('returns types that include the given contender', () => {
      const hvh = listChallengeTypesForContender('human_vs_human')
      for (const def of hvh) {
        expect(def.allowedContenders).toContain('human_vs_human')
      }
    })

    it('prompt_duel is only human_vs_human', () => {
      const hvh = listChallengeTypesForContender('human_vs_human')
      const hva = listChallengeTypesForContender('human_vs_ai')
      expect(hvh.find((d) => d.id === 'prompt_duel')).toBeDefined()
      expect(hva.find((d) => d.id === 'prompt_duel')).toBeUndefined()
    })
  })

  // ── Benchmark game types ───────────────────────────────────────────────────

  describe('benchmark game types in registry', () => {
    const BENCHMARK_TYPES = [
      'code_completion_benchmark',
      'instruction_following_benchmark',
      'reasoning_benchmark',
    ] as const

    it('all 3 benchmark types exist in the registry', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(getChallengeType(id)).toBeDefined()
      }
    })

    it('benchmark types are included in CHALLENGE_TYPE_ORDER', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(CHALLENGE_TYPE_ORDER).toContain(id)
      }
    })

    it('benchmark types are implemented (playable)', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(getChallengeType(id)?.implemented).toBe(true)
      }
    })

    it('benchmark types support ai_vs_ai in allowedContenders', () => {
      // instruction_following_benchmark is ai_vs_ai only
      expect(getChallengeType('instruction_following_benchmark')?.allowedContenders).toContain('ai_vs_ai')
      // code_completion and reasoning support both ai_vs_ai and human_vs_ai
      expect(getChallengeType('code_completion_benchmark')?.allowedContenders).toContain('ai_vs_ai')
      expect(getChallengeType('reasoning_benchmark')?.allowedContenders).toContain('ai_vs_ai')
    })

    it('benchmark types are AI compatible', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(getChallengeType(id)?.aiCompatible).toBe(true)
      }
    })

    it('benchmark types do not require a human UI', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(getChallengeType(id)?.humanUIRequired).toBe(false)
      }
    })

    it('benchmark types have generator requirements defined', () => {
      for (const id of BENCHMARK_TYPES) {
        expect(challengeTypeRequiresGenerator(id)).toBe(true)
      }
    })

    it('existing human challenge types are unchanged', () => {
      // Regression: original 9 types still exist and are correct
      expect(getChallengeType('writing_contest')?.allowedContenders).not.toContain('ai_vs_ai')
      expect(getChallengeType('math_calculation')?.implemented).toBe(true)
      expect(getChallengeType('grammar_quiz')?.localeDependent).toBe(true)
      expect(getChallengeType('debate')?.implemented).toBe(false)
      expect(getChallengeType('prompt_duel')?.aiCompatible).toBe(false)
    })

    it('instruction_following_benchmark is only for ai_vs_ai (no human contenders)', () => {
      const def = getChallengeType('instruction_following_benchmark')!
      expect(def.allowedContenders).not.toContain('human_vs_human')
      expect(def.allowedContenders).not.toContain('human_vs_ai')
    })

    it('benchmark types do not appear in human-only contender queries', () => {
      const hvhTypes = listChallengeTypesForContender('human_vs_human')
      const hvhIds = hvhTypes.map((d) => d.id)
      for (const id of BENCHMARK_TYPES) {
        expect(hvhIds).not.toContain(id)
      }
    })

    it('total registry size is 12 (9 original + 3 benchmark)', () => {
      expect(Object.keys(CHALLENGE_TYPE_REGISTRY)).toHaveLength(12)
      expect(CHALLENGE_TYPE_ORDER).toHaveLength(12)
    })
  })
})
