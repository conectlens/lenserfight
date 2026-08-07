import { describe, expect, it } from 'vitest'

import { buildMainActivity } from './build-main-activity.mjs'

function commit(overrides) {
  return {
    sha: 'sha-default',
    shortSha: 'shadef',
    date: '2026-08-01T10:00:00+00:00',
    author: 'Alice',
    subject: 'feat: default',
    prNumber: null,
    filesChanged: [],
    revertsSubject: null,
    ...overrides,
  }
}

describe('buildMainActivity', () => {
  it('sorts entries newest first', () => {
    const result = buildMainActivity({
      commits: [
        commit({ sha: 'old', date: '2026-08-01T09:00:00+00:00' }),
        commit({ sha: 'new', date: '2026-08-01T11:00:00+00:00' }),
      ],
      fragments: new Map(),
      isReleased: () => false,
    })
    expect(result.current.entries.map((e) => e.sha)).toEqual(['new', 'old'])
  })

  it('breaks same-timestamp ties deterministically by SHA', () => {
    const t = '2026-08-01T10:00:00+00:00'
    const result = buildMainActivity({
      commits: [commit({ sha: 'zzz', date: t }), commit({ sha: 'aaa', date: t })],
      fragments: new Map(),
      isReleased: () => false,
    })
    expect(result.current.entries.map((e) => e.sha)).toEqual(['aaa', 'zzz'])
  })

  it('deduplicates commits sharing the same SHA (duplicate detection)', () => {
    const result = buildMainActivity({
      commits: [commit({ sha: 'dup' }), commit({ sha: 'dup' }), commit({ sha: 'other' })],
      fragments: new Map(),
      isReleased: () => false,
    })
    expect(result.current.entries).toHaveLength(2)
  })

  it('associates release status via the isReleased predicate, not commit content', () => {
    const result = buildMainActivity({
      commits: [commit({ sha: 'shipped' }), commit({ sha: 'pending' })],
      fragments: new Map(),
      isReleased: (sha) => sha === 'shipped',
    })
    const bySha = Object.fromEntries(result.current.entries.map((e) => [e.sha, e.status]))
    expect(bySha.shipped).toBe('Released')
    expect(bySha.pending).toBe('Unreleased')
  })

  it('marks changelog:none PRs and internal-category fragments as Internal', () => {
    const result = buildMainActivity({
      commits: [
        commit({ sha: 'a', prNumber: 1 }),
        commit({ sha: 'b', prNumber: 2 }),
      ],
      fragments: new Map([[2, { category: 'internal', prNumber: 2 }]]),
      isReleased: () => false,
      changelogNonePrs: new Set([1]),
    })
    const bySha = Object.fromEntries(result.current.entries.map((e) => [e.sha, e.status]))
    expect(bySha.a).toBe('Internal')
    expect(bySha.b).toBe('Internal')
  })

  it('marks reverted entries with revertedBy and leaves their status classification intact', () => {
    const result = buildMainActivity({
      commits: [
        commit({ sha: 'orig', subject: 'feat: X', date: '2026-08-01T09:00:00+00:00' }),
        commit({
          sha: 'rev',
          subject: 'Revert "feat: X"',
          revertsSubject: 'feat: X',
          date: '2026-08-01T10:00:00+00:00',
        }),
      ],
      fragments: new Map(),
      isReleased: () => false,
    })
    const orig = result.current.entries.find((e) => e.sha === 'orig')
    expect(orig.revertedBy).toBe('rev')
  })

  it('renders null fragment/github fields when no evidence exists (missing metadata)', () => {
    const result = buildMainActivity({
      commits: [commit({ sha: 'bare', prNumber: 999 })],
      fragments: new Map(),
      githubMetaByPr: new Map(),
      isReleased: () => false,
    })
    expect(result.current.entries[0].fragment).toBeNull()
    expect(result.current.entries[0].github).toBeNull()
  })

  it('splits entries into a current month and older-month archives', () => {
    const result = buildMainActivity({
      commits: [
        commit({ sha: 'aug', date: '2026-08-15T10:00:00+00:00' }),
        commit({ sha: 'jul', date: '2026-07-20T10:00:00+00:00' }),
        commit({ sha: 'jun', date: '2026-06-05T10:00:00+00:00' }),
      ],
      fragments: new Map(),
      isReleased: () => false,
    })
    expect(result.current.yearMonth).toBe('2026-08')
    expect(result.current.entries.map((e) => e.sha)).toEqual(['aug'])
    expect(result.archives.map((a) => a.yearMonth)).toEqual(['2026-07', '2026-06'])
    expect(result.archives[0].entries.map((e) => e.sha)).toEqual(['jul'])
  })

  it('returns an empty current bucket and no archives for zero commits', () => {
    const result = buildMainActivity({ commits: [], fragments: new Map(), isReleased: () => false })
    expect(result.current.entries).toEqual([])
    expect(result.archives).toEqual([])
  })

  it('is deterministic: identical input produces byte-identical output across runs', () => {
    const input = {
      commits: [
        commit({ sha: 'a', date: '2026-08-01T10:00:00+00:00', prNumber: 1 }),
        commit({ sha: 'b', date: '2026-07-01T10:00:00+00:00', prNumber: 2 }),
      ],
      fragments: new Map([[1, { category: 'feat', prNumber: 1 }]]),
      isReleased: () => false,
    }
    const first = buildMainActivity(input)
    const second = buildMainActivity(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
