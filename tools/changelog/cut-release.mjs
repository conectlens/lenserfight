#!/usr/bin/env node
/**
 * tools/changelog/cut-release.mjs — manual maintainer step that stamps the
 * current Unreleased aggregation into a dated Product Changelog version
 * section. Deliberately NOT run automatically on push — the Product
 * Changelog is human-curated; only a maintainer decides when something is
 * "released" in the platform-changelog sense.
 *
 * Usage: pnpm changelog:cut <version> [--date=YYYY-MM-DD]
 *   e.g. pnpm changelog:cut 2026.08.0
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { aggregateUnreleased, cutRelease } from './src/build-product-changelog.mjs'
import { loadFragments } from './src/fragments.mjs'
import { getMainCommits } from './src/run-git.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const CHANGES_DIR = resolve(REPO_ROOT, '.changes')
const RELEASED_FILE = resolve(CHANGES_DIR, 'RELEASED.json')
const CHANGELOG_FILES = [
  resolve(REPO_ROOT, 'docs/en/changelog.md'),
  // docs/tr/changelog.md is authored separately by a translator/maintainer —
  // this script only stamps the canonical English source of truth.
]

function loadReleasedPrNumbers() {
  if (!existsSync(RELEASED_FILE)) return new Set()
  try {
    return new Set(JSON.parse(readFileSync(RELEASED_FILE, 'utf-8')))
  } catch {
    return new Set()
  }
}

function main() {
  const version = process.argv[2]
  if (!version) {
    console.error('Usage: pnpm changelog:cut <version> [--date=YYYY-MM-DD]')
    process.exit(1)
  }
  const dateArg = process.argv.find((a) => a.startsWith('--date='))
  const date = dateArg ? dateArg.slice('--date='.length) : new Date().toISOString().slice(0, 10)

  const commits = getMainCommits(REPO_ROOT)
  const { fragments, invalid } = loadFragments(CHANGES_DIR)
  if (invalid.length > 0) {
    console.error(`Refusing to cut a release: ${invalid.length} fragment(s) fail validation.`)
    for (const { file, errors } of invalid) console.error(`  - ${file}: ${errors.join('; ')}`)
    process.exit(1)
  }

  const releasedPrNumbers = loadReleasedPrNumbers()
  const aggregated = aggregateUnreleased({ fragments, commits, releasedPrNumbers })

  if (aggregated.totalCount === 0) {
    console.log('Nothing to cut — no unreleased, non-internal fragments found.')
    process.exit(0)
  }

  for (const file of CHANGELOG_FILES) {
    const existing = existsSync(file) ? readFileSync(file, 'utf-8') : '# Changelog\n'
    const { markdown, releasedPrNumbers: newlyReleased } = cutRelease(existing, aggregated, {
      version,
      date,
    })
    writeFileSync(file, markdown)
    console.log(`Wrote v${version} (${date}) to ${file} — ${newlyReleased.length} entries.`)

    for (const pr of newlyReleased) releasedPrNumbers.add(pr)
  }

  writeFileSync(RELEASED_FILE, JSON.stringify([...releasedPrNumbers].sort((a, b) => a - b), null, 2) + '\n')
  console.log(`Updated ${RELEASED_FILE}. Review the diff, then commit and open a PR.`)
}

main()
