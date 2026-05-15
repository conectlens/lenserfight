import { describe, expect, it } from 'vitest'
import {
  getAppSeo,
  getAppBaseRoutes,
  injectSeoIntoHtml,
  matchDynamicRoute,
  renderRedirectShim,
  renderRobots,
  renderSitemap,
} from '../../../tools/seo/app-seo.mjs'

describe('arena app SEO prerender metadata', () => {
  it('publishes locale-prefixed marketing routes in a canonical sitemap', () => {
    const sitemap = renderSitemap('arena')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

    // Every static route emits one URL per enabled locale.
    expect(urls).toContain('https://arena.lenserfight.com/en')
    expect(urls).toContain('https://arena.lenserfight.com/tr')
    expect(urls).toContain('https://arena.lenserfight.com/en/battle-showcase')
    expect(urls).toContain('https://arena.lenserfight.com/tr/battle-showcase')
    expect(urls).toContain('https://arena.lenserfight.com/en/note-from-omer')
    expect(urls).toContain('https://arena.lenserfight.com/tr/note-from-omer')
    expect(urls).toContain('https://arena.lenserfight.com/en/product/cli')
    expect(urls).toContain('https://arena.lenserfight.com/tr/product/cli')

    // No duplicate canonical URLs.
    expect(urls.length).toBe(new Set(urls).size)

    // Count = static routes × enabled locales.
    const base = getAppBaseRoutes('arena')
    const expectedLocales = ['en', 'tr']
    expect(urls.length).toBe(base.routes.length * expectedLocales.length)
  })

  it('emits xhtml:link hreflang alternates for every sitemap URL', () => {
    const sitemap = renderSitemap('arena')
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://arena.lenserfight.com/en"',
    )
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="tr" href="https://arena.lenserfight.com/tr"',
    )
    expect(sitemap).toContain('hreflang="x-default"')
  })

  it('keeps auth and contact redirect pages out of indexing', () => {
    const robots = renderRobots('arena')

    expect(robots).toContain('Disallow: /auth/')
    expect(robots).toContain('Disallow: /contact')
    expect(robots).toContain('User-agent: ClaudeBot')
    expect(robots).toContain('Sitemap: https://arena.lenserfight.com/sitemap.xml')
  })

  it('renders localized prerender content and full hreflang set for English pages', () => {
    const route = getAppSeo('arena').routes.find(
      (item) => item.path === '/en/battle-showcase',
    )
    expect(route).toBeDefined()
    const html = injectSeoIntoHtml(
      '<html><head><title>Old</title></head><body><div id="root"></div></body></html>',
      route,
    )

    expect(html).toContain('AI Battle Showcase')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('"@type":"CollectionPage"')
    expect(html).toContain('hreflang="en"')
    expect(html).toContain('hreflang="tr"')
    expect(html).toContain('hreflang="x-default"')
    expect(html).toContain('property="og:locale" content="en"')
    expect(html).toContain('rel="canonical" href="https://arena.lenserfight.com/en/battle-showcase"')
  })

  it('renders Turkish titles and descriptions for /tr/* prerenders', () => {
    const route = getAppSeo('arena').routes.find((item) => item.path === '/tr/about')
    expect(route).toBeDefined()
    expect(route.title).toContain('LenserFight Hakkında')
    expect(route.canonicalUrl).toBe('https://arena.lenserfight.com/tr/about')
    expect(route.locale).toBe('tr')
  })

  it('renders bare-path Tier-1 redirect shims pointing at the default locale', () => {
    const shim = renderRedirectShim({
      targetUrl: '/en/about',
      canonicalUrl: 'https://arena.lenserfight.com/en/about',
    })
    expect(shim).toContain('<meta http-equiv="refresh" content="0;url=/en/about">')
    expect(shim).toContain('rel="canonical" href="https://arena.lenserfight.com/en/about"')
    expect(shim).toContain('noindex,follow')
  })

  it('can describe dynamic public arena battle URLs', () => {
    const route = matchDynamicRoute('arena', '/battles/claude-vs-gpt/results')

    expect(route.title).toContain('Claude Vs Gpt')
    expect(route.schemaType).toBe('CreativeWork')
    expect(route.canonicalUrl).toBe('https://arena.lenserfight.com/battles/claude-vs-gpt/results')
  })
})
