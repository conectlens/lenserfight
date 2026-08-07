/**
 * git-log.mjs — parse `git log` output into mechanical commit facts.
 *
 * Deliberately produces no user-facing prose: only SHA, date, author, subject,
 * files-changed, and (best-effort) the PR number embedded in a merge/squash
 * commit subject by GitHub's own conventions. Everything else (category,
 * user impact, verification) comes from a matching .changes/<pr>.md fragment,
 * never from this module.
 */

export const COMMIT_SENTINEL = '@@LF_COMMIT@@'
const FIELD_SEP = '\x1f'

/** Format string for `git log --pretty=format:<this>`, paired with `--name-only`. */
export const GIT_LOG_FORMAT = `${COMMIT_SENTINEL}%H${FIELD_SEP}%h${FIELD_SEP}%aI${FIELD_SEP}%an${FIELD_SEP}%s`

const MERGE_PR_RE = /^Merge pull request #(\d+) from/
const SQUASH_PR_RE = /\(#(\d+)\)\s*$/

/** Extract a GitHub PR number from a commit subject, or null if none is present. */
export function extractPrNumber(subject) {
  const merge = MERGE_PR_RE.exec(subject)
  if (merge) return Number(merge[1])
  const squash = SQUASH_PR_RE.exec(subject)
  if (squash) return Number(squash[1])
  return null
}

const REVERT_RE = /^Revert\s+"(.+)"$/

/** If `subject` is a `git revert` commit, return the original subject it reverts. */
export function extractRevertedSubject(subject) {
  const m = REVERT_RE.exec(subject)
  return m ? m[1] : null
}

const SCOPE_RULES = [
  { prefix: 'apps/web/', scope: 'web' },
  { prefix: 'apps/mobile/', scope: 'mobile' },
  { prefix: 'apps/cli/', scope: 'cli' },
  { prefix: 'apps/gateway/', scope: 'gateway' },
  { prefix: 'apps/docs/', scope: 'docs' },
  { prefix: 'apps/mcp-server/', scope: 'api' },
  { prefix: 'libs/sdk/', scope: 'sdk' },
  { prefix: 'libs/api/', scope: 'api' },
  { prefix: 'supabase/', scope: 'supabase' },
  { prefix: 'docs/', scope: 'docs' },
]

/** Map changed file paths to the fragment `scope` taxonomy, sorted + deduped. */
export function inferComponents(filesChanged) {
  const scopes = new Set()
  for (const file of filesChanged) {
    const rule = SCOPE_RULES.find((r) => file.startsWith(r.prefix))
    scopes.add(rule ? rule.scope : 'infra')
  }
  return [...scopes].sort()
}

/**
 * Parse the raw output of:
 *   git log <range> --name-only --pretty=format:"${GIT_LOG_FORMAT}"
 * into an array of { sha, shortSha, date, author, subject, prNumber, filesChanged }.
 * Pure — takes a string, no process/filesystem access — so it's directly testable
 * against a fixture without spawning git.
 */
export function parseGitLogOutput(raw) {
  if (!raw || !raw.trim()) return []
  const blocks = raw.split(COMMIT_SENTINEL).filter((b) => b.trim().length > 0)
  return blocks.map((block) => {
    const lines = block.split('\n')
    const [sha, shortSha, date, author, subject] = lines[0].split(FIELD_SEP)
    const filesChanged = lines
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    return {
      sha,
      shortSha,
      date,
      author,
      subject,
      prNumber: extractPrNumber(subject),
      revertsSubject: extractRevertedSubject(subject),
      filesChanged,
    }
  })
}
