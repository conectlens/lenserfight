import { describe, expect, it } from 'vitest'
import {
  handleSitemap,
  matchSitemapRoute,
  type SitemapConfig,
} from './sitemapHandler'
import type { SupabaseAnonConfig } from '../fetchers'

const config: SitemapConfig = {
  canonicalBase: 'https://moon.lenserfight.com',
  staticRoutes: [{ loc: 'https://moon.lenserfight.com/', changefreq: 'daily', priority: '1.0' }],
  recentWindowHours: 48,
}

function mockFetch(rowsByFn: Record<string, unknown[]>): typeof fetch {
  return (async (url: string | URL) => {
    const fn = String(url).split('/rpc/')[1]
    const rows = rowsByFn[fn] ?? []
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

function cfg(rowsByFn: Record<string, unknown[]>): SupabaseAnonConfig {
  return { supabaseUrl: 'https://db.example.co', anonKey: 'anon', fetchImpl: mockFetch(rowsByFn) }
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

describe('matchSitemapRoute', () => {
  it('matches index, recent, pages, and gzipped shards', () => {
    expect(matchSitemapRoute('/sitemap.xml')).toEqual({ kind: 'index', page: 0, gzip: false })
    expect(matchSitemapRoute('/sitemaps/recent.xml')).toEqual({ kind: 'recent', page: 0, gzip: false })
    expect(matchSitemapRoute('/sitemaps/pages.xml')).toEqual({ kind: 'pages', page: 0, gzip: false })
    expect(matchSitemapRoute('/sitemaps/lenses-1.xml.gz')).toEqual({ kind: 'lens', page: 0, gzip: true })
    expect(matchSitemapRoute('/sitemaps/battles-3.xml.gz')).toEqual({ kind: 'battle', page: 2, gzip: true })
  })

  it('returns null for non-sitemap and unknown-kind paths', () => {
    expect(matchSitemapRoute('/lenses/x')).toBeNull()
    expect(matchSitemapRoute('/sitemaps/bogus-1.xml.gz')).toBeNull()
    expect(matchSitemapRoute('/sitemaps/lenses-0.xml.gz')).toBeNull()
  })
})

describe('handleSitemap index', () => {
  it('lists a child per non-empty kind plus recent and pages', async () => {
    const res = await handleSitemap({ kind: 'index', page: 0, gzip: false }, cfg({
      fn_list_public_lenses: [{ entity_key: 'l1', lastmod: '2026-07-15T10:00:00Z', sort_id: 'l1' }],
      fn_list_public_rays: [{ entity_key: 'ai', lastmod: '2026-07-10T00:00:00Z', sort_id: 'r1' }],
    }), config)
    const body = res.body as string
    expect(res.gzip).toBe(false)
    expect(body).toContain('<sitemapindex')
    expect(body).toContain('/sitemaps/lenses-1.xml.gz</loc>')
    expect(body).toContain('/sitemaps/rays-1.xml.gz</loc>')
    expect(body).toContain('/sitemaps/recent.xml</loc>')
    expect(body).toContain('/sitemaps/pages.xml</loc>')
    // empty kinds are omitted
    expect(body).not.toContain('/sitemaps/battles-1.xml.gz')
    expect(body).toContain('<lastmod>2026-07-15</lastmod>')
  })
})

describe('handleSitemap entity shard', () => {
  it('returns a gzipped urlset with canonical entity URLs', async () => {
    const res = await handleSitemap({ kind: 'lens', page: 0, gzip: true }, cfg({
      fn_list_public_lenses: [
        { entity_key: 'abc', lastmod: '2026-07-15T10:00:00Z', sort_id: 'abc' },
      ],
    }), config)
    expect(res.gzip).toBe(true)
    // application/gzip, not application/xml: this is a gzip FILE per the
    // sitemaps.org protocol, not an HTTP transport-encoded XML response.
    expect(res.contentType).toBe('application/gzip')
    const text = await gunzip(res.body as Uint8Array)
    expect(text).toContain('<loc>https://moon.lenserfight.com/lenses/abc</loc>')
    expect(text).toContain('<lastmod>2026-07-15</lastmod>')
  })

  it('404s an out-of-range shard page', async () => {
    const res = await handleSitemap({ kind: 'lens', page: 5, gzip: true }, cfg({
      fn_list_public_lenses: [{ entity_key: 'abc', lastmod: null, sort_id: 'abc' }],
    }), config)
    expect(res.status).toBe(404)
  })
})

describe('handleSitemap recent', () => {
  it('maps each recent row to its per-kind canonical path and short-caches', async () => {
    const res = await handleSitemap({ kind: 'recent', page: 0, gzip: false }, cfg({
      fn_list_recent_public: [
        { kind: 'battle', entity_key: 'my-battle', lastmod: '2026-07-15T09:00:00Z' },
        { kind: 'thread', entity_key: 't-9', lastmod: '2026-07-15T08:00:00Z' },
      ],
    }), config)
    const body = res.body as string
    expect(body).toContain('/battles/my-battle</loc>')
    expect(body).toContain('/threads/t-9</loc>')
    expect(res.cacheControl).toContain('s-maxage=300')
  })
})
