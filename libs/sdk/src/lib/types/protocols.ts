// SDK public types for Protocols (Contracts & Manifests)

import type { SdkLensKind } from './lenses'

export type SdkContractKind = 'lens' | 'workflow' | 'composite'
export type SdkChannel = 'stable' | 'beta' | 'canary' | 'deprecated' | 'yanked'
export type SdkSignatureAlgorithm = 'ed25519' | 'hmac-sha256'

export type SdkParameterClassification = 'public' | 'internal' | 'protected' | 'system'
export type SdkParameterKind = 'primitive' | 'ai' | 'runtime'
export type SdkParameterScope = 'lens' | 'workflow' | 'run' | 'tenant' | 'global'
export type SdkDependencyBinding = 'lift' | 'bind' | 'ref'

export interface SdkParameterDefault {
  kind: 'static' | 'computed' | 'environment' | 'late_bound'
  value?: unknown
  expression?: string
  source?: string
}

export interface SdkParameterValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: ReadonlyArray<string | number>
  mimeTypes?: ReadonlyArray<string>
  urlScheme?: ReadonlyArray<string>
}

export interface SdkParameterContract {
  label: string
  toolId: string | null
  classification: SdkParameterClassification
  kind: SdkParameterKind
  type: string
  required: boolean
  default: SdkParameterDefault | null
  validation: SdkParameterValidation | null
  scope: SdkParameterScope
  overrideableBy: string[]
}

export interface SdkOutputDefinition {
  kind: SdkLensKind
  artifactKind: string
  schema?: Record<string, unknown>
  outputType?: string
}

export interface SdkDependencyReference {
  contentHash: string
  binding: SdkDependencyBinding
  metadata?: Record<string, unknown>
}

export interface SdkLensContractBody {
  specVersion: string
  lensId: string
  versionId: string
  semver: string
  kind: SdkContractKind
  lensKind: SdkLensKind
  name: string
  summary: string
  inputs: SdkParameterContract[]
  outputs: SdkOutputDefinition[]
  dependencies: SdkDependencyReference[]
  capabilityTags: string[]
  requiredScopes: string[]
}

export interface SdkLensContract {
  contentHash: string
  body: SdkLensContractBody
  publishedBy: string
  publishedAt: string
  supersedesHash: string | null
}

export interface SdkContractSignature {
  algorithm: SdkSignatureAlgorithm
  keyId: string
  signature: string
  signedAt: string
}

export interface SdkLensManifest {
  specVersion: string
  contentHash: string
  body: SdkLensContractBody
  channel: SdkChannel | null
  signatures: SdkContractSignature[]
}

export interface SdkDependencyEdge {
  parentContentHash: string
  childContentHash: string
  binding: SdkDependencyBinding
  depth: number
  metadata: Record<string, unknown> | null
}

export interface SdkCompatibilityResult {
  compatible: boolean
  missingScopes: string[]
  warnings: string[]
}
