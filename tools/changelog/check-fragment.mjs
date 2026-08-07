#!/usr/bin/env node
/**
 * tools/changelog/check-fragment.mjs — validate a single fragment file's
 * content against .changes/schema.json. Used by
 * .github/workflows/changelog-gate.yml to validate a PR's fragment without
 * ever checking out or executing code from the PR head (the fragment
 * content is fetched via the GitHub Contents API as inert data).
 *
 * Usage: node tools/changelog/check-fragment.mjs <path-to-fragment-file>
 */
import { readFileSync } from 'node:fs'

import { parseFragmentContent } from './src/fragments.mjs'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node tools/changelog/check-fragment.mjs <path-to-fragment-file>')
  process.exit(1)
}

const raw = readFileSync(filePath, 'utf-8')
const result = parseFragmentContent(raw)

if (!result.valid) {
  console.error('Changelog fragment is invalid:')
  for (const err of result.errors) console.error(`  - ${err}`)
  console.error('\nSee .changes/README.md for the expected format.')
  process.exit(1)
}

console.log(`Fragment OK — category: ${result.fragment.category}, scope: ${result.fragment.scope}`)
