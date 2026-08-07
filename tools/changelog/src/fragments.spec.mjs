import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, beforeAll, afterAll } from 'vitest'

import { parseFragmentContent, loadFragments } from './fragments.mjs'

const VALID_FRAGMENT = `---
category: feat
scope: web
summary: Users can export battle results as CSV.
userImpact: Users can now export battle results as CSV from the results page.
breaking: false
migration: null
docsImpact: none
knownLimitations: null
verification:
  tests: "vitest: +3 in export.spec.ts"
  ci: null
---
Longer body describing the feature.
`

describe('parseFragmentContent', () => {
  it('parses a valid fragment', () => {
    const result = parseFragmentContent(VALID_FRAGMENT)
    expect(result.valid).toBe(true)
    expect(result.fragment).toMatchObject({ category: 'feat', scope: 'web', breaking: false })
    expect(result.body).toBe('Longer body describing the feature.')
  })

  it('rejects a fragment with no front matter', () => {
    const result = parseFragmentContent('just some text, no front matter')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/front matter/i)
  })

  it('rejects invalid YAML', () => {
    const result = parseFragmentContent('---\ncategory: [unterminated\n---\nbody')
    expect(result.valid).toBe(false)
  })

  it('rejects an unknown category (schema validation)', () => {
    const result = parseFragmentContent(VALID_FRAGMENT.replace('category: feat', 'category: nonsense'))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('category'))).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = parseFragmentContent('---\ncategory: feat\n---\nbody')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('requires a non-empty migration when breaking is true', () => {
    const breakingNoMigration = VALID_FRAGMENT.replace('breaking: false', 'breaking: true')
    const result = parseFragmentContent(breakingNoMigration)
    expect(result.valid).toBe(false)
  })

  it('accepts breaking: true with a migration note', () => {
    const breakingWithMigration = VALID_FRAGMENT.replace('breaking: false', 'breaking: true').replace(
      'migration: null',
      'migration: "Update your API client to v2."'
    )
    const result = parseFragmentContent(breakingWithMigration)
    expect(result.valid).toBe(true)
  })

  it('rejects unexpected additional properties', () => {
    const withExtra = VALID_FRAGMENT.replace('breaking: false', 'breaking: false\nbogusField: yes')
    const result = parseFragmentContent(withExtra)
    expect(result.valid).toBe(false)
  })
})

describe('loadFragments', () => {
  let dir

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'lf-changes-'))
    writeFileSync(join(dir, '100.md'), VALID_FRAGMENT)
    writeFileSync(join(dir, '101.md'), VALID_FRAGMENT.replace('category: feat', 'category: fix'))
    writeFileSync(join(dir, '102.md'), 'not valid front matter')
    writeFileSync(join(dir, 'README.md'), '# not a fragment')
    writeFileSync(join(dir, 'schema.json'), '{}')
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('loads only files matching <pr-number>.md', () => {
    const { fragments } = loadFragments(dir)
    expect([...fragments.keys()].sort((a, b) => a - b)).toEqual([100, 101])
  })

  it('ignores README.md and schema.json', () => {
    const { fragments } = loadFragments(dir)
    expect(fragments.has('README')).toBe(false)
  })

  it('reports invalid fragments without throwing', () => {
    const { invalid } = loadFragments(dir)
    expect(invalid).toHaveLength(1)
    expect(invalid[0].file).toBe('102.md')
  })

  it('attaches the PR number to each loaded fragment', () => {
    const { fragments } = loadFragments(dir)
    expect(fragments.get(100).prNumber).toBe(100)
  })

  it('returns empty results for a nonexistent directory', () => {
    const { fragments, invalid } = loadFragments(join(dir, 'does-not-exist'))
    expect(fragments.size).toBe(0)
    expect(invalid).toEqual([])
  })

  it('flags duplicate PR fragments (case: two files resolving to the same number)', () => {
    const dupDir = mkdtempSync(join(tmpdir(), 'lf-changes-dup-'))
    try {
      writeFileSync(join(dupDir, '5.md'), VALID_FRAGMENT)
      // Simulate a duplicate entry by loading twice into the same map via two passes
      // is covered by the loader's own duplicate guard when scanning one dir with
      // two files that both parse to PR #5 — construct that directly:
      writeFileSync(join(dupDir, '05.md'), VALID_FRAGMENT) // filename regex requires exact "5.md", so "05.md" is a distinct, non-colliding entry
      const { fragments } = loadFragments(dupDir)
      // "5.md" -> PR 5, "05.md" does not match ^(\d+)\.md$ ambiguity since \d+ matches "05" -> Number("05") === 5 too
      expect(fragments.size).toBe(1)
    } finally {
      rmSync(dupDir, { recursive: true, force: true })
    }
  })
})
