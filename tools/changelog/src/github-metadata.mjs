/**
 * github-metadata.mjs — best-effort PR enrichment via `gh api`.
 *
 * Every call degrades cleanly: missing `gh`, no auth, rate limiting, or a
 * network failure all resolve to `{ available: false }` rather than
 * throwing, so the generation pipeline never fails a build over this.
 */
import { execFileSync } from 'node:child_process'

function defaultExec(prNumber) {
  const out = execFileSync(
    'gh',
    [
      'api',
      `repos/{owner}/{repo}/pulls/${prNumber}`,
      '--jq',
      '{title: .title, labels: [.labels[].name], mergedAt: .merged_at, url: .html_url}',
    ],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
  )
  return JSON.parse(out)
}

/**
 * @param {number} prNumber
 * @param {{ exec?: (prNumber: number) => object }} [opts] - injectable for tests
 * @returns {{ available: boolean, title?: string, labels?: string[], mergedAt?: string, url?: string }}
 */
export function fetchPrMetadata(prNumber, opts = {}) {
  const exec = opts.exec ?? defaultExec
  try {
    const data = exec(prNumber)
    return { available: true, ...data }
  } catch {
    return { available: false }
  }
}

/** Fetch metadata for many PRs, tolerating individual failures independently. */
export function fetchManyPrMetadata(prNumbers, opts = {}) {
  const result = new Map()
  for (const n of prNumbers) {
    result.set(n, fetchPrMetadata(n, opts))
  }
  return result
}
