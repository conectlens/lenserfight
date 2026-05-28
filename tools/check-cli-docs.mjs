#!/usr/bin/env node
/**
 * check-cli-docs.mjs — Lightweight, read-only audit that fails CI when:
 *   1. A subcommand registered in apps/cli/src/main.ts has no doc page.
 *   2. A doc page in docs/en/reference/cli/ references a command that no
 *      longer exists in main.ts (drift in the other direction).
 *
 * Unlike `gen-cli-docs.mjs`, this script never mutates files — it is safe
 * to run on protected branches and inside CI without surprises. Use the
 * generator when you want to refresh AUTO-GEN blocks; use this checker
 * when you want a coverage gate.
 *
 * Usage:
 *   node tools/check-cli-docs.mjs            # report + non-zero exit on drift
 *   node tools/check-cli-docs.mjs --json     # machine-readable output
 *
 * Recognized non-command pages (kept regardless of CLI presence):
 *   - index.md, cli-reference.md   (overviews)
 *   - configuration.md             (concept page)
 *   - execution-modes.md           (concept page)
 *   - global-flags.md              (concept page)
 *   - safety-gates.md              (concept page)
 *   - agent.md, runner.md          (deprecated aliases — still in main.ts)
 *   - agent-lifecycle.md           (concept page)
 *   - lenses-discovery.md          (concept page)
 *   - automation-rules.md          (concept page)
 *   - local-battle-key.md          (config subcommand)
 *   - webhook-secret.md            (config subcommand)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const MAIN_TS = resolve(repoRoot, 'apps/cli/src/commands') // existence sanity
const MAIN_FILE = resolve(repoRoot, 'apps/cli/src/main.ts')
const DOCS_DIR = resolve(repoRoot, 'docs/en/reference/cli')

const jsonMode = process.argv.includes('--json')

// Concept pages and subcommand pages that intentionally do not map 1:1
// to a top-level CLI command. Kept here rather than auto-derived to make
// drift visible: when a concept page is removed, this list must shrink.
const CONCEPT_PAGES = new Set([
  'index',
  'cli-reference',
  'configuration',
  'execution-modes',
  'global-flags',
  'safety-gates',
  'agent-lifecycle',
  'lenses-discovery',
  'automation-rules',
  'local-battle-key', // lf config local-battle-key
  'webhook-secret',   // lf config webhook-secret
  'community',        // social/feed grab-bag page
])

// ─── 1. Read registered subcommands from main.ts ──────────────────────────

if (!existsSync(MAIN_FILE)) {
  console.error(`main.ts not found at ${MAIN_FILE}`)
  process.exit(2)
}
if (!existsSync(MAIN_TS)) {
  console.error(`commands dir not found at ${MAIN_TS}`)
  process.exit(2)
}

const mainSrc = readFileSync(MAIN_FILE, 'utf-8')

// Match either `name: () => import(...)` or `'name': () => import(...)`.
// Restrict to the subCommands block to avoid catching unrelated identifiers.
const subBlockMatch = mainSrc.match(/subCommands\s*:\s*\{([\s\S]*?)\n\s*\}\s*,?\s*\n/)
if (!subBlockMatch) {
  console.error('Could not locate subCommands block in main.ts')
  process.exit(2)
}
const subBlock = subBlockMatch[1]
// Match each line that begins a subcommand registration:
//   name: () => import(...).then(...)
//   'name-with-dashes': () => import(...).then(...)
//   name: someIdentifier,         (e.g. deprecated aliases)
// The first form covers the common case; the second covers
// `runner: runnerDeprecatedCommand` and `agent: agentDeprecatedCommand`.
const lineRe = /^\s*(?:'([\w-]+)'|([\w-]+))\s*:\s*(?:\(\s*\)\s*=>|[A-Za-z_][\w$]*\s*,)/gm
const registered = new Set()
let m
while ((m = lineRe.exec(subBlock)) !== null) {
  registered.add(m[1] || m[2])
}

if (registered.size === 0) {
  console.error('Parsed zero subcommands from main.ts — parser may be broken')
  process.exit(2)
}

// ─── 2. Read doc filenames ─────────────────────────────────────────────────

if (!existsSync(DOCS_DIR)) {
  console.error(`docs dir not found at ${DOCS_DIR}`)
  process.exit(2)
}
const docFiles = readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))

const docSet = new Set(docFiles)

// ─── 3. Compute drift sets ─────────────────────────────────────────────────

const missingDocs = [...registered]
  .filter((cmd) => !docSet.has(cmd))
  .sort()

const orphanDocs = docFiles
  .filter((doc) => !registered.has(doc) && !CONCEPT_PAGES.has(doc))
  .sort()

const report = {
  registeredCommands: [...registered].sort(),
  documentedPages: docFiles.sort(),
  conceptPages: [...CONCEPT_PAGES].sort(),
  missingDocs,
  orphanDocs,
}

// ─── 4. Output ─────────────────────────────────────────────────────────────

if (jsonMode) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
} else {
  console.log(`Registered CLI subcommands: ${registered.size}`)
  console.log(`docs/en/reference/cli/*.md pages: ${docFiles.length}`)
  console.log(`Concept pages (always allowed): ${CONCEPT_PAGES.size}`)
  console.log('')

  if (missingDocs.length === 0 && orphanDocs.length === 0) {
    console.log('OK — CLI docs are in sync with main.ts.')
  } else {
    if (missingDocs.length > 0) {
      console.error(`MISSING docs (${missingDocs.length}) — command registered but no .md file:`)
      for (const c of missingDocs) console.error(`  - ${c}`)
    }
    if (orphanDocs.length > 0) {
      console.error('')
      console.error(`ORPHAN docs (${orphanDocs.length}) — .md file with no matching command (and not in CONCEPT_PAGES):`)
      for (const d of orphanDocs) console.error(`  - ${d}.md`)
    }
    console.error('')
    console.error('Fix by:')
    console.error('  - Adding the missing page under docs/en/reference/cli/<name>.md, OR')
    console.error('  - Removing the orphaned page, OR')
    console.error('  - If the orphan is a concept page, add its slug to CONCEPT_PAGES in tools/check-cli-docs.mjs')
    console.error('  - Run `node tools/gen-cli-docs.mjs` to auto-generate stubs for missing pages')
  }
}

process.exit(missingDocs.length + orphanDocs.length === 0 ? 0 : 1)
