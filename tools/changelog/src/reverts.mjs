/**
 * reverts.mjs — link `git revert` commits back to the commit they revert,
 * by subject-line matching (GitHub's default revert commit message is
 * `Revert "<original subject>"`).
 *
 * A reverted entry must not keep asserting its original user-impact claim —
 * see build-main-activity.mjs, which nulls it out for entries this module
 * marks `revertedBy`.
 */

/**
 * @param {Array<{sha: string, subject: string, revertsSubject: string | null}>} commits
 * @returns {Map<string, string>} sha → the sha of the commit that reverted it
 */
export function findRevertedShas(commits) {
  const bySubject = new Map()
  for (const c of commits) {
    if (!bySubject.has(c.subject)) bySubject.set(c.subject, [])
    bySubject.get(c.subject).push(c.sha)
  }

  const revertedBy = new Map()
  for (const c of commits) {
    if (!c.revertsSubject) continue
    const candidates = bySubject.get(c.revertsSubject)
    if (!candidates) continue
    // The reverted commit must have happened before the revert.
    const original = candidates.find((sha) => sha !== c.sha && !revertedBy.has(sha))
    if (original) revertedBy.set(original, c.sha)
  }
  return revertedBy
}
