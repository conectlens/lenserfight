// Sitemap route matching + response building. Pure of HTTP: returns a
// SitemapResponse descriptor that createSeoWorker serializes into a Response.
//
// Structure (Reddit/X convention):
//   /sitemap.xml            → sitemap INDEX (children below)
//   /sitemaps/<plural>-<n>.xml.gz → gzipped per-type shard, ≤50k URLs, id-range n
//   /sitemaps/recent.xml    → fast-refresh fresh shard (all types, last N hours)
//   /sitemaps/pages.xml     → static hub/marketing routes

import {
  gzipXml,
  renderSitemapIndex,
  renderUrlset,
  SITEMAP_MAX_URLS,
  type SitemapEntry,
  type SitemapIndexChild,
} from '../sitemap'
import { absoluteUrl, entityPath, type EntityKind } from '../routes'
import {
  listAllPublicEntities,
  listRecentPublic,
  type SitemapRow,
  type SupabaseAnonConfig,
} from '../fetchers'

const ENTITY_KINDS: EntityKind[] = [
  'lens',
  'battle',
  'lenser',
  'workflow',
  'thread',
  'ray',
]

/** Plural slug used in child filenames (`/sitemaps/lenses-1.xml.gz`). */
const KIND_PLURAL: Record<EntityKind, string> = {
  lens: 'lenses',
  battle: 'battles',
  lenser: 'lensers',
  workflow: 'workflows',
  thread: 'threads',
  ray: 'rays',
}
const KIND_BY_PLURAL: Record<string, EntityKind> = Object.fromEntries(
  ENTITY_KINDS.map((k) => [KIND_PLURAL[k], k]),
)

export interface SitemapConfig {
  /** Canonical origin, e.g. https://moon.lenserfight.com */
  canonicalBase: string
  /** Static hub/marketing routes emitted as /sitemaps/pages.xml. */
  staticRoutes: SitemapEntry[]
  /** Fresh-shard lookback window in hours (default 48). */
  recentWindowHours?: number
}

export type SitemapRouteKind = 'index' | 'recent' | 'pages' | EntityKind

export interface SitemapRouteMatch {
  kind: SitemapRouteKind
  /** Zero-based shard page (entity kinds only). */
  page: number
  gzip: boolean
}

export interface SitemapResponse {
  status: number
  contentType: string
  gzip: boolean
  body: string | Uint8Array
  cacheControl: string
}

const CACHE_ARCHIVE = 'public, s-maxage=3600, stale-while-revalidate=86400'
const CACHE_RECENT = 'public, s-maxage=300, stale-while-revalidate=600'

/** Matches sitemap routes; returns null for anything else. */
export function matchSitemapRoute(pathname: string): SitemapRouteMatch | null {
  const p = (pathname.split('?')[0] || '').replace(/\/+$/, '')
  if (p === '/sitemap.xml') return { kind: 'index', page: 0, gzip: false }
  if (p === '/sitemaps/recent.xml') return { kind: 'recent', page: 0, gzip: false }
  if (p === '/sitemaps/pages.xml') return { kind: 'pages', page: 0, gzip: false }
  const m = p.match(/^\/sitemaps\/([a-z]+)-(\d+)\.xml\.gz$/)
  if (m) {
    const kind = KIND_BY_PLURAL[m[1]]
    const n = Number(m[2])
    if (kind && n >= 1) return { kind, page: n - 1, gzip: true }
  }
  return null
}

/** Uses the date portion of an ISO timestamp — stable across intra-day cache windows. */
function toLastmod(iso: string | null): string | undefined {
  if (!iso) return undefined
  return iso.split('T')[0]
}

function rowsToEntries(
  base: string,
  kind: EntityKind,
  rows: SitemapRow[],
): SitemapEntry[] {
  return rows.map((r) => ({
    loc: absoluteUrl(base, entityPath(kind, r.entity_key)),
    lastmod: toLastmod(r.lastmod),
  }))
}

function xml(body: string, cacheControl: string): SitemapResponse {
  return { status: 200, contentType: 'application/xml; charset=utf-8', gzip: false, body, cacheControl }
}

async function gzipped(body: string, cacheControl: string): Promise<SitemapResponse> {
  // Per the sitemaps.org protocol, a .xml.gz sitemap is a gzip FILE the crawler
  // downloads and decompresses itself — not an HTTP-transport gzip encoding.
  // content-type reflects that (application/gzip); createSeoWorker must NOT
  // also set Content-Encoding: gzip, or a standards-compliant client strips
  // one gzip layer automatically and is left with the still-compressed file.
  return {
    status: 200,
    contentType: 'application/gzip',
    gzip: true,
    body: await gzipXml(body),
    cacheControl,
  }
}

function notFound(): SitemapResponse {
  return {
    status: 404,
    contentType: 'application/xml; charset=utf-8',
    gzip: false,
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
    cacheControl: 'public, s-maxage=300',
  }
}

// NOTE (scaling): buildIndex/buildShard fetch all rows of a kind to count shards
// and slice pages. Responses are edge-cached (1h), so crawlers rarely trigger a
// rebuild. At multi-million-row scale, replace the full fetch with a count RPC +
// precomputed shard manifest; the response shape is unchanged.

async function buildIndex(
  cfg: SupabaseAnonConfig,
  config: SitemapConfig,
): Promise<SitemapResponse> {
  const base = config.canonicalBase
  const children: SitemapIndexChild[] = []
  for (const kind of ENTITY_KINDS) {
    const rows = await listAllPublicEntities(cfg, kind)
    if (rows.length === 0) continue
    const shards = Math.max(1, Math.ceil(rows.length / SITEMAP_MAX_URLS))
    const lastmod = rows.reduce<string | undefined>((max, r) => {
      const d = toLastmod(r.lastmod)
      return d && (!max || d > max) ? d : max
    }, undefined)
    for (let n = 1; n <= shards; n++) {
      children.push({
        loc: absoluteUrl(base, `/sitemaps/${KIND_PLURAL[kind]}-${n}.xml.gz`),
        lastmod,
      })
    }
  }
  children.push({ loc: absoluteUrl(base, '/sitemaps/recent.xml') })
  children.push({ loc: absoluteUrl(base, '/sitemaps/pages.xml') })
  return xml(renderSitemapIndex(children), CACHE_ARCHIVE)
}

async function buildShard(
  cfg: SupabaseAnonConfig,
  config: SitemapConfig,
  kind: EntityKind,
  page: number,
): Promise<SitemapResponse> {
  const rows = await listAllPublicEntities(cfg, kind)
  const start = page * SITEMAP_MAX_URLS
  const slice = rows.slice(start, start + SITEMAP_MAX_URLS)
  if (slice.length === 0) return notFound()
  return gzipped(renderUrlset(rowsToEntries(config.canonicalBase, kind, slice)), CACHE_ARCHIVE)
}

async function buildRecent(
  cfg: SupabaseAnonConfig,
  config: SitemapConfig,
): Promise<SitemapResponse> {
  const windowHours = config.recentWindowHours ?? 48
  const since = new Date(Date.now() - windowHours * 3600 * 1000)
  const rows = await listRecentPublic(cfg, since)
  const entries: SitemapEntry[] = rows
    .filter((r) => (ENTITY_KINDS as string[]).includes(r.kind))
    .map((r) => ({
      loc: absoluteUrl(config.canonicalBase, entityPath(r.kind as EntityKind, r.entity_key)),
      lastmod: toLastmod(r.lastmod),
    }))
  return xml(renderUrlset(entries), CACHE_RECENT)
}

function buildPages(config: SitemapConfig): SitemapResponse {
  return xml(renderUrlset(config.staticRoutes), CACHE_ARCHIVE)
}

/** Builds the SitemapResponse for a matched sitemap route. */
export function handleSitemap(
  match: SitemapRouteMatch,
  cfg: SupabaseAnonConfig,
  config: SitemapConfig,
): Promise<SitemapResponse> {
  switch (match.kind) {
    case 'index':
      return buildIndex(cfg, config)
    case 'recent':
      return buildRecent(cfg, config)
    case 'pages':
      return Promise.resolve(buildPages(config))
    default:
      return buildShard(cfg, config, match.kind, match.page)
  }
}
