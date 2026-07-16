// Maps a request pathname to a public entity (kind + route key) for bot
// rendering. Returns null for list/home/static routes and private prefixes —
// those fall through to the SPA shell. Mirrors the canonical route shapes in
// ../routes.ts.

import type { EntityKind } from '../routes'

export interface EntityRouteMatch {
  kind: EntityKind
  /** The route param value (uuid for lens/workflow/thread; slug for battle/ray; handle for lenser). */
  key: string
}

// Path segments under an entity prefix that are NOT entity keys — they are the
// app's list/create/static sub-routes and must never be treated as an entity.
const RESERVED_KEYS = new Set([
  'browse',
  'arena',
  'templates',
  'create',
  'new',
  'compose',
  'run',
  'edit',
])

// Prefixes that are private/authenticated — never rendered for bots.
const PRIVATE_PREFIXES = [
  '/admin',
  '/auth',
  '/account',
  '/settings',
  '/billing',
  '/notifications',
  '/onboarding',
  '/chat',
  '/s/',
]

interface RoutePattern {
  kind: EntityKind
  /** First path segment (without leading slash). */
  prefix: string
}

// Ordered patterns: `/<prefix>/<key>[/<tab-or-subview>...]` → base entity.
const PATTERNS: RoutePattern[] = [
  { kind: 'lens', prefix: 'lenses' },
  { kind: 'battle', prefix: 'battles' },
  { kind: 'lenser', prefix: 'lenser' },
  { kind: 'workflow', prefix: 'workflows' },
  { kind: 'thread', prefix: 'threads' },
  { kind: 'ray', prefix: 'ray' },
]

function isPrivate(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`),
  )
}

/**
 * Returns the base entity for an entity route (ignoring tab/subview suffixes
 * like `/lenser/x/followers` or `/battles/y/result`), or null for
 * list/static/private/home routes.
 */
export function matchEntityRoute(pathname: string): EntityRouteMatch | null {
  const clean = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/'
  if (clean === '/' || isPrivate(clean)) return null

  const segments = clean.split('/').filter(Boolean)
  if (segments.length < 2) return null // list route like /lenses

  const [prefix, rawKey] = segments
  const pattern = PATTERNS.find((p) => p.prefix === prefix)
  if (!pattern) return null

  const key = decodeURIComponent(rawKey)
  if (!key || RESERVED_KEYS.has(key.toLowerCase())) return null

  return { kind: pattern.kind, key }
}
