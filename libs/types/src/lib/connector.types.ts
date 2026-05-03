/**
 * Domain-level connector types. Wire/transport shapes live in
 * `@lenserfight/api/contracts`; the `ConnectorAdapterV1` interface and
 * scope grammar live in `@lenserfight/adapters/connector`.
 */
export type ConnectorKind = 'api' | 'webhook'

export interface Connector {
  id: string
  communityId: string
  slug: string
  name: string
  description: string | null
  kind: ConnectorKind
  scopes: string[]
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

export interface ConnectorToken {
  id: string
  connectorId: string
  tokenPrefix: string
  scopes: string[]
  revokedAt: string | null
  createdAt: string
}
