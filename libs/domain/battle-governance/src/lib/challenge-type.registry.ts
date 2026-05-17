/**
 * Challenge Type Registry — GRASP Information Expert.
 *
 * Declarative registry of human-friendly game/challenge types for battles.
 * Each entry defines metadata, constraints, and UI hints. Adding a new
 * challenge type is a single registry entry — no switch statements needed.
 *
 * Follows the same pattern as LensKindRegistry.
 */

import type { BattleContentType } from './battle.constants'
import type { ContenderStructure } from './contender-structure.types'
import type { JudgingMode } from './judging-mode.types'

// ─── Challenge Type Definition ──────────────────────────────────────────────

/** Output schema expectations for the generator Lens. */
export type ChallengeGeneratorOutputSchema =
  | 'question_text'
  | 'question_with_options'
  | 'question_with_code'

/** Generator requirements for AI-generated challenge questions. */
export interface ChallengeGeneratorRequirements {
  /** Expected output schema of the generator Lens. */
  outputSchema: ChallengeGeneratorOutputSchema
  /** Whether the generator must produce an answer key for auto-scoring. */
  requiresAnswerKey: boolean
  /** Available difficulty levels (empty = no difficulty selection). */
  difficultyLevels?: readonly string[]
  /** Default platform-provided generator lens slug. */
  defaultGeneratorLensSlug?: string
  /** Input parameters the generator accepts (e.g. ['topic', 'language', 'difficulty']). */
  inputParameters?: readonly string[]
}

export interface ChallengeTypeDefinition {
  /** Unique identifier for this challenge type. */
  id: string
  /** Human-readable label. */
  label: string
  /** Short description shown in the selector. */
  description: string
  /** Lucide icon name (resolved by the UI layer). */
  icon: string
  /** Badge color for the selector card. */
  badgeColor: 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'gray'
  /** Which contender structures this challenge supports. */
  allowedContenders: readonly ContenderStructure[]
  /** Whether the challenge requires a specialized human input UI. */
  humanUIRequired: boolean
  /** Whether an AI can participate in this challenge. */
  aiCompatible: boolean
  /** Which judging modes work for this challenge. */
  scoringOptions: readonly JudgingMode[]
  /** Default time limit in seconds, or null for no limit. */
  timeLimitDefault: number | null
  /** Expected output content type for results. */
  outputType: BattleContentType
  /** Whether the challenge varies by language/locale. */
  localeDependent: boolean
  /** Whether the game UI is implemented and ready. */
  implemented: boolean
  /** AI question generator requirements. If present, this challenge type uses generated questions. */
  generatorRequirements?: ChallengeGeneratorRequirements
}

// ─── Registry ───────────────────────────────────────────────────────────────

export const CHALLENGE_TYPE_REGISTRY: Record<string, ChallengeTypeDefinition> = {
  writing_contest: {
    id: 'writing_contest',
    label: 'Writing Contest',
    description: 'Creative or technical writing on a given topic. Judged on quality, clarity, and style.',
    icon: 'PenLine',
    badgeColor: 'blue',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['community_vote', 'ai_judge', 'rubric_score'],
    timeLimitDefault: 900, // 15 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: false,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/writing-prompt-generator',
      inputParameters: ['topic', 'genre', 'language', 'difficulty'],
    },
  },
  math_calculation: {
    id: 'math_calculation',
    label: 'Math Challenge',
    description: 'Solve math problems accurately and quickly. Auto-scored for correctness.',
    icon: 'Calculator',
    badgeColor: 'green',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['auto_score', 'ai_judge'],
    timeLimitDefault: 300, // 5 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/math-challenge-generator',
      inputParameters: ['topic', 'difficulty', 'number_of_questions'],
    },
  },
  grammar_quiz: {
    id: 'grammar_quiz',
    label: 'Grammar Quiz',
    description: 'Language-specific grammar and vocabulary challenges. Auto-scored.',
    icon: 'BookOpen',
    badgeColor: 'purple',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['auto_score', 'ai_judge'],
    timeLimitDefault: 300, // 5 minutes
    outputType: 'text',
    localeDependent: true,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_with_options',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/grammar-quiz-generator',
      inputParameters: ['language', 'difficulty', 'topic'],
    },
  },
  hand_drawing: {
    id: 'hand_drawing',
    label: 'Hand Drawing',
    description: 'Freehand drawing challenge. Judged on creativity, accuracy, or crowd vote.',
    icon: 'Pencil',
    badgeColor: 'yellow',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['community_vote', 'ai_judge'],
    timeLimitDefault: 600, // 10 minutes
    outputType: 'drawing',
    localeDependent: false,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: false,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/drawing-prompt-generator',
      inputParameters: ['theme', 'difficulty'],
    },
  },
  fill_in_blanks: {
    id: 'fill_in_blanks',
    label: 'Fill in the Blanks',
    description: 'Complete sentences or code snippets with the correct words. Auto-scored.',
    icon: 'TextCursorInput',
    badgeColor: 'blue',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['auto_score'],
    timeLimitDefault: 300, // 5 minutes
    outputType: 'text',
    localeDependent: true,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_with_options',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/fill-blanks-generator',
      inputParameters: ['language', 'difficulty', 'topic'],
    },
  },
  first_code_error: {
    id: 'first_code_error',
    label: 'Find the Bug',
    description: 'Spot the first error in a code snippet. Speed and accuracy matter.',
    icon: 'Bug',
    badgeColor: 'red',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['auto_score', 'ai_judge'],
    timeLimitDefault: 180, // 3 minutes
    outputType: 'code',
    localeDependent: false,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_with_code',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/code-bug-generator',
      inputParameters: ['programming_language', 'difficulty', 'topic'],
    },
  },
  logic_puzzle: {
    id: 'logic_puzzle',
    label: 'Logic Puzzle',
    description: 'Solve logical reasoning puzzles. Tests deduction and pattern recognition.',
    icon: 'Puzzle',
    badgeColor: 'green',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['auto_score', 'ai_judge'],
    timeLimitDefault: 600, // 10 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/logic-puzzle-generator',
      inputParameters: ['puzzle_type', 'difficulty'],
    },
  },
  prompt_duel: {
    id: 'prompt_duel',
    label: 'Prompt Duel',
    description: 'Write the best prompt to achieve a specific AI output. Judged on result quality.',
    icon: 'Sparkles',
    badgeColor: 'yellow',
    allowedContenders: ['human_vs_human'],
    humanUIRequired: true,
    aiCompatible: false,
    scoringOptions: ['community_vote', 'ai_judge'],
    timeLimitDefault: 600, // 10 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: false,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/prompt-duel-generator',
      inputParameters: ['target_output_type', 'difficulty'],
    },
  },
  debate: {
    id: 'debate',
    label: 'Debate',
    description: 'Argue for or against a topic. Community or AI judges persuasiveness.',
    icon: 'MessageSquare',
    badgeColor: 'purple',
    allowedContenders: ['human_vs_human', 'human_vs_ai'],
    humanUIRequired: true,
    aiCompatible: true,
    scoringOptions: ['community_vote', 'ai_judge', 'rubric_score'],
    timeLimitDefault: 900, // 15 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: false,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: false,
      difficultyLevels: ['easy', 'medium', 'hard'],
      defaultGeneratorLensSlug: 'platform/debate-topic-generator',
      inputParameters: ['subject_area', 'difficulty', 'language'],
    },
  },

  // ── Benchmark Game Types ────────────────────────────────────────────────────
  // AI-focused benchmark challenge types used with task_source='lens'.
  // These use shared_input_snapshot for fairness instead of generated_challenges.
  //
  // community_vote enforcement:
  //   - ai_vs_ai structure: community_vote is blocked by validateBenchmarkAIvsAIConstraints.
  //   - human_vs_ai structure: community_vote is permitted (human audience can judge).
  //   Types that support only ai_vs_ai must NOT list community_vote in scoringOptions.

  code_completion_benchmark: {
    id: 'code_completion_benchmark',
    label: 'Code Completion Benchmark',
    description: 'AI models complete a partial code snippet. Evaluated on correctness, style, and efficiency.',
    icon: 'Code2',
    badgeColor: 'green',
    allowedContenders: ['ai_vs_ai', 'human_vs_ai'],
    humanUIRequired: false,
    aiCompatible: true,
    scoringOptions: ['ai_judge', 'community_vote'],
    timeLimitDefault: 300, // 5 minutes
    outputType: 'code',
    localeDependent: false,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_with_code',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/code-completion-generator',
      inputParameters: ['programming_language', 'difficulty', 'topic'],
    },
  },
  instruction_following_benchmark: {
    id: 'instruction_following_benchmark',
    label: 'Instruction Following Benchmark',
    description: 'AI models follow multi-constraint instructions precisely. Evaluated on adherence and quality.',
    icon: 'ListChecks',
    badgeColor: 'blue',
    allowedContenders: ['ai_vs_ai'],
    humanUIRequired: false,
    aiCompatible: true,
    // community_vote omitted: this type only supports ai_vs_ai, where community_vote
    // is always blocked by validateBenchmarkAIvsAIConstraints.
    scoringOptions: ['ai_judge'],
    timeLimitDefault: 300, // 5 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: false,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/instruction-task-generator',
      inputParameters: ['domain', 'difficulty', 'num_constraints'],
    },
  },
  reasoning_benchmark: {
    id: 'reasoning_benchmark',
    label: 'Reasoning Benchmark',
    description: 'AI models solve logical and analytical reasoning problems. Evaluated on accuracy and reasoning chain.',
    icon: 'BrainCircuit',
    badgeColor: 'purple',
    allowedContenders: ['ai_vs_ai', 'human_vs_ai'],
    humanUIRequired: false,
    aiCompatible: true,
    scoringOptions: ['ai_judge', 'community_vote'],
    timeLimitDefault: 600, // 10 minutes
    outputType: 'text',
    localeDependent: false,
    implemented: true,
    generatorRequirements: {
      outputSchema: 'question_text',
      requiresAnswerKey: true,
      difficultyLevels: ['easy', 'medium', 'hard', 'expert'],
      defaultGeneratorLensSlug: 'platform/reasoning-puzzle-generator',
      inputParameters: ['reasoning_type', 'difficulty'],
    },
  },
}

// ─── Ordering ───────────────────────────────────────────────────────────────

/** Stable display ordering — implemented types first, then alphabetical. */
export const CHALLENGE_TYPE_ORDER: readonly string[] = [
  'writing_contest',
  'math_calculation',
  'grammar_quiz',
  'hand_drawing',
  'fill_in_blanks',
  'first_code_error',
  'logic_puzzle',
  'prompt_duel',
  'debate',
  // Benchmark game types (AI-focused)
  'code_completion_benchmark',
  'instruction_following_benchmark',
  'reasoning_benchmark',
]

// ─── Queries ────────────────────────────────────────────────────────────────

/** Get a single challenge type by ID. Returns undefined if not found. */
export function getChallengeType(id: string): ChallengeTypeDefinition | undefined {
  return CHALLENGE_TYPE_REGISTRY[id]
}

/** List all challenge type definitions in display order. */
export function listChallengeTypeDefinitions(): ChallengeTypeDefinition[] {
  return CHALLENGE_TYPE_ORDER
    .map((id) => CHALLENGE_TYPE_REGISTRY[id])
    .filter((def): def is ChallengeTypeDefinition => def !== undefined)
}

/** List only implemented (playable) challenge types. */
export function listAvailableChallengeTypes(): ChallengeTypeDefinition[] {
  return listChallengeTypeDefinitions().filter((def) => def.implemented)
}

/** List challenge types valid for a given contender structure. */
export function listChallengeTypesForContender(
  contender: ContenderStructure,
): ChallengeTypeDefinition[] {
  return listChallengeTypeDefinitions().filter((def) =>
    def.allowedContenders.includes(contender),
  )
}

/** Check if a challenge type requires AI-generated questions. */
export function challengeTypeRequiresGenerator(id: string): boolean {
  const def = getChallengeType(id)
  return def?.generatorRequirements !== undefined
}

/** Get generator requirements for a challenge type, or undefined if none. */
export function getGeneratorRequirements(
  id: string,
): ChallengeGeneratorRequirements | undefined {
  return getChallengeType(id)?.generatorRequirements
}
