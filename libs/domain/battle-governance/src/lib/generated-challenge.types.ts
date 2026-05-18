/**
 * Generated Challenge Types — domain types for AI-generated challenge questions.
 *
 * A generated challenge represents an immutable question/task produced by a neutral
 * AI generator (implemented as a Lens) that both contestants must answer in a
 * human-vs-human or human-vs-AI battle.
 */

// ─── Status Lifecycle ──────────────────────────────────────────────────────────

/**
 * Lifecycle of a generated challenge:
 * - pending: creation request received, generation not yet started
 * - generating: Lens execution in progress
 * - ready: generation complete, awaiting creator review/lock
 * - locked: immutable — battle can start
 * - failed: generation failed, battle cannot start
 */
export type GeneratedChallengeStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'locked'
  | 'failed'

// ─── Configuration (input to generation) ───────────────────────────────────────

/** Input configuration for requesting a challenge generation. */
export interface GeneratedChallengeConfig {
  /** Which Lens to use as the question generator. */
  generatorLensId: string
  /** Pinned version of the generator Lens (null = use head). */
  generatorVersionId?: string | null
  /** AI model to run the generator Lens with. */
  generatorModelId: string
  /** Challenge type from the registry. */
  challengeType: string
  /** Difficulty level. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  /** Target language/locale code. */
  language?: string
  /** Optional topic or subject constraint. */
  topic?: string
  /** Time limit override in seconds. */
  timeLimitSeconds?: number
  /** Scoring mode preference. */
  scoringMode?: string
  /** Additional custom parameters for the generator. */
  customParameters?: Record<string, unknown>
}

// ─── Generator Output (parsed from Lens response) ──────────────────────────────

/** Structured output from the challenge generator Lens. */
export interface ChallengeGeneratorOutput {
  /** The main question or task text shown to contestants. */
  questionText: string
  /** Structured payload for complex challenge types (options, code, blanks). */
  questionPayload?: Record<string, unknown>
  /** Expected correct answer or answer key (for auto-scored challenges). */
  answerKey?: string
  /** Scoring rubric text (for rubric-scored challenges). */
  rubric?: string
  /** Explanation that may be revealed after scoring. */
  explanation?: string
}

// ─── Record (database row shape) ───────────────────────────────────────────────

/** Database row representation of a generated challenge. */
export interface GeneratedChallengeRecord {
  id: string
  battleId: string
  challengeType: string
  status: GeneratedChallengeStatus

  // Generator identity
  generatorLensId: string
  generatorVersionId: string | null
  generatorModelId: string

  // Generated content
  questionText: string | null
  questionPayload: Record<string, unknown>

  // Answer key (hash only — encrypted content not exposed to frontend)
  answerKeyHash: string | null

  // Parameters
  difficulty: string | null
  language: string | null
  timeLimitSeconds: number | null
  scoringMode: string | null

  // Integrity
  contentHash: string | null

  // Execution link
  executionRunId: string | null
  inputSnapshot: Record<string, unknown>

  // Lifecycle
  lockedAt: string | null
  createdAt: string
  createdBy: string | null
}

// ─── Validation helpers ────────────────────────────────────────────────────────

/** Checks if a challenge status indicates it can still be modified. */
export function isChallengeEditable(status: GeneratedChallengeStatus): boolean {
  return status === 'pending' || status === 'ready' || status === 'failed'
}

/** Checks if a challenge is ready to be locked. */
export function isChallengeLockable(status: GeneratedChallengeStatus): boolean {
  return status === 'ready'
}

/** Checks if a challenge is in a terminal locked state. */
export function isChallengeLocked(status: GeneratedChallengeStatus): boolean {
  return status === 'locked'
}
