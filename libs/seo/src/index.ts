// @lenserfight/seo — framework-free SEO source of truth.
// No React, no Cloudflare SDK, no browser globals: importable by the edge Worker
// runtime and by the React apps.

// Metadata service (relocated from @lenserfight/data — the SEO source of truth)
export { seoService, type SEOMetadata } from './lib/meta/seoService'

// Bot HTML rendering
export { renderBotHtml, buildHreflang, type SeoDocument } from './lib/renderDocument'
export {
  buildLensDocument,
  buildBattleDocument,
  buildLenserDocument,
  buildWorkflowDocument,
  buildThreadDocument,
  buildRayDocument,
} from './lib/builders'
export { renderEntity } from './lib/meta/renderEntity'
export {
  renderEntityBody,
  type LensSeoInput,
  type BattleSeoInput,
  type LenserSeoInput,
  type WorkflowSeoInput,
  type ThreadSeoInput,
  type RaySeoInput,
} from './lib/bodies'
export { fetchOne } from './lib/fetchers'

// Pure helpers
export { escapeHtml, escapeAttr, serializeJsonLd } from './lib/html'
export { entityPath, absoluteUrl, type EntityKind } from './lib/routes'
export {
  renderUrlset,
  renderSitemapIndex,
  gzipXml,
  SITEMAP_MAX_URLS,
  type SitemapEntry,
  type SitemapIndexChild,
} from './lib/sitemap'

// Anon Supabase read layer
export {
  listPublicEntities,
  listAllPublicEntities,
  listRecentPublic,
  RPC_PAGE_SIZE,
  type SupabaseAnonConfig,
  type SitemapRow,
  type RecentRow,
} from './lib/fetchers'

// Edge Worker core
export { isCrawler } from './lib/worker/botDetection'
export { matchEntityRoute, type EntityRouteMatch } from './lib/worker/routeMatch'
export {
  matchSitemapRoute,
  handleSitemap,
  type SitemapConfig,
  type SitemapRouteMatch,
  type SitemapResponse,
} from './lib/worker/sitemapHandler'
export { submitToIndexNow, type IndexNowSubmission, type IndexNowResult } from './lib/worker/indexnow'
export {
  createSeoWorker,
  type SeoWorkerConfig,
  type SeoWorkerEnv,
  type SeoExecutionContext,
  type RenderEntityContext,
} from './lib/worker/createSeoWorker'
