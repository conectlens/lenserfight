import { describe, expect, it } from 'vitest'
import { renderBotHtml } from './renderDocument'
import type { SeoDocument } from './types'

function makeDoc(overrides: Partial<SeoDocument> = {}): SeoDocument {
  return {
    meta: {
      title: 'Planning Lens "Pro"',
      description: 'A lens for planning',
      url: 'https://moon.lenserfight.com/lenses/abc',
      ogImage: 'https://cdn.lenserfight.com/og.png',
      jsonLd: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: 'x' },
    },
    canonical: 'https://moon.lenserfight.com/lenses/abc',
    locale: 'en',
    hreflang: [
      { lang: 'en', href: 'https://moon.lenserfight.com/lenses/abc' },
      { lang: 'x-default', href: 'https://moon.lenserfight.com/lenses/abc' },
    ],
    bodyHtml: '<h1>Planning Lens</h1>',
    ...overrides,
  }
}

describe('renderBotHtml', () => {
  it('escapes the title and emits a single canonical link', () => {
    const html = renderBotHtml(makeDoc())
    expect(html).toContain('<title>Planning Lens &quot;Pro&quot;</title>')
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
  })

  it('emits OpenGraph, Twitter, hreflang and JSON-LD', () => {
    const html = renderBotHtml(makeDoc())
    expect(html).toContain('property="og:title"')
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain('hreflang="x-default"')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('"@type":"CreativeWork"')
  })

  it('honors a noindex flag', () => {
    const html = renderBotHtml(makeDoc({ meta: { ...makeDoc().meta, index: false } }))
    expect(html).toContain('content="noindex,nofollow"')
  })

  it('renders the crawlable body and a continue link', () => {
    const html = renderBotHtml(makeDoc())
    expect(html).toContain('<h1>Planning Lens</h1>')
    expect(html).toContain('>Open in LenserFight</a>')
  })
})
