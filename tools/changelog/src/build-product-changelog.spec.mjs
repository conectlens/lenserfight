import { describe, expect, it } from 'vitest'

import { aggregateUnreleased, renderUnreleasedSection, cutRelease } from './build-product-changelog.mjs'

function fragment(overrides) {
  return {
    prNumber: 1,
    category: 'feat',
    scope: 'web',
    summary: 'Default summary.',
    userImpact: 'Default impact.',
    breaking: false,
    migration: null,
    docsImpact: 'none',
    ...overrides,
  }
}

describe('aggregateUnreleased', () => {
  it('categorizes fragments into their declared bucket', () => {
    const fragments = new Map([
      [1, fragment({ prNumber: 1, category: 'feat' })],
      [2, fragment({ prNumber: 2, category: 'fix' })],
    ])
    const result = aggregateUnreleased({ fragments, commits: [] })
    expect(result.categories.feat).toHaveLength(1)
    expect(result.categories.fix).toHaveLength(1)
    expect(result.totalCount).toBe(2)
  })

  it('excludes internal-category fragments from the Product Changelog', () => {
    const fragments = new Map([[1, fragment({ prNumber: 1, category: 'internal' })]])
    const result = aggregateUnreleased({ fragments, commits: [] })
    expect(result.totalCount).toBe(0)
  })

  it('excludes fragments already associated with a cut release', () => {
    const fragments = new Map([
      [1, fragment({ prNumber: 1 })],
      [2, fragment({ prNumber: 2 })],
    ])
    const result = aggregateUnreleased({ fragments, commits: [], releasedPrNumbers: new Set([1]) })
    expect(result.totalCount).toBe(1)
    expect(result.categories.feat[0].prNumber).toBe(2)
  })

  it('sorts each category newest-first by associated commit date', () => {
    const fragments = new Map([
      [1, fragment({ prNumber: 1, category: 'fix' })],
      [2, fragment({ prNumber: 2, category: 'fix' })],
    ])
    const commits = [
      { prNumber: 1, date: '2026-08-01T00:00:00Z' },
      { prNumber: 2, date: '2026-08-05T00:00:00Z' },
    ]
    const result = aggregateUnreleased({ fragments, commits })
    expect(result.categories.fix.map((f) => f.prNumber)).toEqual([2, 1])
  })

  it('places fragments with no matching commit date last, ordered by PR number (missing metadata)', () => {
    const fragments = new Map([
      [1, fragment({ prNumber: 1, category: 'fix' })],
      [2, fragment({ prNumber: 2, category: 'fix' })],
    ])
    const commits = [{ prNumber: 1, date: '2026-08-01T00:00:00Z' }]
    const result = aggregateUnreleased({ fragments, commits })
    expect(result.categories.fix.map((f) => f.prNumber)).toEqual([1, 2])
  })

  it('is deterministic across repeated calls on identical input', () => {
    const fragments = new Map([[1, fragment({ prNumber: 1 })]])
    const a = aggregateUnreleased({ fragments, commits: [] })
    const b = aggregateUnreleased({ fragments, commits: [] })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('renderUnreleasedSection', () => {
  it('renders nothing for an empty aggregation', () => {
    const empty = aggregateUnreleased({ fragments: new Map(), commits: [] })
    expect(renderUnreleasedSection(empty)).toBe('')
  })

  it('renders category headings and PR links for populated buckets', () => {
    const fragments = new Map([[42, fragment({ prNumber: 42, category: 'feat', summary: 'CSV export' })]])
    const aggregated = aggregateUnreleased({ fragments, commits: [] })
    const md = renderUnreleasedSection(aggregated)
    expect(md).toContain('### Added')
    expect(md).toContain('CSV export')
    expect(md).toContain('#42')
    expect(md).toContain('/pull/42')
  })

  it('includes migration notes for breaking entries', () => {
    const fragments = new Map([
      [7, fragment({ prNumber: 7, category: 'breaking', breaking: true, migration: 'Bump API client to v2.' })],
    ])
    const aggregated = aggregateUnreleased({ fragments, commits: [] })
    const md = renderUnreleasedSection(aggregated)
    expect(md).toContain('### Breaking Changes')
    expect(md).toContain('Migration: Bump API client to v2.')
  })
})

describe('cutRelease', () => {
  const fragments = new Map([[9, fragment({ prNumber: 9, category: 'feat', summary: 'New thing' })]])
  const aggregated = aggregateUnreleased({ fragments, commits: [] })

  it('inserts the new version section before the first existing version heading', () => {
    const existing = '# Changelog\n\nIntro text.\n\n## [1.0.0] - 2026-01-01\n\nOld stuff.\n'
    const { markdown, releasedPrNumbers } = cutRelease(existing, aggregated, {
      version: '1.1.0',
      date: '2026-08-07',
    })
    const newIndex = markdown.indexOf('## [1.1.0]')
    const oldIndex = markdown.indexOf('## [1.0.0]')
    expect(newIndex).toBeGreaterThan(-1)
    expect(newIndex).toBeLessThan(oldIndex)
    expect(releasedPrNumbers).toEqual([9])
  })

  it('inserts right after a changelog:cut-here marker when present, ignoring later sections', () => {
    const existing =
      '# Changelog\n\nIntro.\n\n## Unreleased\n\nPending.\n\n<!-- changelog:cut-here -->\n\n## Pre-history\n\nLegacy pointer.\n'
    const { markdown } = cutRelease(existing, aggregated, { version: '1.0.0', date: '2026-08-07' })
    const cutIndex = markdown.indexOf('<!-- changelog:cut-here -->')
    const versionIndex = markdown.indexOf('## [1.0.0]')
    const legacyIndex = markdown.indexOf('## Pre-history')
    expect(versionIndex).toBeGreaterThan(cutIndex)
    expect(versionIndex).toBeLessThan(legacyIndex)
  })

  it('appends to the end when this is the first release ever recorded', () => {
    const existing = '# Changelog\n\nIntro text.\n'
    const { markdown } = cutRelease(existing, aggregated, { version: '0.1.0', date: '2026-08-07' })
    expect(markdown).toContain('## [0.1.0] - 2026-08-07')
    expect(markdown.indexOf('Intro text.')).toBeLessThan(markdown.indexOf('## [0.1.0]'))
  })
})
