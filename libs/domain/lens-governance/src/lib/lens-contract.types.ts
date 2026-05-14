import type { LENS_CONTRACT_KINDS } from './constants'
import type {
  DependencyBinding,
  LensKind,
  ParameterContract,
} from './parameter-contract.types'

export type LensContractKind = (typeof LENS_CONTRACT_KINDS)[number]

export interface LensOutputDefinition {
  kind: LensKind
  artifactKind: string
  schema?: Record<string, unknown>
  outputType?: string
}

export interface LensDependencyReference {
  /** Hex-encoded sha256 of child contract. */
  content_hash: string
  binding: DependencyBinding
  metadata?: Record<string, unknown>
}

/**
 * The canonical, serializable body of a Lens Contract. This is the object
 * over which `content_hash = sha256(canonical_json(body))` is computed.
 *
 * The Registry is the single source of truth for instances of this type;
 * runtime callers consume frozen copies and never mutate.
 */
export interface LensContractBody {
  spec_version: string
  lens_id: string
  version_id: string
  semver: string
  kind: LensContractKind
  lens_kind: LensKind
  name: string
  summary: string
  inputs: ReadonlyArray<ParameterContract>
  outputs: ReadonlyArray<LensOutputDefinition>
  dependencies: ReadonlyArray<LensDependencyReference>
  capability_tags: ReadonlyArray<string>
  required_scopes: ReadonlyArray<string>
}

/**
 * Hash-addressed Contract envelope with registry-side metadata.
 */
export interface LensContract {
  /** Hex-encoded sha256 of canonical_json(body). */
  content_hash: string
  body: LensContractBody
  published_by: string
  published_at: string
  supersedes_hash?: string | null
}
