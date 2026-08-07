/**
 * classify.mjs — decide Unreleased / Released / Internal for one commit.
 *
 * Never inferred from the commit message. `Released` requires evidence: the
 * SHA must be reachable from a release tag, or `Internal` requires an
 * explicit fragment/label declaration. Absent evidence → `Unreleased`.
 */

/**
 * @param {object} input
 * @param {string} input.sha
 * @param {(sha: string) => boolean} input.isReleased - true if `sha` is reachable from a release tag
 * @param {{category?: string} | undefined} input.fragment
 * @param {boolean} [input.changelogNone]
 * @returns {'Unreleased' | 'Released' | 'Internal'}
 */
export function classifyEntry({ sha, isReleased, fragment, changelogNone }) {
  if (changelogNone || fragment?.category === 'internal') return 'Internal'
  if (isReleased(sha)) return 'Released'
  return 'Unreleased'
}

/** Build an `isReleased` predicate from a list of { tag, shas: Set<string> }. */
export function makeReleaseChecker(releaseTags) {
  return (sha) => releaseTags.some((rt) => rt.shas.has(sha))
}
