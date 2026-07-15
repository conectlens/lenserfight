// Canonical route shapes for public entities. Single source of truth shared by
// the sitemap generator, the crawlable-body internal links, and the Worker's
// route matcher — so a URL is spelled exactly one way everywhere.

export type EntityKind =
  | 'lens'
  | 'battle'
  | 'lenser'
  | 'workflow'
  | 'thread'
  | 'ray'

const ENTITY_PATH_PREFIX: Record<EntityKind, string> = {
  lens: '/lenses',
  battle: '/battles',
  lenser: '/lenser',
  workflow: '/workflows',
  thread: '/threads',
  ray: '/ray',
}

/**
 * Builds the canonical app-relative path for a public entity.
 * `key` is the route param value returned by the `fn_list_public_*` RPCs
 * (uuid for lens/workflow/thread; slug for battle/ray; handle for lenser).
 */
export function entityPath(kind: EntityKind, key: string): string {
  return `${ENTITY_PATH_PREFIX[kind]}/${encodeURIComponent(key)}`
}

/** Joins a base origin and an app-relative path into an absolute URL. */
export function absoluteUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const rel = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`
  return `${base}${rel}`
}
