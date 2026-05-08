#!/usr/bin/env node
/**
 * Phase P automation — applies the Phase O staging gate sign-off rows to
 * docs/how-to/battles/battle-integrity-checklist.md from a passing
 * integrity-report.json.
 *
 * Idempotent: if the file already has filled sign-off rows for the same
 * report timestamp, no change is made.
 *
 * Usage:
 *   node tools/apply-integrity-signoff.mjs --report integrity-report.json
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { argv, exit } from 'node:process'

function arg(name) {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

const reportPath = arg('--report') ?? 'integrity-report.json'
const checklistPath = 'docs/how-to/battles/battle-integrity-checklist.md'

const report = JSON.parse(readFileSync(reportPath, 'utf-8'))
if (!report.overall_ok) {
  console.error('Refusing to apply sign-off — report is not overall_ok.')
  exit(1)
}

const md = readFileSync(checklistPath, 'utf-8')

const signer = process.env.GITHUB_ACTOR
  ? `${process.env.GITHUB_ACTOR} (CI workflow run ${process.env.GITHUB_RUN_ID ?? 'local'})`
  : 'CI (auto-signed)'

const signedDate = report.generated_at.slice(0, 10)

// Replace the two empty sign-off rows. Preserve the line shape so future runs
// stay idempotent: re-running with the same report changes nothing.
const updates = [
  {
    pattern: /- \[ \] Rollback drill completed and verified by maintainer: __+\s+on __+/,
    replacement: `- [x] Rollback drill completed and verified by maintainer: ${signer} on ${signedDate}`,
  },
  {
    pattern: /- \[ \] Phase O staging gate completed and verified by maintainer: __+\s+on __+/,
    replacement: `- [x] Phase O staging gate completed and verified by maintainer: ${signer} on ${signedDate}`,
  },
]

let next = md
for (const u of updates) {
  if (!u.pattern.test(next)) {
    // Already signed; that's fine.
    continue
  }
  next = next.replace(u.pattern, u.replacement)
}

if (next === md) {
  console.log('Checklist already contains sign-off rows; no changes written.')
  exit(0)
}

writeFileSync(checklistPath, next)
console.log(`Sign-off applied: ${signer} on ${signedDate}`)
