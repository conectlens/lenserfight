/**
 * Canonical v1 connector token scope grammar.
 *
 * This list is the single source of truth for valid scopes across CLI,
 * adapter SDK, and the Supabase `fn_connector_create` allow-list. Phase 16
 * RFC governance applies once the grammar is locked: changes are additive
 * only — never rename or remove a scope without a major version bump.
 *
 * Format: `<resource>:<action>` where action ∈ { read, write }.
 */
export const CONNECTOR_SCOPES = [
  'lenses:read',
  'lenses:write',
  'agents:read',
  'agents:write',
  'workflows:read',
  'workflows:write',
  'threads:read',
  'threads:write',
  'community:read',
  'community:write',
  'connectors:read',
  'connectors:write',
] as const

export type ConnectorScope = (typeof CONNECTOR_SCOPES)[number]

export function isConnectorScope(value: unknown): value is ConnectorScope {
  return typeof value === 'string' && (CONNECTOR_SCOPES as readonly string[]).includes(value)
}

export interface ScopeValidationResult {
  valid: ConnectorScope[]
  invalid: string[]
}

export function validateScopes(input: readonly string[]): ScopeValidationResult {
  const valid: ConnectorScope[] = []
  const invalid: string[] = []
  for (const raw of input) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (isConnectorScope(trimmed)) valid.push(trimmed)
    else invalid.push(trimmed)
  }
  return { valid, invalid }
}

export function parseScopesCsv(csv: string): ScopeValidationResult {
  return validateScopes(csv.split(','))
}
