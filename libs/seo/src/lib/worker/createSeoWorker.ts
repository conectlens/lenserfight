// Host-agnostic SEO edge Worker. Instantiated per app (web, arena) with its
// canonical base + static routes. Uses only web-standard globals (Request,
// Response, URL, CompressionStream, and optionally `caches`) so it runs on
// Cloudflare Workers and is unit-testable under Node/Miniflare.
//
// Request handling order:
//   1. IndexNow key file        → 200 text/plain
//   2. Sitemap routes           → generated XML (edge-cached)
//   3. Crawler UA + entity route → bot-rendered HTML (edge-cached) or 404
//   4. everything else / any error → pass through to env.ASSETS (the SPA)
// The human hot path and any failure both fall through to ASSETS — a rendering
// bug can never 5xx a crawler or take down humans.

import { isCrawler } from './botDetection'
import { matchEntityRoute } from './routeMatch'
import {
  handleSitemap,
  matchSitemapRoute,
  type SitemapConfig,
  type SitemapResponse,
} from './sitemapHandler'
import type { EntityKind } from '../routes'
import type { SupabaseAnonConfig } from '../fetchers'

/** Minimal structural env — Cloudflare provides ASSETS + vars/secrets. */
export interface SeoWorkerEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  SUPABASE_URL: string
  SUPABASE_PUBLISHABLE_KEY: string
  INDEXNOW_KEY?: string
}

/** Minimal structural execution context (Cloudflare's ctx.waitUntil). */
export interface SeoExecutionContext {
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface RenderEntityContext {
  anon: SupabaseAnonConfig
  canonicalBase: string
}

export interface SeoWorkerConfig {
  sitemap: SitemapConfig
  /**
   * Optional bot HTML renderer. When absent (or it returns null), entity routes
   * fall through to the SPA shell — so the sitemap works before bot-rendering is
   * wired. Returns a full HTML document string, or null if the entity is
   * missing/not public (→ 404).
   */
  renderEntity?: (
    kind: EntityKind,
    key: string,
    ctx: RenderEntityContext,
  ) => Promise<string | null>
}

const NOT_FOUND_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not found</title><meta name="robots" content="noindex"></head><body><h1>404 — Not found</h1></body></html>'

// `encodeBody` is a Cloudflare Workers-runtime-specific ResponseInit field
// (see developers.cloudflare.com/workers/runtime-apis/response) not present in
// the standard DOM lib types this file otherwise relies on to stay
// Miniflare/Node-testable — narrow local augmentation instead of depending on
// @cloudflare/workers-types. Harmless no-op outside the Workers runtime.
interface CfResponseInit extends ResponseInit {
  encodeBody?: 'manual' | 'automatic'
}

function sitemapToResponse(r: SitemapResponse): Response {
  const headers: Record<string, string> = {
    'content-type': r.contentType,
    // no-transform: defense in depth against any edge/CDN re-compression of an
    // already-gzip body (separate from the runtime issue below).
    'cache-control': r.gzip ? `${r.cacheControl}, no-transform` : r.cacheControl,
  }
  const init: CfResponseInit = { status: r.status, headers }
  if (r.gzip) {
    headers['content-encoding'] = 'gzip'
    // The Workers runtime compresses the body to match Content-Encoding by
    // default — for a body that's ALREADY gzip (built via gzipXml()), that
    // means gzip-in-gzip unless we opt out. Without this, a client decodes one
    // gzip layer per the header and is left holding a still-compressed blob
    // (an "encoding error" for any XML/sitemap parser).
    init.encodeBody = 'manual'
  }
  return new Response(r.body as BodyInit, init)
}

// Edge cache helpers — guarded so Node/Miniflare tests without `caches` skip them.
interface CacheLike {
  match: (r: Request) => Promise<Response | undefined>
  put: (r: Request, res: Response) => Promise<void>
}
function edgeCache(): CacheLike | null {
  const c = (globalThis as { caches?: { default?: CacheLike } }).caches
  return c && c.default ? c.default : null
}

export function createSeoWorker(config: SeoWorkerConfig) {
  return {
    async fetch(
      request: Request,
      env: SeoWorkerEnv,
      ctx?: SeoExecutionContext,
    ): Promise<Response> {
      // Only GET/HEAD are cacheable/renderable; anything else is the app's.
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return env.ASSETS.fetch(request)
      }

      const url = new URL(request.url)
      const anon: SupabaseAnonConfig = {
        supabaseUrl: env.SUPABASE_URL,
        anonKey: env.SUPABASE_PUBLISHABLE_KEY,
      }

      try {
        // 1. IndexNow ownership key file.
        if (env.INDEXNOW_KEY && url.pathname === `/${env.INDEXNOW_KEY}.txt`) {
          return new Response(env.INDEXNOW_KEY, {
            headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
          })
        }

        // 2. Sitemap routes (edge-cached).
        const sm = matchSitemapRoute(url.pathname)
        if (sm) {
          const cache = edgeCache()
          const cacheKey = new Request(url.toString(), { method: 'GET' })
          const hit = cache ? await cache.match(cacheKey) : undefined
          if (hit) return hit
          const built = sitemapToResponse(await handleSitemap(sm, anon, config.sitemap))
          if (cache && built.status === 200 && ctx?.waitUntil) {
            ctx.waitUntil(cache.put(cacheKey, built.clone()))
          }
          return built
        }

        // 3. Crawler + entity route → bot-rendered HTML.
        if (config.renderEntity && isCrawler(request.headers.get('user-agent'))) {
          const match = matchEntityRoute(url.pathname)
          if (match) {
            const cache = edgeCache()
            const cacheKey = new Request(`${url.toString()}#bot`, { method: 'GET' })
            const hit = cache ? await cache.match(cacheKey) : undefined
            if (hit) return hit
            const html = await config.renderEntity(match.kind, match.key, {
              anon,
              canonicalBase: config.sitemap.canonicalBase,
            })
            if (html === null) {
              return new Response(NOT_FOUND_HTML, {
                status: 404,
                headers: { 'content-type': 'text/html; charset=utf-8' },
              })
            }
            const res = new Response(html, {
              status: 200,
              headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
              },
            })
            if (cache && ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, res.clone()))
            return res
          }
        }
      } catch {
        // Any failure degrades to the SPA shell — never 5xx a crawler.
        return env.ASSETS.fetch(request)
      }

      // 4. Human hot path / unmatched → static assets, untouched.
      return env.ASSETS.fetch(request)
    },
  }
}
