import type { SEOMetadata } from '@lenserfight/data/repositories'

/** One `hreflang` alternate for a rendered page. */
export interface HreflangAlternate {
  lang: string
  href: string
}

/**
 * Everything the Worker needs to emit a complete crawlable HTML document for a
 * single entity. `meta` carries the head signals (title/description/canonical/
 * JSON-LD) produced by `seoService`; `bodyHtml` is the pre-escaped crawlable
 * body produced by the entity body renderers.
 */
export interface SeoDocument {
  meta: SEOMetadata
  /** Absolute canonical URL (also mirrored in `meta.url`). */
  canonical: string
  /** BCP-47 locale for `og:locale` / `<html lang>`. */
  locale: string
  hreflang: HreflangAlternate[]
  /** Pre-escaped, self-contained crawlable body markup. */
  bodyHtml: string
}

/**
 * Minimal public battle shape consumed by the battle body renderer and
 * `seoService.getBattleMeta`. Mirrors that method's parameter type so both
 * stay in sync.
 */
export interface BattleSeoInput {
  id: string
  slug: string
  title: string
  task_prompt: string
  published_at: string | null
  og_image_url?: string | null
  total_vote_count?: number
  author_handle?: string | null
  author_display_name?: string | null
}

/**
 * Minimal public workflow shape consumed by the workflow body renderer and
 * `seoService.getWorkflowMeta`.
 */
export interface WorkflowSeoInput {
  id: string
  title: string
  description?: string | null
  visibility?: string
  author_handle?: string | null
  author_display_name?: string | null
  node_count?: number
  updated_at?: string | null
}
