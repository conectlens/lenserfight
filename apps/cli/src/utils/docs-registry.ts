/**
 * Centralized documentation registry for the LenserFight CLI.
 *
 * All docs links used in error surfaces, recovery hints, and onboarding flows
 * must be derived from this registry. This keeps:
 * - URLs stable and auditable in one place.
 * - NO_COLOR / plain-text rendering consistent.
 * - Future URL changes low-blast-radius.
 *
 * ## Clickable links
 * Modern terminals (iTerm2, Windows Terminal, VS Code terminal, Warp, Ghostty)
 * support OSC 8 hyperlinks. We emit them when color is enabled so developers
 * can Cmd/Ctrl+click directly to docs without copying URLs.
 */

import { hyperlink, isPlainText } from './ansi'
import type { CliErrorKind } from './error-taxonomy'

// ─── Base URL ────────────────────────────────────────────────────────────────

const BASE = 'https://docs.lenserfight.com'

// ─── Docs registry ────────────────────────────────────────────────────────────

/**
 * Mapping from stable `docsKey` strings → absolute documentation URLs.
 * Keys are referenced by `TaxonomyEntry.docsKey` and `RecoveryGuidance.docsKey`.
 */
export const DOCS_REGISTRY: Record<string, string> = {
  // Auth
  'auth-login':        `${BASE}/guides/auth/login`,
  'auth-tokens':       `${BASE}/guides/auth/developer-tokens`,
  'permissions':       `${BASE}/guides/auth/permissions`,

  // Setup & config
  'configuration':     `${BASE}/guides/configuration`,
  'local-setup':       `${BASE}/guides/local-development`,
  'gateway-setup':     `${BASE}/guides/gateway/setup`,
  'local-models':      `${BASE}/guides/local-models/ollama`,

  // API & connectivity
  'connectivity':      `${BASE}/troubleshooting/connectivity`,
  'rate-limits':       `${BASE}/reference/rate-limits`,
  'resources':         `${BASE}/reference/resources`,

  // Providers
  'providers':         `${BASE}/guides/providers/overview`,
  'provider-keys':     `${BASE}/guides/providers/api-keys`,
  'multimodal':        `${BASE}/guides/providers/multimodal`,

  // Workflow
  'workflow-nodes':    `${BASE}/guides/workflows/nodes`,
  'workflow-dsl':      `${BASE}/guides/workflows/dsl`,
  'workflow-debug':    `${BASE}/guides/workflows/debugging`,

  // Battle
  'battle-lifecycle':  `${BASE}/guides/battles/lifecycle`,
  'battle-replay':     `${BASE}/guides/battles/replay`,
  'battle-templates':  `${BASE}/guides/battles/templates`,

  // Schemas & validation
  'schemas':           `${BASE}/reference/schemas`,
  'schema-drift':      `${BASE}/reference/schemas/drift`,

  // General troubleshooting
  'troubleshooting':   `${BASE}/troubleshooting`,
  'doctor':            `${BASE}/troubleshooting/doctor`,
  'byok':              `${BASE}/guides/byok`,
  'cli-reference':     `${BASE}/reference/cli`,
}

// ─── Error → docs key mapping ─────────────────────────────────────────────────

/** Default docs key for each error kind (supplement to taxonomy `docsKey`). */
const KIND_DOCS_MAP: Partial<Record<CliErrorKind, string>> = {
  unauthorized:  'auth-login',
  forbidden:     'permissions',
  not_found:     'resources',
  rate_limited:  'rate-limits',
  network:       'connectivity',
  gateway:       'gateway-setup',
  provider:      'providers',
  multimodal:    'multimodal',
  workflow:      'workflow-nodes',
  battle:        'battle-lifecycle',
  schema:        'schemas',
  config:        'configuration',
  local_model:   'local-models',
  unknown:       'troubleshooting',
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolve a docs URL by key.
 * Returns the URL string or `undefined` when the key is unregistered.
 */
export function resolveDocsUrl(key: string): string | undefined {
  return DOCS_REGISTRY[key]
}

/**
 * Return the canonical docs key for a given error kind.
 */
export function docsKeyForKind(kind: CliErrorKind): string {
  return KIND_DOCS_MAP[kind] ?? 'troubleshooting'
}

/**
 * Format a docs URL as a clickable OSC 8 hyperlink (modern terminals) or a
 * plain-text fallback. Label defaults to the shortened path.
 *
 * Examples:
 *   formatDocLink('auth-login')
 *   → "\x1b]8;;https://docs.lenserfight.com/guides/auth/login\x1b\\docs → auth/login\x1b]8;;\x1b\\"
 *
 *   formatDocLink('auth-login', 'Sign in guide')
 *   → "\x1b]8;;https://...\x1b\\Sign in guide\x1b]8;;\x1b\\"
 */
export function formatDocLink(key: string, label?: string): string | null {
  const url = resolveDocsUrl(key)
  if (!url) return null
  const displayLabel = label ?? shortLabel(url)
  return hyperlink(url, displayLabel)
}

/**
 * Format a raw URL as a hyperlink. Prefer `formatDocLink` for registered keys.
 */
export function formatLink(url: string, label?: string): string {
  return hyperlink(url, label ?? url)
}

/**
 * Render a "docs" footer line for inclusion in error surfaces.
 * Returns null when the key is not registered or color is disabled and the
 * caller can omit the entire line.
 *
 * In plain-text mode, renders as: "  docs: https://..."
 * In color mode:                  "  ⎘  <clickable label>"
 */
export function renderDocsLine(key: string, label?: string): string | null {
  const url = resolveDocsUrl(key)
  if (!url) return null
  const displayLabel = label ?? shortLabel(url)

  if (isPlainText()) {
    return `  docs: ${url}`
  }

  return `  \x1b[90m⎘\x1b[0m  ${hyperlink(url, displayLabel)}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortLabel(url: string): string {
  try {
    const u = new URL(url)
    // Strip leading slash, show "docs → path/to/page"
    return `docs → ${u.pathname.replace(/^\//, '')}`
  } catch {
    return url
  }
}
