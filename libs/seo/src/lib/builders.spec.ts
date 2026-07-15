import { describe, expect, it } from 'vitest'
import { seoService } from '@lenserfight/data/repositories'
import type { LensDetailViewModel } from '@lenserfight/types'
import { buildHreflang, buildLensDocument } from './builders'

// Minimal fixture — cast to the view model; the builder only reads the fields
// exercised here (title/description/author/tags/usageCount).
const lens = {
  id: 'abc',
  title: 'Planning Lens',
  description: 'Plan anything',
  status: 'published',
  createdAt: '2026-01-01',
  usageCount: 12,
  author: { displayName: 'Ada', handle: 'ada' },
  tags: [{ name: 'planning', slug: 'planning' }],
} as unknown as LensDetailViewModel

describe('buildHreflang', () => {
  it('emits en/tr/x-default and adds lang=tr correctly', () => {
    const alts = buildHreflang('https://moon.lenserfight.com/lenses/abc')
    expect(alts.map((a) => a.lang)).toEqual(['en', 'tr', 'x-default'])
    expect(alts[1].href).toContain('?lang=tr')
    expect(buildHreflang('https://x/y?q=1')[1].href).toContain('&lang=tr')
  })
})

describe('buildLensDocument', () => {
  it('uses seoService metadata and renders the entity body', () => {
    const doc = buildLensDocument(lens)
    expect(doc.meta.title).toBe(seoService.getPromptMeta(lens).title)
    expect(doc.canonical).toBe('https://moon.lenserfight.com/lenses/abc')
    expect(doc.bodyHtml).toContain('<h1>Planning Lens</h1>')
    expect(doc.bodyHtml).toContain('/lenser/ada')
    expect(doc.bodyHtml).toContain('/ray/planning')
  })
})
