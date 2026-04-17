// Contract types for lens IO and workflow node envelopes.
//
// These describe the structured hand-off between workflow nodes and between a
// lens and its downstream consumers. They are stored on `lenses.versions` as
// `input_contract` / `output_contract` (JSONB) and are validated by the
// execution engine before and after each provider call.

import type { ArtifactKind } from './execution.types'

/**
 * First-class lens kinds. A lens MAY carry zero or more `kind:*` tags in
 * `content.tag_map` and SHOULD declare its kind on the version's
 * `output_contract.kind`. The values below are the canonical set used by the
 * lens-kind registry and the workflow engine.
 */
export type LensKind =
  | 'text'
  | 'image'
  | 'video'
  | 'research'
  | 'pdf'
  | 'transform'
  | 'orchestration'
  | 'validation'
  | 'routing'

/**
 * Scalar contract field types. `any` is a fallback for unstructured providers.
 */
export type ContractFieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'url'
  | 'json'
  | 'array'
  | 'any'

export interface ContractFieldSchema {
  type: ContractFieldType
  required?: boolean
  description?: string
  /** For `string` / `url` */
  minLength?: number
  maxLength?: number
  pattern?: string
  /** For `number` / `integer` */
  min?: number
  max?: number
  /** For `array` */
  itemType?: ContractFieldType
  /** For enumerations */
  enum?: string[]
}

/**
 * What a lens expects from its inputs — the structural contract for all
 * parameters it consumes. Parameter tools still control UI; this contract
 * constrains the VALUES the engine/renderer will hand the provider.
 */
export interface LensInputContract {
  kind: LensKind
  /** Required rendered input fields (mapped from `[[label]]` placeholders). */
  fields: Record<string, ContractFieldSchema>
  /** Optional: require at least one of these fields to be present. */
  requireAnyOf?: string[][]
  /** Optional: reject extra unknown fields. Default false. */
  strict?: boolean
}

/**
 * What a lens guarantees on successful completion — the structural contract
 * downstream nodes can rely on.
 */
export interface LensOutputContract {
  kind: LensKind
  /** Artifact kind written to `execution.artifacts.artifact_kind`. */
  artifactKind: ArtifactKind
  /** Extensible output classification (e.g. 'pdf') stored on `output_type`. */
  outputType?: string
  /** Structured fields guaranteed on the envelope's `data`. */
  schema?: Record<string, ContractFieldSchema>
  /** Source-output keys this lens exposes on the envelope (defaults to `['output']`). */
  tokens?: string[]
  /** Optional: mark outputs that may contain PII so downstream can flag. */
  containsSensitive?: boolean
}

/**
 * Canonical runtime envelope returned by every provider and passed between
 * workflow nodes. `output` is always a string projection so existing
 * `[[label]]` prompt rendering keeps working; `data` carries the structured
 * fields promised by the contract.
 */
export interface NodeOutputEnvelope {
  kind: LensKind
  artifactKind: ArtifactKind
  /** Canonical stringified projection of the primary output. */
  output: string
  /** Structured fields matching `LensOutputContract.schema`. */
  data?: Record<string, unknown>
  /** Media descriptor for image / video / audio / pdf outputs. */
  media?: {
    url: string
    mime?: string | null
    width?: number | null
    height?: number | null
    durationS?: number | null
    bytes?: number | null
  } | null
  /** Non-normative provider metadata (model, latency, tokens, finishReason). */
  metadata?: Record<string, unknown>
}

/**
 * Error surface produced by the contract validator. One error per failing
 * field, collected so the caller can decide to retry or surface to the UI.
 */
export interface ContractValidationError {
  field: string
  reason:
    | 'missing_required'
    | 'type_mismatch'
    | 'below_min'
    | 'above_max'
    | 'too_short'
    | 'too_long'
    | 'pattern_mismatch'
    | 'enum_mismatch'
    | 'unknown_field'
    | 'invalid_envelope'
  details?: string
}

export interface ContractValidationResult {
  ok: boolean
  errors: ContractValidationError[]
}

/**
 * A successful envelope MUST declare a recognised `kind` + `artifactKind` and
 * carry a string `output`. This is the minimum shape the engine enforces
 * before any contract-specific validation runs.
 */
export const NODE_OUTPUT_ENVELOPE_REQUIRED_FIELDS = ['kind', 'artifactKind', 'output'] as const
