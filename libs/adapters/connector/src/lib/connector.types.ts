import type { ConnectorScope } from './scopes'

export type ConnectorKind = 'api' | 'webhook'

export interface ConnectorMetadata {
  slug: string
  name: string
  kind: ConnectorKind
  scopes: readonly ConnectorScope[]
  isActive: boolean
  description?: string | null
  createdAt?: string
  lastUsedAt?: string | null
}

export interface VerifyResult {
  ok: boolean
  scopes: ConnectorScope[]
  reason?: 'token_missing' | 'token_revoked' | 'scope_mismatch' | 'unknown_connector'
}

export interface DispatchResult {
  ok: boolean
  latencyMs: number
  status?: number
  error?: string
}

export interface DispatchEvent {
  type: string
  payload: Record<string, unknown>
}

/**
 * Error thrown when a request is missing a scope required by a downstream RPC.
 * Maps to Postgres SQLSTATE `42501` (insufficient_privilege).
 */
export class ConnectorScopeError extends Error {
  readonly required: ConnectorScope
  readonly granted: readonly ConnectorScope[]
  constructor(required: ConnectorScope, granted: readonly ConnectorScope[]) {
    super(`Connector token missing required scope: ${required}`)
    this.name = 'ConnectorScopeError'
    this.required = required
    this.granted = granted
  }
}
