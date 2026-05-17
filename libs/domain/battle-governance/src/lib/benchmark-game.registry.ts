/**
 * Benchmark Game Registry — GRASP Information Expert.
 *
 * A thin domain layer that defines Benchmark Games as compositions of
 * existing Lens, Workflow, and Battle capabilities. Each entry describes
 * the game's metadata, required axis values, capability requirements,
 * and privacy/export policy.
 *
 * Adding a new benchmark game is a single registry entry.
 * No switch statements. No duplicate execution engines.
 *
 * Architecture notes:
 * - AI-vs-AI benchmark games use task_source='lens' + shared_input_snapshot for fairness.
 * - Human challenge benchmark games use task_source='challenge' + generated_challenges.
 * - Scoring and judging reuse battles.scorecards, battles.ai_judge_verdicts, battles.rubric_criteria.
 * - Execution logging reuses execution.requests/runs/artifacts.
 * - challenge_type on the battle record is the link between a battle and its benchmark game definition.
 */

import type { ContenderStructure } from './contender-structure.types'
import type { TaskSource } from './task-source.types'
import type { JudgingMode } from './judging-mode.types'

// ─── Privacy Policy ──────────────────────────────────────────────────────────

export interface BenchmarkPrivacyPolicy {
  /**
   * Anonymization level in the benchmark dataset export view.
   * - 'full': model_id and judge model_key are NULL in the export.
   * - 'model_only': model_id exposed, judge model masked.
   * - 'none': all identifiers exposed (for transparent public benchmarks).
   */
  anonymizationPolicy: 'full' | 'model_only' | 'none'
  /** Whether the generator model identity is masked in exports. */
  maskGeneratorModel: boolean
  /** Whether the answer key is revealed in the export after scoring. */
  revealAnswerKeyAfterScoring: boolean
}

// ─── Benchmark Game Definition ───────────────────────────────────────────────

export interface BenchmarkGameDefinition {
  /**
   * Unique key that MUST match a `challenge_type` entry in CHALLENGE_TYPE_REGISTRY.
   * This is the link between a battle row and its benchmark game definition.
   */
  key: string
  /** Display name shown in the UI. */
  displayName: string
  /** Thematic category for browsing and filtering. */
  category: 'coding' | 'reasoning' | 'language' | 'instruction' | 'general'
  /** Short description of what the benchmark measures. */
  description: string
  /** Contender structures this benchmark supports. */
  requiredContenderStructure: readonly ContenderStructure[]
  /**
   * Expected task_source for this benchmark game.
   * AI-vs-AI benchmarks use 'lens' (shared_input_snapshot).
   * Human challenge benchmarks use 'challenge' (generated_challenges).
   */
  requiredTaskSource: TaskSource
  /** Judging modes valid for this benchmark (subset of the contender axis matrix). */
  requiredJudgingModes: readonly JudgingMode[]
  /**
   * AI model capability flags required for contenders.
   * These come from AICapabilityEnum in generation.types.ts.
   * Examples: 'chat', 'code', 'reasoning', 'tools', 'vision'.
   */
  requiredCapabilities: readonly string[]
  /** Privacy and export policy for this benchmark's dataset entries. */
  privacyPolicy: BenchmarkPrivacyPolicy
  /** Whether completed battles are eligible for the benchmark dataset export view. */
  exportEligible: boolean
  /** Schema version string for the benchmark dataset format. Increment on breaking changes. */
  datasetSchemaVersion: string
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const BENCHMARK_GAME_REGISTRY: Record<string, BenchmarkGameDefinition> = {
  code_completion_benchmark: {
    key: 'code_completion_benchmark',
    displayName: 'Code Completion Benchmark',
    category: 'coding',
    description:
      'Measures how accurately and idiomatically AI models complete partial code snippets. ' +
      'Evaluates correctness, style, efficiency, and edge-case handling.',
    requiredContenderStructure: ['ai_vs_ai', 'human_vs_ai'],
    requiredTaskSource: 'lens',
    requiredJudgingModes: ['ai_judge'],
    requiredCapabilities: ['chat', 'code'],
    privacyPolicy: {
      anonymizationPolicy: 'model_only',
      maskGeneratorModel: false,
      revealAnswerKeyAfterScoring: true,
    },
    exportEligible: true,
    datasetSchemaVersion: '1.0',
  },

  instruction_following_benchmark: {
    key: 'instruction_following_benchmark',
    displayName: 'Instruction Following Benchmark',
    category: 'instruction',
    description:
      'Measures how precisely AI models follow multi-constraint natural language instructions. ' +
      'Evaluates constraint adherence, completeness, and output quality.',
    requiredContenderStructure: ['ai_vs_ai'],
    requiredTaskSource: 'lens',
    requiredJudgingModes: ['ai_judge'],
    requiredCapabilities: ['chat'],
    privacyPolicy: {
      anonymizationPolicy: 'model_only',
      maskGeneratorModel: false,
      revealAnswerKeyAfterScoring: false,
    },
    exportEligible: true,
    datasetSchemaVersion: '1.0',
  },

  reasoning_benchmark: {
    key: 'reasoning_benchmark',
    displayName: 'Reasoning Benchmark',
    category: 'reasoning',
    description:
      'Measures logical, analytical, and deductive reasoning capabilities of AI models. ' +
      'Evaluates accuracy of final answer and quality of the reasoning chain.',
    requiredContenderStructure: ['ai_vs_ai', 'human_vs_ai'],
    requiredTaskSource: 'lens',
    requiredJudgingModes: ['ai_judge'],
    requiredCapabilities: ['chat', 'reasoning'],
    privacyPolicy: {
      anonymizationPolicy: 'model_only',
      maskGeneratorModel: false,
      revealAnswerKeyAfterScoring: true,
    },
    exportEligible: true,
    datasetSchemaVersion: '1.0',
  },
}

// ─── Stable display ordering ─────────────────────────────────────────────────

export const BENCHMARK_GAME_ORDER: readonly string[] = [
  'code_completion_benchmark',
  'instruction_following_benchmark',
  'reasoning_benchmark',
]

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Get a benchmark game definition by its key. Returns undefined if not a benchmark game. */
export function getBenchmarkGame(key: string): BenchmarkGameDefinition | undefined {
  return BENCHMARK_GAME_REGISTRY[key]
}

/** List all benchmark game definitions in display order. */
export function listBenchmarkGames(): BenchmarkGameDefinition[] {
  return BENCHMARK_GAME_ORDER
    .map((key) => BENCHMARK_GAME_REGISTRY[key])
    .filter((def): def is BenchmarkGameDefinition => def !== undefined)
}

/** List benchmark games valid for a given contender structure. */
export function listBenchmarkGamesForContender(
  structure: ContenderStructure,
): BenchmarkGameDefinition[] {
  return listBenchmarkGames().filter((def) =>
    def.requiredContenderStructure.includes(structure),
  )
}

/**
 * Whether a challenge_type key belongs to the benchmark game registry.
 *
 * Used by validators to apply benchmark-specific rules (e.g. blocking
 * community_vote for AI-only benchmarks).
 */
export function isBenchmarkChallengeType(challengeType: string | null | undefined): boolean {
  if (!challengeType) return false
  return challengeType in BENCHMARK_GAME_REGISTRY
}
