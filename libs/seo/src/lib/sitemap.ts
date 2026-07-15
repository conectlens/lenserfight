// Pure sitemap renderers. No I/O, no DB — take already-fetched entries and emit
// spec-compliant XML. Consumed by the edge Worker (web + arena) to serve
// /sitemap.xml (index) and the per-type sharded children.

import { escapeAttr, escapeHtml } from './html'

/** sitemaps.org hard cap: a single sitemap file holds at most 50,000 URLs. */
export const SITEMAP_MAX_URLS = 50000

export interface SitemapEntry {
  /** Absolute URL. */
  loc: string
  /** ISO date (YYYY-MM-DD) or full ISO datetime. */
  lastmod?: string
  changefreq?: string
  priority?: string
  hreflang?: Array<{ lang: string; href: string }>
}

export interface SitemapIndexChild {
  /** Absolute URL of a child sitemap (may be a `.xml.gz`). */
  loc: string
  lastmod?: string
}

const URLSET_OPEN_PLAIN =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
const URLSET_OPEN_XHTML =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'

function renderEntry(entry: SitemapEntry): string {
  const parts: string[] = [`    <loc>${escapeHtml(entry.loc)}</loc>`]
  if (entry.lastmod) parts.push(`    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>`)
  if (entry.changefreq)
    parts.push(`    <changefreq>${escapeHtml(entry.changefreq)}</changefreq>`)
  if (entry.priority)
    parts.push(`    <priority>${escapeHtml(entry.priority)}</priority>`)
  for (const alt of entry.hreflang ?? []) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${escapeAttr(alt.lang)}" href="${escapeAttr(alt.href)}" />`,
    )
  }
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

/**
 * Renders a `<urlset>` for one sitemap file. Throws if given more than
 * {@link SITEMAP_MAX_URLS} entries — the caller must shard first so URLs are
 * never silently dropped.
 */
export function renderUrlset(entries: SitemapEntry[]): string {
  if (entries.length > SITEMAP_MAX_URLS) {
    throw new RangeError(
      `urlset has ${entries.length} entries; cap is ${SITEMAP_MAX_URLS}. Shard before rendering.`,
    )
  }
  const usesXhtml = entries.some((e) => (e.hreflang?.length ?? 0) > 0)
  const open = usesXhtml ? URLSET_OPEN_XHTML : URLSET_OPEN_PLAIN
  const body = entries.map(renderEntry).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n${open}\n${body}\n</urlset>\n`
}

/** Renders a `<sitemapindex>` listing child sitemaps. */
export function renderSitemapIndex(children: SitemapIndexChild[]): string {
  const body = children
    .map((child) => {
      const lastmod = child.lastmod
        ? `\n    <lastmod>${escapeHtml(child.lastmod)}</lastmod>`
        : ''
      return `  <sitemap>\n    <loc>${escapeHtml(child.loc)}</loc>${lastmod}\n  </sitemap>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

/**
 * Gzip-compresses an XML string using the runtime-native `CompressionStream`
 * (available in Cloudflare Workers and Node 18+). Child shards are served with
 * `Content-Encoding: gzip` — halving crawl bandwidth and keeping large shards
 * under the 50 MB byte cap.
 */
export async function gzipXml(xml: string): Promise<Uint8Array> {
  const compressed = new Blob([xml])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  const buffer = await new Response(compressed).arrayBuffer()
  return new Uint8Array(buffer)
}
