import {
  BENCHMARK_GAME_REGISTRY,
  BENCHMARK_GAME_ORDER,
  getBenchmarkGame,
  listBenchmarkGames,
  listBenchmarkGamesForContender,
  isBenchmarkChallengeType,
} from './benchmark-game.registry'
import type { BenchmarkGameDefinition } from './benchmark-game.registry'
import { CONTENDER_STRUCTURES } from './contender-structure.types'
import { TASK_SOURCES } from './task-source.types'
import { JUDGING_MODES } from './judging-mode.types'
import { getChallengeType } from './challenge-type.registry'

describe('benchmark-game.registry', () => {
  const allGames = listBenchmarkGames()

  // ── Registry completeness ─────────────────────────────────────────────────

  it('has exactly 3 benchmark games registered', () => {
    expect(Object.keys(BENCHMARK_GAME_REGISTRY)).toHaveLength(3)
  })

  it('BENCHMARK_GAME_ORDER covers all registered games', () => {
    const registeredKeys = Object.keys(BENCHMARK_GAME_REGISTRY)
    for (const key of registeredKeys) {
      expect(BENCHMARK_GAME_ORDER).toContain(key)
    }
  })

  it('every key in BENCHMARK_GAME_ORDER is in the registry', () => {
    for (const key of BENCHMARK_GAME_ORDER) {
      expect(BENCHMARK_GAME_REGISTRY[key]).toBeDefined()
    }
  })

  // ── Definition completeness ───────────────────────────────────────────────

  describe('BenchmarkGameDefinition completeness', () => {
    it('every game has required fields', () => {
      for (const def of allGames) {
        expect(def.key).toBeTruthy()
        expect(def.displayName).toBeTruthy()
        expect(def.category).toBeTruthy()
        expect(def.description).toBeTruthy()
        expect(def.requiredContenderStructure.length).toBeGreaterThan(0)
        expect(def.requiredJudgingModes.length).toBeGreaterThan(0)
        expect(def.requiredCapabilities.length).toBeGreaterThan(0)
        expect(def.privacyPolicy).toBeDefined()
        expect(def.datasetSchemaVersion).toBeTruthy()
        expect(typeof def.exportEligible).toBe('boolean')
      }
    })

    it('every game has a valid requiredTaskSource', () => {
      for (const def of allGames) {
        expect((TASK_SOURCES as readonly string[]).includes(def.requiredTaskSource)).toBe(true)
      }
    })

    it('every game has valid requiredContenderStructure values', () => {
      for (const def of allGames) {
        for (const cs of def.requiredContenderStructure) {
          expect((CONTENDER_STRUCTURES as readonly string[]).includes(cs)).toBe(true)
        }
      }
    })

    it('every game has valid requiredJudgingModes values', () => {
      for (const def of allGames) {
        for (const mode of def.requiredJudgingModes) {
          expect((JUDGING_MODES as readonly string[]).includes(mode)).toBe(true)
        }
      }
    })

    it('every game has a valid privacyPolicy shape', () => {
      const validPolicies = ['full', 'model_only', 'none']
      for (const def of allGames) {
        expect(validPolicies).toContain(def.privacyPolicy.anonymizationPolicy)
        expect(typeof def.privacyPolicy.maskGeneratorModel).toBe('boolean')
        expect(typeof def.privacyPolicy.revealAnswerKeyAfterScoring).toBe('boolean')
      }
    })

    it('key matches the registry key', () => {
      for (const [key, def] of Object.entries(BENCHMARK_GAME_REGISTRY)) {
        expect(def.key).toBe(key)
      }
    })

    it('every benchmark game key exists in the challenge type registry', () => {
      for (const def of allGames) {
        expect(getChallengeType(def.key)).toBeDefined()
      }
    })
  })

  // ── AI-vs-AI requirement ─────────────────────────────────────────────────

  it('all benchmark games support ai_vs_ai or human_vs_ai (no human-only games)', () => {
    for (const def of allGames) {
      const supportsAI = def.requiredContenderStructure.some(
        (cs) => cs === 'ai_vs_ai' || cs === 'human_vs_ai',
      )
      expect(supportsAI).toBe(true)
    }
  })

  it('all benchmark games require ai_judge (objective scoring for benchmarks)', () => {
    for (const def of allGames) {
      expect(def.requiredJudgingModes).toContain('ai_judge')
    }
  })

  it('all benchmark games use task_source lens', () => {
    for (const def of allGames) {
      expect(def.requiredTaskSource).toBe('lens')
    }
  })

  it('all benchmark games are export eligible', () => {
    for (const def of allGames) {
      expect(def.exportEligible).toBe(true)
    }
  })

  // ── getBenchmarkGame ──────────────────────────────────────────────────────

  describe('getBenchmarkGame', () => {
    it('returns definition for code_completion_benchmark', () => {
      const def = getBenchmarkGame('code_completion_benchmark')
      expect(def).toBeDefined()
      expect(def?.key).toBe('code_completion_benchmark')
      expect(def?.category).toBe('coding')
    })

    it('returns definition for instruction_following_benchmark', () => {
      const def = getBenchmarkGame('instruction_following_benchmark')
      expect(def).toBeDefined()
      expect(def?.category).toBe('instruction')
    })

    it('returns definition for reasoning_benchmark', () => {
      const def = getBenchmarkGame('reasoning_benchmark')
      expect(def).toBeDefined()
      expect(def?.category).toBe('reasoning')
    })

    it('returns undefined for unknown keys', () => {
      expect(getBenchmarkGame('writing_contest')).toBeUndefined()
      expect(getBenchmarkGame('nonexistent')).toBeUndefined()
      expect(getBenchmarkGame('')).toBeUndefined()
    })
  })

  // ── listBenchmarkGames ────────────────────────────────────────────────────

  describe('listBenchmarkGames', () => {
    it('returns all 3 benchmark games', () => {
      expect(listBenchmarkGames()).toHaveLength(3)
    })

    it('returns games in BENCHMARK_GAME_ORDER sequence', () => {
      const keys = listBenchmarkGames().map((g) => g.key)
      expect(keys).toEqual([...BENCHMARK_GAME_ORDER])
    })
  })

  // ── listBenchmarkGamesForContender ────────────────────────────────────────

  describe('listBenchmarkGamesForContender', () => {
    it('returns games that support ai_vs_ai', () => {
      const games = listBenchmarkGamesForContender('ai_vs_ai')
      expect(games.length).toBeGreaterThanOrEqual(2)
      for (const def of games) {
        expect(def.requiredContenderStructure).toContain('ai_vs_ai')
      }
    })

    it('returns games that support human_vs_ai', () => {
      const games = listBenchmarkGamesForContender('human_vs_ai')
      expect(games.length).toBeGreaterThanOrEqual(1)
      for (const def of games) {
        expect(def.requiredContenderStructure).toContain('human_vs_ai')
      }
    })

    it('instruction_following_benchmark is only for ai_vs_ai', () => {
      const forAI = listBenchmarkGamesForContender('ai_vs_ai')
      const forHuman = listBenchmarkGamesForContender('human_vs_human')
      expect(forAI.find((g) => g.key === 'instruction_following_benchmark')).toBeDefined()
      expect(forHuman.find((g) => g.key === 'instruction_following_benchmark')).toBeUndefined()
    })

    it('returns no games for human_vs_human (benchmark games are AI-focused)', () => {
      const games = listBenchmarkGamesForContender('human_vs_human')
      expect(games).toHaveLength(0)
    })
  })

  // ── isBenchmarkChallengeType ──────────────────────────────────────────────

  describe('isBenchmarkChallengeType', () => {
    it('returns true for benchmark game keys', () => {
      expect(isBenchmarkChallengeType('code_completion_benchmark')).toBe(true)
      expect(isBenchmarkChallengeType('instruction_following_benchmark')).toBe(true)
      expect(isBenchmarkChallengeType('reasoning_benchmark')).toBe(true)
    })

    it('returns false for human challenge types', () => {
      expect(isBenchmarkChallengeType('writing_contest')).toBe(false)
      expect(isBenchmarkChallengeType('math_calculation')).toBe(false)
      expect(isBenchmarkChallengeType('grammar_quiz')).toBe(false)
      expect(isBenchmarkChallengeType('debate')).toBe(false)
    })

    it('returns false for unknown or empty keys', () => {
      expect(isBenchmarkChallengeType('nonexistent')).toBe(false)
      expect(isBenchmarkChallengeType('')).toBe(false)
      expect(isBenchmarkChallengeType(null)).toBe(false)
      expect(isBenchmarkChallengeType(undefined)).toBe(false)
    })
  })

  // ── Reuse proof: benchmark games use existing challenge type entries ───────

  describe('reuse: benchmark games extend challenge-type.registry, not replace it', () => {
    it('code_completion_benchmark exists in challenge-type.registry', () => {
      const def = getChallengeType('code_completion_benchmark')
      expect(def).toBeDefined()
      expect(def?.aiCompatible).toBe(true)
    })

    it('challenge-type.registry entry matches benchmark game contender requirements', () => {
      const benchmarkDef = getBenchmarkGame('code_completion_benchmark')!
      const challengeDef = getChallengeType('code_completion_benchmark')!
      for (const cs of benchmarkDef.requiredContenderStructure) {
        expect(challengeDef.allowedContenders).toContain(cs)
      }
    })

    it('human challenge types (writing_contest, math_calculation) are not benchmark games', () => {
      expect(getBenchmarkGame('writing_contest')).toBeUndefined()
      expect(getBenchmarkGame('math_calculation')).toBeUndefined()
      expect(getBenchmarkGame('logic_puzzle')).toBeUndefined()
    })
  })
})
