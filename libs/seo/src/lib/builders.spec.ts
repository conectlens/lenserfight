import { describe, expect, it } from 'vitest'
import { buildLensDocument, buildLenserDocument, buildRayDocument } from './builders'
import { renderBotHtml } from './renderDocument'
import { seoService } from './meta/seoService'

describe('buildLensDocument', () => {
  const lens = {
    id: 'lens-1',
    title: 'AI Agent Planner',
    description: 'Plans multi-step agent tasks.',
    author: { displayName: 'Ada', handle: 'ada' },
    tags: [{ name: 'agents', slug: 'agents' }],
    usageCount: 12,
    createdAt: '2026-07-01T00:00:00Z',
    status: 'published',
  }

  it('uses seoService for meta and sets an absolute canonical', () => {
    const doc = buildLensDocument(lens)
    expect(doc.meta.title).toBe(seoService.getPromptMeta(lens as never).title)
    expect(doc.canonical).toBe('https://moon.lenserfight.com/lenses/lens-1')
    expect(doc.ogType).toBe('article')
    expect(doc.hreflang.map((h) => h.lang)).toEqual(['en', 'tr', 'x-default'])
  })

  it('renders a crawlable body with H1, author link and tag link', () => {
    const html = renderBotHtml(buildLensDocument(lens))
    expect(html).toContain('<h1>AI Agent Planner</h1>')
    expect(html).toContain('href="https://moon.lenserfight.com/lenser/ada"')
    expect(html).toContain('href="https://moon.lenserfight.com/ray/agents"')
  })
})

describe('renderBotHtml', () => {
  it('emits title, canonical, robots, OG, Twitter and JSON-LD', () => {
    const html = renderBotHtml(buildRayDocument({ name: 'Agents', slug: 'agents', count: 5 }))
    expect(html).toContain('<title>')
    expect(html).toContain('<link rel="canonical" href="https://moon.lenserfight.com/ray/agents" />')
    expect(html).toContain('content="index,follow,max-image-preview:large"')
    expect(html).toContain('property="og:type"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('application/ld+json')
  })

  it('honors index:false as noindex (private workflow via seoService)', () => {
    const doc = buildLenserDocument({ handle: 'x', display_name: 'X' })
    // profiles are indexable; assert the robots wiring by forcing index:false
    const noindex = renderBotHtml({ ...doc, meta: { ...doc.meta, index: false } })
    expect(noindex).toContain('content="noindex,nofollow"')
  })

  it('escapes user content to prevent tag/script breakout', () => {
    const html = renderBotHtml(
      buildLensDocument({
        id: 'x',
        title: '</title><script>alert(1)</script>',
        author: { displayName: 'a', handle: 'a' },
      }),
    )
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
