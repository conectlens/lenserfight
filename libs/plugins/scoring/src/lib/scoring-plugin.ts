/**
 * @experimental
 *
 * Scoring plugin V1 contract. Stability is governed by RFC-0002. Plugin
 * authors should pin to a specific minor version of this package — the
 * shape may change without backwards-compatibility guarantees while the
 * RFC is open.
 */

/** @experimental */
export interface SubmissionView {
  battleId: string
  contenderId: string
  slot: 'A' | 'B'
  contentText: string | null
}

/** @experimental */
export interface ScoringSuccess {
  ok: true
  signals: Record<string, number>
}

/** @experimental */
export interface ScoringFailure {
  ok: false
  reason: string
}

/** @experimental */
export type ScoringResult = ScoringSuccess | ScoringFailure

/**
 * @experimental
 * Implementations must be deterministic given the same SubmissionView and
 * must NOT make network calls — scoring runs inside a Postgres-driven
 * dispatch loop and is treated as a pure transform.
 */
export interface ScoringPluginV1 {
  id(): string
  metadata(): { displayName: string; signals: string[] }
  score(submission: SubmissionView): Promise<ScoringResult>
}
