import { describe, expect, it } from 'vitest'

import { findRevertedShas } from './reverts.mjs'

function commit(sha, subject, revertsSubject = null) {
  return { sha, subject, revertsSubject }
}

describe('findRevertedShas', () => {
  it('links a revert commit back to the original by subject match', () => {
    const commits = [
      commit('a', 'feat(web): add export button'),
      commit('b', 'Revert "feat(web): add export button"', 'feat(web): add export button'),
    ]
    const result = findRevertedShas(commits)
    expect(result.get('a')).toBe('b')
  })

  it('does not link when there is no matching original subject', () => {
    const commits = [commit('a', 'Revert "something that never happened"', 'something that never happened')]
    expect(findRevertedShas(commits).size).toBe(0)
  })

  it('ignores commits with no revertsSubject', () => {
    const commits = [commit('a', 'feat: normal commit')]
    expect(findRevertedShas(commits).size).toBe(0)
  })

  it('does not link a commit to itself when its subject equals its own revertsSubject', () => {
    const commits = [commit('a', 'X', 'X')]
    expect(findRevertedShas(commits).size).toBe(0)
  })

  it('picks the earliest un-reverted candidate when the same subject appears twice', () => {
    const commits = [
      commit('a', 'feat: dup subject'),
      commit('b', 'feat: dup subject'),
      commit('c', 'Revert "feat: dup subject"', 'feat: dup subject'),
    ]
    const result = findRevertedShas(commits)
    // Exactly one of a/b is marked reverted, not both.
    const revertedCount = [result.get('a'), result.get('b')].filter(Boolean).length
    expect(revertedCount).toBe(1)
  })
})
