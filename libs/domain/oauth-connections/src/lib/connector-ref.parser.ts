/**
 * Connector reference parser for the [[:connector:ref]] expression syntax.
 *
 * Expression form:   [[:connector:google.gmail.primary]]
 *                    ↑ outer brackets + prefix  ↑ inner ref
 *
 * The inner ref format is: provider.capability.label
 *   provider   — registered OAuth provider id  ('google')
 *   capability — provider capability id         ('gmail')
 *   label      — user-defined connection label  ('primary')
 *
 * This module only parses and validates the syntax. It does NOT check whether
 * a matching connection exists in the database — that is the resolver's job.
 */

import type { ConnectorRef, ConnectorRefParseResult, OAuthCapability, OAuthProvider } from './oauth-connection.types'

/**
 * Regex that matches a complete [[:connector:ref]] token anywhere in a string.
 * Group 1 captures the inner ref (e.g. 'google.gmail.primary').
 *
 * Reset lastIndex before iterating: CONNECTOR_REF_OUTER_RE.lastIndex = 0
 */
export const CONNECTOR_REF_OUTER_RE = /\[\[:connector:([a-z][a-z0-9._-]{0,118})\]\]/g

/**
 * Extracts all inner ref strings from [[:connector:ref]] tokens in a template.
 *
 * @example
 * extractConnectorRefs('Send via [[:connector:google.gmail.primary]] or [[:connector:google.gmail.work]]')
 * // → ['google.gmail.primary', 'google.gmail.work']
 */
export function extractConnectorRefs(template: string): string[] {
  const refs: string[] = []
  const re = new RegExp(CONNECTOR_REF_OUTER_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(template)) !== null) {
    if (m[1]) refs.push(m[1])
  }
  return refs
}

/**
 * Returns true if the string contains at least one [[:connector:*]] token.
 */
export function hasConnectorRef(value: string): boolean {
  const re = new RegExp(CONNECTOR_REF_OUTER_RE.source)
  return re.test(value)
}

// Allowlists kept in sync with DB CHECK constraints in 20280101000000.sql.
// New providers/capabilities extend these sets + the DB constraint.
const VALID_PROVIDERS = new Set<OAuthProvider>(['google'])
const VALID_CAPABILITIES = new Set<OAuthCapability>([
  'gmail',
  'drive',
  'sheets',
  'docs',
  'calendar',
])

/**
 * Parses a raw inner ref string into a typed ConnectorRef.
 * Does NOT validate that the connection exists — only validates syntax.
 *
 * @example
 * parseConnectorRef('google.gmail.primary')
 * // → { ok: true, ref: { raw: 'google.gmail.primary', provider: 'google', capability: 'gmail', label: 'primary' } }
 *
 * parseConnectorRef('google.unknown.primary')
 * // → { ok: false, raw: '...', reason: 'unknown capability: unknown' }
 */
export function parseConnectorRef(raw: string): ConnectorRefParseResult {
  const parts = raw.split('.')
  if (parts.length < 3) {
    return {
      ok: false,
      raw,
      reason: 'ref must have format: provider.capability.label (at least 3 dot-separated parts)',
    }
  }

  const [provider, capability, ...labelParts] = parts
  const label = labelParts.join('.')

  if (!VALID_PROVIDERS.has(provider as OAuthProvider)) {
    return { ok: false, raw, reason: `unknown provider: ${provider}` }
  }

  if (!VALID_CAPABILITIES.has(capability as OAuthCapability)) {
    return { ok: false, raw, reason: `unknown capability: ${capability}` }
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(label)) {
    return {
      ok: false,
      raw,
      reason: 'label must be lowercase alphanumeric (with - or _), 1–48 characters',
    }
  }

  return {
    ok: true,
    ref: {
      raw,
      provider: provider as OAuthProvider,
      capability: capability as OAuthCapability,
      label,
    },
  }
}
