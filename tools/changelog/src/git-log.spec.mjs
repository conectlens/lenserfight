import { describe, expect, it } from 'vitest'

import {
  COMMIT_SENTINEL,
  extractPrNumber,
  extractRevertedSubject,
  inferComponents,
  parseGitLogOutput,
} from './git-log.mjs'

const SEP = '\x1f'

function fixtureBlock({ sha, short, date, author, subject, files = [] }) {
  return `${COMMIT_SENTINEL}${sha}${SEP}${short}${SEP}${date}${SEP}${author}${SEP}${subject}\n${files.join('\n')}`
}

describe('extractPrNumber', () => {
  it('extracts from a GitHub merge-commit subject', () => {
    expect(extractPrNumber('Merge pull request #482 from conectlens/fix/thing')).toBe(482)
  })

  it('extracts from a squash-merge subject', () => {
    expect(extractPrNumber('fix(cli): handle empty config (#501)')).toBe(501)
  })

  it('returns null when no PR number is present', () => {
    expect(extractPrNumber('chore: bump deps')).toBeNull()
  })
})

describe('extractRevertedSubject', () => {
  it('extracts the original subject from a revert commit', () => {
    expect(extractRevertedSubject('Revert "feat(web): add export button"')).toBe(
      'feat(web): add export button'
    )
  })

  it('returns null for a non-revert subject', () => {
    expect(extractRevertedSubject('feat(web): add export button')).toBeNull()
  })
})

describe('inferComponents', () => {
  it('maps file paths to scopes and dedupes', () => {
    expect(
      inferComponents(['apps/web/src/App.tsx', 'apps/web/src/index.tsx', 'libs/sdk/src/index.ts'])
    ).toEqual(['sdk', 'web'])
  })

  it('falls back to infra for unrecognized paths', () => {
    expect(inferComponents(['eslint.config.js'])).toEqual(['infra'])
  })

  it('returns an empty array for no files', () => {
    expect(inferComponents([])).toEqual([])
  })
})

describe('parseGitLogOutput', () => {
  it('parses a single commit block with files', () => {
    const raw = fixtureBlock({
      sha: 'a'.repeat(40),
      short: 'aaaaaaa',
      date: '2026-08-01T10:00:00+00:00',
      author: 'Alice',
      subject: 'feat(web): add export button (#100)',
      files: ['apps/web/src/App.tsx'],
    })
    const result = parseGitLogOutput(raw)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      sha: 'a'.repeat(40),
      shortSha: 'aaaaaaa',
      author: 'Alice',
      prNumber: 100,
      filesChanged: ['apps/web/src/App.tsx'],
    })
  })

  it('parses multiple commits in one log dump', () => {
    const raw =
      fixtureBlock({
        sha: 'a'.repeat(40),
        short: 'aaaaaaa',
        date: '2026-08-02T10:00:00+00:00',
        author: 'Alice',
        subject: 'feat: one (#1)',
        files: ['apps/web/a.ts'],
      }) +
      fixtureBlock({
        sha: 'b'.repeat(40),
        short: 'bbbbbbb',
        date: '2026-08-01T10:00:00+00:00',
        author: 'Bob',
        subject: 'fix: two (#2)',
        files: ['apps/cli/b.ts'],
      })
    const result = parseGitLogOutput(raw)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.prNumber)).toEqual([1, 2])
  })

  it('returns an empty array for empty input', () => {
    expect(parseGitLogOutput('')).toEqual([])
    expect(parseGitLogOutput('   \n  ')).toEqual([])
  })

  it('handles a commit with no changed files', () => {
    const raw = fixtureBlock({
      sha: 'c'.repeat(40),
      short: 'ccccccc',
      date: '2026-08-01T10:00:00+00:00',
      author: 'Carol',
      subject: 'docs: typo',
      files: [],
    })
    expect(parseGitLogOutput(raw)[0].filesChanged).toEqual([])
  })
})
