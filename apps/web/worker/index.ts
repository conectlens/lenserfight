// Cloudflare Pages edge Worker for moon.lenserfight.com (apps/web).
// Bundled to dist/apps/web/_worker.js by tools/seo/build-worker.mjs.
//
// - Humans: pass-through to the static SPA (env.ASSETS).
// - Crawlers on an entity route: bot-rendered HTML (once renderEntity is wired).
// - /sitemap.xml + /sitemaps/*: dynamic, DB-backed, edge-cached.
// - IndexNow key file: /<INDEXNOW_KEY>.txt.
//
// Env (Cloudflare Pages project settings): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
// and secret INDEXNOW_KEY. ASSETS is provided automatically in advanced mode.

import { createSeoWorker, renderEntity, type SitemapEntry } from '@lenserfight/seo'

const CANONICAL_BASE = 'https://moon.lenserfight.com'

// Static hub/marketing routes → /sitemaps/pages.xml. Mirrors the routes the
// legacy static sitemap listed; per-entity URLs now come from the DB.
const STATIC_ROUTES: SitemapEntry[] = [
  { loc: `${CANONICAL_BASE}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${CANONICAL_BASE}/lenses`, changefreq: 'hourly', priority: '0.95' },
  { loc: `${CANONICAL_BASE}/battles`, changefreq: 'hourly', priority: '0.94' },
  { loc: `${CANONICAL_BASE}/battles/browse`, changefreq: 'hourly', priority: '0.9' },
  { loc: `${CANONICAL_BASE}/battles/arena`, changefreq: 'hourly', priority: '0.88' },
  { loc: `${CANONICAL_BASE}/battles/templates`, changefreq: 'daily', priority: '0.88' },
  { loc: `${CANONICAL_BASE}/lensers`, changefreq: 'daily', priority: '0.9' },
  { loc: `${CANONICAL_BASE}/workflows`, changefreq: 'daily', priority: '0.82' },
  { loc: `${CANONICAL_BASE}/workflows/templates`, changefreq: 'daily', priority: '0.84' },
  { loc: `${CANONICAL_BASE}/ray`, changefreq: 'daily', priority: '0.86' },
  { loc: `${CANONICAL_BASE}/marketplace`, changefreq: 'daily', priority: '0.82' },
  { loc: `${CANONICAL_BASE}/lenserboard`, changefreq: 'hourly', priority: '0.7' },
  { loc: `${CANONICAL_BASE}/ai/catalog`, changefreq: 'daily', priority: '0.78' },
]

export default createSeoWorker({
  sitemap: {
    canonicalBase: CANONICAL_BASE,
    staticRoutes: STATIC_ROUTES,
    recentWindowHours: 48,
  },
  // Bot-render public entities (lens/battle/lenser/workflow/thread/ray) from the
  // anon Supabase read path. Any fetch/mapping failure is caught upstream and
  // falls through to the SPA shell.
  renderEntity: (kind, key, ctx) => renderEntity(kind, key, { anon: ctx.anon }),
})
