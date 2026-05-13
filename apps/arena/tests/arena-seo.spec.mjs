import { describe, expect, it } from 'vitest'
import {
  getAppSeo,
  injectSeoIntoHtml,
  matchDynamicRoute,
  renderRobots,
  renderSitemap,
} from '../../../tools/seo/app-seo.mjs'

describe('arena app SEO prerender metadata', () => {
  it('publishes marketing and battle discovery routes in a canonical sitemap', () => {
    const sitemap = renderSitemap('arena')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

    expect(urls).toContain('https://arena.lenserfight.com/')
    expect(urls).toContain('https://arena.lenserfight.com/battle-showcase')
    expect(urls).toContain('https://arena.lenserfight.com/note-from-omer')
    expect(urls).toContain('https://arena.lenserfight.com/product/cli')
    expect(urls.length).toBe(new Set(urls).size)
  })

  it('keeps auth and contact redirect pages out of indexing', () => {
    const robots = renderRobots('arena')

    expect(robots).toContain('Disallow: /auth/')
    expect(robots).toContain('Disallow: /contact')
    expect(robots).toContain('User-agent: ClaudeBot')
    expect(robots).toContain('Sitemap: https://arena.lenserfight.com/sitemap.xml')
  })

  it('renders semantic prerender content and social metadata for public pages', () => {
    const route = getAppSeo('arena').routes.find((item) => item.path === '/battle-showcase')
    const html = injectSeoIntoHtml(
      '<html><head><title>Old</title></head><body><div id="root"></div></body></html>',
      route,
    )

    expect(html).toContain('<h1>AI Battle Showcase</h1>')
    expect(html).toContain('Prompt, Agent, and Model Evaluation Examples')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('"@type":"CollectionPage"')
  })

  it('can describe dynamic public arena battle URLs', () => {
    const route = matchDynamicRoute('arena', '/battles/claude-vs-gpt/results')

    expect(route.title).toContain('Claude Vs Gpt')
    expect(route.schemaType).toBe('CreativeWork')
    expect(route.canonicalUrl).toBe('https://arena.lenserfight.com/battles/claude-vs-gpt/results')
  })
})
