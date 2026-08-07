/**
 * render-labels.mjs — pure formatting helpers that enforce "no fabricated
 * evidence": every field renders an explicit placeholder rather than a
 * guess when the underlying data is missing.
 */

export const NOT_DECLARED = 'Not declared'
export const VERIFICATION_UNAVAILABLE = 'Verification unavailable'

/** Category as shown on the ledger — never inferred, only from a fragment. */
export function formatCategory(entry) {
  return entry.fragment?.category ?? NOT_DECLARED
}

/** Verification evidence — only ever what the fragment/CI explicitly declared. */
export function formatVerification(entry) {
  const v = entry.fragment?.verification
  if (!v || (!v.tests && !v.ci)) return VERIFICATION_UNAVAILABLE
  return [v.tests, v.ci].filter(Boolean).join(' · ')
}

/** User impact — never derived from the commit subject. */
export function formatUserImpact(entry) {
  if (entry.revertedBy) return `Reverted by ${entry.revertedBy.slice(0, 7)} — original claim withdrawn.`
  return entry.fragment?.userImpact ?? NOT_DECLARED
}

/** PR title — from GitHub metadata only; never the commit subject as a stand-in. */
export function formatPrTitle(entry) {
  return entry.github?.title ?? NOT_DECLARED
}
