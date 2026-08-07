#!/usr/bin/env node
/**
 * tools/changelog/cli.mjs — build-time generation entry point.
 *
 * Wired into `nx build docs` (apps/docs/project.json) as a step that runs
 * before `vitepress build`, so the Main Branch Activity ledger and the
 * Unreleased Product Changelog aggregation are always fresh for whatever
 * platform builds apps/docs — no bot commit, nothing written back to git.
 *
 * Resilience: every external dependency (git, `gh`) degrades to an empty/
 * "not declared" result on failure rather than failing the build. Missing
 * GH_TOKEN/gh simply means PR titles/labels render "Not declared" — see
 * tools/changelog/src/render-labels.mjs.
 *
 * Usage: node tools/changelog/cli.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildMainActivity } from './src/build-main-activity.mjs'
import { aggregateUnreleased } from './src/build-product-changelog.mjs'
import { makeReleaseChecker } from './src/classify.mjs'
import { loadFragments } from './src/fragments.mjs'
import { fetchManyPrMetadata } from './src/github-metadata.mjs'
import { getMainCommits, getReleaseTags } from './src/run-git.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const CHANGES_DIR = resolve(REPO_ROOT, '.changes')
const RELEASED_FILE = resolve(CHANGES_DIR, 'RELEASED.json')
// Written under docs/public/ (VitePress's srcDir) so it's copied verbatim to
// the site root and fetched client-side by MainBranchActivity.vue /
// LatestUpdates.vue — same pattern as docs/public/llms.txt, docs/public/r/.
// Keeping this out of the Vite build-time import graph means a fresh
// checkout that hasn't run generation yet still builds/typechecks cleanly.
const OUT_DIR = resolve(REPO_ROOT, 'docs/public/changelog-data')

// Cap GitHub API enrichment to a bounded recent window so a token-less or
// rate-limited environment (the external platform building apps/docs may
// have neither) never turns generation into a slow/failing step.
const GITHUB_ENRICHMENT_WINDOW = 60

function loadReleasedPrNumbers() {
  if (!existsSync(RELEASED_FILE)) return new Set()
  try {
    const data = JSON.parse(readFileSync(RELEASED_FILE, 'utf-8'))
    return new Set(Array.isArray(data) ? data : [])
  } catch {
    return new Set()
  }
}

function githubEnrichmentAvailable() {
  return Boolean(process.env['GH_TOKEN'] || process.env['GITHUB_TOKEN'])
}

function main() {
  const commits = getMainCommits(REPO_ROOT)
  const releaseTags = getReleaseTags(REPO_ROOT)
  const isReleased = makeReleaseChecker(releaseTags)
  const { fragments, invalid } = loadFragments(CHANGES_DIR)

  if (invalid.length > 0) {
    console.warn(`[tools/changelog] ${invalid.length} fragment(s) failed validation and were skipped:`)
    for (const { file, errors } of invalid) console.warn(`  - ${file}: ${errors.join('; ')}`)
  }

  let githubMetaByPr = new Map()
  if (githubEnrichmentAvailable()) {
    const recentPrNumbers = [
      ...new Set(commits.slice(0, GITHUB_ENRICHMENT_WINDOW).map((c) => c.prNumber).filter(Boolean)),
    ]
    githubMetaByPr = fetchManyPrMetadata(recentPrNumbers)
  } else {
    console.warn('[tools/changelog] GH_TOKEN/GITHUB_TOKEN not set — PR titles/labels render "Not declared".')
  }

  const changelogNonePrs = new Set(
    [...githubMetaByPr.entries()]
      .filter(([, meta]) => meta.available && meta.labels?.includes('changelog:none'))
      .map(([pr]) => pr)
  )

  const mainActivity = buildMainActivity({
    commits,
    fragments,
    githubMetaByPr,
    isReleased,
    changelogNonePrs,
  })

  const releasedPrNumbers = loadReleasedPrNumbers()
  const unreleased = aggregateUnreleased({ fragments, commits, releasedPrNumbers })

  const latestUpdates = commits
    .filter((c) => c.prNumber != null && isReleased(c.sha))
    .map((c) => ({ commit: c, fragment: fragments.get(c.prNumber) }))
    .filter(({ fragment }) => fragment && fragment.category !== 'internal')
    .sort((a, b) => b.commit.date.localeCompare(a.commit.date))
    .slice(0, 3)
    .map(({ commit, fragment }) => ({
      prNumber: commit.prNumber,
      date: commit.date,
      category: fragment.category,
      summary: fragment.summary,
      userImpact: fragment.userImpact,
      url: `https://github.com/conectlens/lenserfight/pull/${commit.prNumber}`,
    }))

  mkdirSync(OUT_DIR, { recursive: true })
  const generatedAt = process.env['LF_CHANGELOG_GENERATED_AT'] ?? new Date().toISOString()

  // Archives are written as separate, on-demand files (index only in the main
  // payload) so the ledger page's initial fetch stays small — see
  // "Add monthly or version-based archives so the rendered pages remain fast".
  const archiveIndex = mainActivity.archives.map((a) => ({ yearMonth: a.yearMonth, count: a.entries.length }))
  for (const archive of mainActivity.archives) {
    writeFileSync(
      resolve(OUT_DIR, `main-activity-archive-${archive.yearMonth}.json`),
      JSON.stringify({ generatedAt, yearMonth: archive.yearMonth, entries: archive.entries }, null, 2)
    )
  }
  writeFileSync(
    resolve(OUT_DIR, 'main-activity.json'),
    JSON.stringify({ generatedAt, current: mainActivity.current, archives: archiveIndex }, null, 2)
  )
  writeFileSync(
    resolve(OUT_DIR, 'changelog-unreleased.json'),
    JSON.stringify({ generatedAt, ...unreleased }, null, 2)
  )
  writeFileSync(resolve(OUT_DIR, 'latest-updates.json'), JSON.stringify({ generatedAt, latestUpdates }, null, 2))

  console.log(
    `[tools/changelog] wrote ${mainActivity.current.entries.length} current-month entries, ` +
      `${mainActivity.archives.length} archive month(s), ${unreleased.totalCount} unreleased changelog item(s).`
  )
}

main()
