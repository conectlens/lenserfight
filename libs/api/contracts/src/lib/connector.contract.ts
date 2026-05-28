export type ConnectorKind = 'api' | 'webhook'

export interface ConnectorSummary {
  slug: string
  name: string
  description: string | null
  scopes: string[]
  is_active: boolean
  kind: ConnectorKind
  created_at: string
  last_used_at: string | null
}

export type ConnectorListResponse = ConnectorSummary[]
export type ConnectorGetResponse = ConnectorSummary | null

export interface ConnectorCreateRequest {
  p_name: string
  p_slug: string
  p_description?: string | null
  p_scopes: string[]
}

export interface ConnectorCreateResponse {
  slug: string
  name: string
  scopes: string[]
  service_token: string
  token_prefix: string
}

export interface ConnectorRotateResponse {
  slug: string
  service_token: string
  token_prefix: string
}

export interface ConnectorTestResponse {
  ok: boolean
  latency_ms: number
  scopes: string[]
}

/**
 * Postgres SQLSTATE returned when a token-scoped RPC call lacks the
 * required scope. CLI maps this to a friendly error and exits with code 2.
 */
export const CONNECTOR_SCOPE_ERROR_SQLSTATE = '42501'
