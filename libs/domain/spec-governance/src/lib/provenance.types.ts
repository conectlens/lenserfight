/**
 * LenserFight Execution Provenance Types.
 *
 * Defines the metadata captured in an immutable execution snapshot.
 * An ExecutionProvenance record lets any downstream consumer:
 *
 *   1. Reproduce the execution by re-running with the same inputs and config.
 *   2. Verify the output has not been tampered with (content hash chain).
 *   3. Trace back to the exact spec version and model used.
 *   4. Audit the full lineage (parent executions, forks, replays).
 *
 * Design principles:
 *   - Flat, serializable — all fields are primitives or arrays of primitives.
 *   - Stable — field names are stable across apiVersion bumps; removals are
 *     handled via migration, not silent omission.
 *   - Additive — new optional fields may be added in a minor version without
 *     breaking existing consumers.
 *
 * GRASP: Information Expert — owns the provenance shape. No other layer
 * may define competing provenance types.
 */

// ─── Component hashes ─────────────────────────────────────────────────────────

export interface SpecReference {
  /** Spec kind (e.g. "Lens", "CoLens"). */
  kind: string
  /** Spec ID as stored in the frontmatter. */
  id: string
  /** Semantic version string from the spec frontmatter. */
  version: string
  /**
   * SHA-256 hex digest of the canonical frontmatter object at execution time.
   * Computed by `computeSpecDigest()`. Enables exact replay even if the
   * living spec has since been updated.
   */
  contentHash: string
}

export interface InputProvenance {
  /** SHA-256 hex digest of the canonical JSON of the input payload. */
  inputHash: string
  /** ISO-8601 timestamp when inputs were locked (before execution started). */
  lockedAt: string
}

export interface ModelProvenance {
  /** Provider key (e.g. 'openai', 'anthropic', 'ollama'). */
  provider: string
  /** Model identifier as sent to the provider (e.g. 'claude-sonnet-4-6'). */
  modelId: string
  /** Model canonical key used for display and comparison (e.g. 'claude-sonnet-4-6'). */
  modelKey: string
  /** Temperature, top_p, max_tokens, and other sampler settings. */
  samplerConfig?: Record<string, unknown>
  /** BYOK key reference (never the key itself — only the env var name). */
  byokKeyRef?: string
}

export interface ToolProvenance {
  /** Tool identifier. */
  toolId: string
  /** Tool version at time of execution. */
  toolVersion?: string
  /** SHA-256 hex digest of the tool manifest at execution time. */
  toolHash?: string
}

export interface OutputProvenance {
  /**
   * SHA-256 hex digest of the canonical JSON of the output payload.
   * Enables tamper detection and deduplication.
   */
  outputHash: string
  /** ISO-8601 timestamp when the output was produced. */
  producedAt: string
  /** Output modality (e.g. 'text', 'image', 'audio', 'video'). */
  modality: 'text' | 'image' | 'audio' | 'video' | 'structured' | 'file'
}

export interface EvaluationProvenance {
  /** Evaluation spec reference. */
  evaluationRef?: SpecReference
  /** SHA-256 hex digest of the evaluation result payload. */
  evaluationHash?: string
  /** Overall score, if produced by the evaluation. */
  score?: number
  /** Whether the evaluation passed its configured pass threshold. */
  passed?: boolean
}

// ─── Execution metadata ───────────────────────────────────────────────────────

export type ExecutionStatus = 'completed' | 'failed' | 'cancelled' | 'timeout' | 'partial'

export interface ExecutionProvenance {
  /**
   * Spec API version this record was produced under.
   * Consumers MUST check this before reading fields added in later versions.
   */
  apiVersion: string

  /** Monotonically increasing execution ID (UUID). */
  executionId: string

  /** ISO-8601 timestamp when execution started. */
  startedAt: string

  /** ISO-8601 timestamp when execution finished (or failed). */
  finishedAt: string

  /** Execution outcome. */
  status: ExecutionStatus

  /** LenserFight CLI or platform version that ran this execution. */
  runtimeVersion: string

  /** Spec that was executed. */
  specRef: SpecReference

  /** Input provenance. */
  inputs: InputProvenance

  /** Primary model used. May be absent for human-run executions. */
  model?: ModelProvenance

  /** Additional models used (multi-model workflows). */
  additionalModels?: ModelProvenance[]

  /** Tools invoked during execution. */
  tools?: ToolProvenance[]

  /** Output provenance. */
  output: OutputProvenance

  /** Evaluation result if the execution was evaluated. */
  evaluation?: EvaluationProvenance

  /**
   * SHA-256 hex digest of the concatenated hashes:
   *   sha256(specRef.contentHash + inputs.inputHash + output.outputHash)
   *
   * This is the "execution seal" — a single value that changes if any
   * of the three primary components changes.
   */
  executionHash: string

  /** ID of the parent execution (replay, fork, rematch). */
  parentExecutionId?: string

  /** Arbitrary metadata attached by the caller (must be JSON-serializable). */
  annotations?: Record<string, string>
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

/**
 * A signed, immutable execution snapshot that can be verified by any party
 * with the LenserFight public key.
 *
 * The `signature` field is populated only when the snapshot has been submitted
 * to the LenserFight verification service. Local executions may omit it.
 */
export interface ExecutionSnapshot {
  provenance: ExecutionProvenance
  /**
   * Optional Ed25519 signature over sha256(canonical_json(provenance)).
   * Hex-encoded. Absent for unverified local executions.
   */
  signature?: string
  /** ISO-8601 timestamp when the signature was issued. */
  signedAt?: string
  /** Key ID of the signing key. Matches the LenserFight public key registry. */
  keyId?: string
}
