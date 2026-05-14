import type { ExportContext, ExportVisibility } from './types'

/**
 * RedactionPolicy — single authority for what gets stripped before export.
 *
 * GRASP:
 * - Information Expert: knows the visibility/owner matrix, no caller may
 *   second-guess it.
 * - Pure Fabrication: no natural domain home (battle, lens, agent all
 *   share the same rules), so it lives here.
 * - Protected Variations: secret keys are matched by deny-list patterns
 *   so adding a new secret-shaped field doesn't require touching call sites.
 *
 * Runs identically on the server (edge fn) and the client (local export)
 * so the two paths can never diverge.
 */

/** Field-path patterns that are stripped for EVERYONE, owner included. */
const ALWAYS_REDACT = [
  /(^|\.)api[_-]?key$/i,
  /(^|\.)secret(_|s|$)/i,
  /(^|\.)token(_|s|$)/i,
  /(^|\.)password(_|s|$)/i,
  /(^|\.)access[_-]?key/i,
  /(^|\.)private[_-]?key/i,
  /(^|\.)bearer/i,
  /(^|\.)authorization$/i,
  /(^|\.)credentials?$/i,
  /(^|\.)byok/i,
  /(^|\.)signing[_-]?secret/i,
]

/** Patterns only owners may see; redacted for anyone else. */
const OWNER_ONLY = [
  /(^|\.)email$/i,
  /(^|\.)ip[_-]?address/i,
  /(^|\.)stripe/i,
  /(^|\.)billing/i,
  /(^|\.)internal[_-]?notes$/i,
  /(^|\.)voter[_-]?id/i,
]

/** Patterns only authenticated users may see (e.g., judge prompts). */
const AUTHENTICATED_ONLY = [
  /(^|\.)judge[_-]?prompt/i,
  /(^|\.)evaluation[_-]?rationale/i,
  /(^|\.)admin[_-]?note/i,
]

export interface RedactionResult<T> {
  data: T
  redactions: string[]
  visibility: ExportVisibility
}

function visibilityFor(ctx: ExportContext): ExportVisibility {
  if (ctx.isOwner) return 'owner'
  if (ctx.isAuthenticated) return 'authenticated'
  return 'public'
}

function matchesAny(path: string, patterns: RegExp[]): boolean {
  for (const re of patterns) {
    if (re.test(path)) return true
  }
  return false
}

function shouldRedact(path: string, visibility: ExportVisibility): boolean {
  if (matchesAny(path, ALWAYS_REDACT)) return true
  if (visibility !== 'owner' && matchesAny(path, OWNER_ONLY)) return true
  if (visibility === 'public' && matchesAny(path, AUTHENTICATED_ONLY)) return true
  return false
}

function walk(
  node: unknown,
  path: string,
  visibility: ExportVisibility,
  redactions: string[],
): unknown {
  if (node === null || typeof node !== 'object') return node
  if (Array.isArray(node)) {
    return node.map((item, i) => walk(item, `${path}[${i}]`, visibility, redactions))
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    const childPath = path ? `${path}.${key}` : key
    if (shouldRedact(childPath, visibility)) {
      redactions.push(childPath)
      continue
    }
    result[key] = walk(value, childPath, visibility, redactions)
  }
  return result
}

/**
 * Apply redaction policy to an arbitrary payload. Returns a deep-copied
 * payload with disallowed paths removed and a stable list of redacted
 * paths for the audit log + envelope `redactions` field.
 */
export function applyRedactionPolicy<T>(payload: T, ctx: ExportContext): RedactionResult<T> {
  const visibility = visibilityFor(ctx)
  const redactions: string[] = []
  const data = walk(payload, '', visibility, redactions) as T
  return { data, redactions, visibility }
}
