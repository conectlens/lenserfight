import type { SIGNATURE_ALGORITHMS } from './constants'
import type { LensContractBody } from './lens-contract.types'

export type SignatureAlgorithm = (typeof SIGNATURE_ALGORITHMS)[number]

export interface ContractSignature {
  algorithm: SignatureAlgorithm
  key_id: string
  /** Hex-encoded signature bytes. */
  signature: string
  signed_at: string
}

/**
 * The portable, AI-readable Lens Manifest. This is the document an agent reads
 * before deciding to invoke a Lens.
 */
export interface LensManifest {
  spec_version: string
  content_hash: string
  body: LensContractBody
  channel?: 'stable' | 'beta' | 'canary' | 'deprecated' | 'yanked'
  signatures: ReadonlyArray<ContractSignature>
}
