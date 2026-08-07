/**
 * build-main-activity.mjs — assemble the Main Branch Activity ledger.
 *
 * Deterministic and pure: given the same commits/fragments/metadata input,
 * always produces byte-identical output. No Date.now()/Math.random() in the
 * sort or grouping path — "current" is the most recent month *present in the
 * data*, not wall-clock now, so re-running against a fixed historical fixture
 * always reproduces the same split.
 */
import { classifyEntry } from './classify.mjs'
import { inferComponents } from './git-log.mjs'
import { findRevertedShas } from './reverts.mjs'

function yearMonth(isoDate) {
  return isoDate.slice(0, 7) // 'YYYY-MM'
}

/**
 * @param {object} input
 * @param {Array} input.commits - parsed git-log.mjs commits (already deduped by caller if needed)
 * @param {Map<number, object>} input.fragments - prNumber → fragment (from fragments.mjs)
 * @param {Map<number, object>} [input.githubMetaByPr] - prNumber → github-metadata.mjs result
 * @param {(sha: string) => boolean} input.isReleased
 * @param {Set<number>} [input.changelogNonePrs] - PRs carrying the changelog:none label
 */
export function buildMainActivity({
  commits,
  fragments,
  githubMetaByPr = new Map(),
  isReleased,
  changelogNonePrs = new Set(),
}) {
  // Duplicate detection: dedupe by SHA (a range/query overlap must never double-count a commit).
  const bySha = new Map()
  for (const c of commits) {
    if (!bySha.has(c.sha)) bySha.set(c.sha, c)
  }
  const uniqueCommits = [...bySha.values()]

  const revertedBy = findRevertedShas(uniqueCommits)

  const entries = uniqueCommits.map((c) => {
    const fragment = c.prNumber != null ? (fragments.get(c.prNumber) ?? null) : null
    const github = c.prNumber != null ? (githubMetaByPr.get(c.prNumber) ?? null) : null
    const changelogNone = c.prNumber != null && changelogNonePrs.has(c.prNumber)
    const status = classifyEntry({ sha: c.sha, isReleased, fragment, changelogNone })
    return {
      sha: c.sha,
      shortSha: c.shortSha,
      date: c.date,
      author: c.author,
      subject: c.subject,
      prNumber: c.prNumber,
      components: inferComponents(c.filesChanged),
      fragment,
      github,
      status,
      revertedBy: revertedBy.get(c.sha) ?? null,
    }
  })

  // Newest first; SHA as a stable tiebreaker so same-second commits always sort identically.
  entries.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date)
    return dateCmp !== 0 ? dateCmp : a.sha.localeCompare(b.sha)
  })

  if (entries.length === 0) return { current: { yearMonth: null, entries: [] }, archives: [] }

  const currentYearMonth = yearMonth(entries[0].date)
  const byMonth = new Map()
  for (const entry of entries) {
    const ym = yearMonth(entry.date)
    if (!byMonth.has(ym)) byMonth.set(ym, [])
    byMonth.get(ym).push(entry)
  }

  const archives = [...byMonth.entries()]
    .filter(([ym]) => ym !== currentYearMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([ym, monthEntries]) => ({ yearMonth: ym, entries: monthEntries }))

  return {
    current: { yearMonth: currentYearMonth, entries: byMonth.get(currentYearMonth) },
    archives,
  }
}
