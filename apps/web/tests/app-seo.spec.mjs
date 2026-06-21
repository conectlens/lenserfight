import { describe, expect, it } from 'vitest'
import {
  getAppSeo,
  injectSeoIntoHtml,
  matchDynamicRoute,
  renderRobots,
  renderSitemap,
  routeOutputPath,
} from '../../../tools/seo/app-seo.mjs'

describe('web app SEO prerender metadata', () => {
  it('defines canonical public routes without duplicate sitemap URLs', () => {
    const app = getAppSeo('web')
    const sitemap = renderSitemap('web')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

    expect(app.routes.map((route) => route.path)).toContain('/lenses')
    expect(app.routes.map((route) => route.path)).toContain('/battles/templates')
    expect(urls.length).toBe(new Set(urls).size)
    expect(urls).toContain('https://moon.lenserfight.com/lensers')
    expect(sitemap).not.toContain('/len/p')
  })

  it('blocks private and authenticated routes in robots.txt', () => {
    const robots = renderRobots('web')

    expect(robots).toContain('Disallow: /admin/')
    expect(robots).toContain('Disallow: /settings/')
    expect(robots).toContain('Disallow: /threads/compose')
    expect(robots).toContain('User-agent: GPTBot')
    expect(robots).toContain('Sitemap: https://moon.lenserfight.com/sitemap.xml')
  })

  it('injects crawlable HTML, canonical tags, OpenGraph, and JSON-LD into route shells', () => {
    const route = getAppSeo('web').routes.find((item) => item.path === '/lenses')
    const html = injectSeoIntoHtml(
      '<html><head><title>Old</title><meta name="description" content="Old"></head><body><div id="root"></div></body></html>',
      route,
    )

    expect(html).toContain('<title>AI Prompt & Lens Templates | Prompt Workflows and Automation Patterns</title>')
    expect(html).toContain('<link rel="canonical" href="https://moon.lenserfight.com/lenses" />')
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('<main id="seo-prerender"')
    expect(routeOutputPath('/lenses')).toBe('lenses/index.html')
  })

  it('generates useful dynamic fallback metadata for public resource routes', () => {
    const lens = matchDynamicRoute('web', '/lenses/github-review-workflow')
    const lenser = matchDynamicRoute('web', '/lenser/open-source-builder')
    const battle = matchDynamicRoute('web', '/battles/gpt-code-review-final/result')

    expect(lens.title).toContain('Github Review Workflow')
    expect(lens.jsonLd['@type']).toBe('CreativeWork')
    expect(lenser.title).toContain('Public Lenser Profile')
    expect(battle.canonicalUrl).toBe('https://moon.lenserfight.com/battles/gpt-code-review-final/result')
  })
})
