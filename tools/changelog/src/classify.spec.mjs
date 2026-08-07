import { describe, expect, it } from 'vitest'

import { classifyEntry, makeReleaseChecker } from './classify.mjs'

describe('classifyEntry', () => {
  const notReleased = () => false
  const released = () => true

  it('classifies as Internal when changelogNone is set, regardless of release state', () => {
    expect(classifyEntry({ sha: 'a', isReleased: released, fragment: null, changelogNone: true })).toBe(
      'Internal'
    )
  })

  it('classifies as Internal when the fragment category is internal', () => {
    expect(
      classifyEntry({ sha: 'a', isReleased: notReleased, fragment: { category: 'internal' } })
    ).toBe('Internal')
  })

  it('classifies as Released only when the SHA is reachable from a release tag', () => {
    expect(classifyEntry({ sha: 'a', isReleased: released, fragment: { category: 'feat' } })).toBe(
      'Released'
    )
  })

  it('defaults to Unreleased absent any release/internal evidence', () => {
    expect(classifyEntry({ sha: 'a', isReleased: notReleased, fragment: { category: 'feat' } })).toBe(
      'Unreleased'
    )
  })

  it('does not infer Released from commit content alone — only from isReleased()', () => {
    // A commit with a very "release-sounding" fragment must still be Unreleased
    // if isReleased() (tag-reachability evidence) says no.
    expect(
      classifyEntry({
        sha: 'z',
        isReleased: notReleased,
        fragment: { category: 'feat', summary: 'Released in v2.0.0' },
      })
    ).toBe('Unreleased')
  })
})

describe('makeReleaseChecker', () => {
  it('returns true when the sha is contained in any release tag set', () => {
    const isReleased = makeReleaseChecker([
      { tag: 'cli@1.0.0', shas: new Set(['a', 'b']) },
      { tag: 'sdk@2.0.0', shas: new Set(['c']) },
    ])
    expect(isReleased('b')).toBe(true)
    expect(isReleased('c')).toBe(true)
    expect(isReleased('z')).toBe(false)
  })

  it('returns false for an empty tag list', () => {
    expect(makeReleaseChecker([])('a')).toBe(false)
  })
})
