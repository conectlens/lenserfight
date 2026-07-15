import { describe, expect, it } from 'vitest'
import {
  gzipXml,
  renderSitemapIndex,
  renderUrlset,
  SITEMAP_MAX_URLS,
  type SitemapEntry,
} from './sitemap'

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

describe('renderUrlset', () => {
  it('emits <loc> and honest <lastmod> per entry', () => {
    const xml = renderUrlset([
      { loc: 'https://moon.lenserfight.com/lenses/a', lastmod: '2026-07-15' },
    ])
    expect(xml).toContain('<loc>https://moon.lenserfight.com/lenses/a</loc>')
    expect(xml).toContain('<lastmod>2026-07-15</lastmod>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('escapes & in a loc to &amp;', () => {
    const xml = renderUrlset([{ loc: 'https://moon.lenserfight.com/ray/a&b' }])
    expect(xml).toContain('/ray/a&amp;b')
    expect(xml).not.toMatch(/a&b/)
  })

  it('adds the xhtml namespace only when hreflang alternates are present', () => {
    const plain = renderUrlset([{ loc: 'https://x/a' }])
    expect(plain).not.toContain('xmlns:xhtml')

    const localized = renderUrlset([
      {
        loc: 'https://x/a',
        hreflang: [
          { lang: 'en', href: 'https://x/a' },
          { lang: 'tr', href: 'https://x/a?lang=tr' },
        ],
      },
    ])
    expect(localized).toContain('xmlns:xhtml')
    expect(localized).toContain('hreflang="tr"')
  })

  it('throws rather than silently dropping URLs past the 50k cap', () => {
    const tooMany: SitemapEntry[] = Array.from(
      { length: SITEMAP_MAX_URLS + 1 },
      (_, i) => ({ loc: `https://x/${i}` }),
    )
    expect(() => renderUrlset(tooMany)).toThrow(/cap is 50000/)
  })
})

describe('renderSitemapIndex', () => {
  it('references each child with its lastmod', () => {
    const xml = renderSitemapIndex([
      { loc: 'https://moon.lenserfight.com/sitemaps/lenses-1.xml.gz', lastmod: '2026-07-15' },
      { loc: 'https://moon.lenserfight.com/sitemaps/recent.xml' },
    ])
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('/sitemaps/lenses-1.xml.gz</loc>')
    expect(xml).toContain('/sitemaps/recent.xml</loc>')
    expect(xml).toContain('<lastmod>2026-07-15</lastmod>')
  })
})

describe('gzipXml', () => {
  it('round-trips back to the input XML through DecompressionStream', async () => {
    const xml = renderUrlset([
      { loc: 'https://moon.lenserfight.com/lenses/a', lastmod: '2026-07-15' },
    ])
    const gz = await gzipXml(xml)
    expect(gz).toBeInstanceOf(Uint8Array)
    expect(gz.byteLength).toBeGreaterThan(0)
    expect(await gunzip(gz)).toBe(xml)
  })
})
