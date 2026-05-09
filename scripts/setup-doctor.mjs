#!/usr/bin/env node
/**
 * AB-1: setup-doctor — pre-flight check for a clean LenserFight dev environment.
 *
 * Checks:
 *   - Node.js >= 22
 *   - pnpm present
 *   - Docker running (optional — only needed for Supabase mode)
 *   - Supabase CLI present (optional — only needed for full-stack mode)
 *
 * Prints a green/yellow/red table. Exits 0 if all required checks pass.
 * Optional checks always succeed but show a warning when absent.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const RESET  = '\x1b[0m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const BOLD   = '\x1b[1m'

const ok   = (msg) => `${GREEN}  ✔  ${RESET}${msg}`
const warn = (msg) => `${YELLOW}  ⚠  ${RESET}${msg}`
const fail = (msg) => `${RED}  ✘  ${RESET}${msg}`

function run(cmd) {
  try { return { out: execSync(cmd, { stdio: 'pipe' }).toString().trim(), err: null } }
  catch (e) { return { out: null, err: e.message } }
}

const checks = []

// ── Node.js ──────────────────────────────────────────────────────────────────
const nodeVer = process.versions.node
const [major] = nodeVer.split('.').map(Number)
if (major >= 22) {
  checks.push({ label: 'Node.js', status: 'ok', detail: `v${nodeVer}` })
} else {
  checks.push({ label: 'Node.js', status: 'fail', detail: `v${nodeVer} (need >=22)` })
}

// ── pnpm ─────────────────────────────────────────────────────────────────────
const { out: pnpmOut } = run('pnpm --version')
if (pnpmOut) {
  checks.push({ label: 'pnpm', status: 'ok', detail: `v${pnpmOut}` })
} else {
  checks.push({ label: 'pnpm', status: 'fail', detail: 'not found — install: npm i -g pnpm@9' })
}

// ── Docker (optional) ─────────────────────────────────────────────────────────
const { out: dockerOut } = run('docker info --format "{{.ServerVersion}}" 2>/dev/null')
if (dockerOut) {
  checks.push({ label: 'Docker', status: 'ok', detail: `running (v${dockerOut})`, optional: true })
} else {
  checks.push({ label: 'Docker', status: 'warn', detail: 'not running — needed for Supabase mode only', optional: true })
}

// ── Supabase CLI (optional) ───────────────────────────────────────────────────
const { out: sbOut } = run('supabase --version 2>/dev/null')
if (sbOut) {
  checks.push({ label: 'Supabase CLI', status: 'ok', detail: sbOut, optional: true })
} else {
  checks.push({ label: 'Supabase CLI', status: 'warn', detail: 'not found — needed for Supabase mode only', optional: true })
}

// ── Ollama (optional) ─────────────────────────────────────────────────────────
const { out: ollamaOut } = run('ollama --version 2>/dev/null')
if (ollamaOut) {
  checks.push({ label: 'Ollama', status: 'ok', detail: ollamaOut, optional: true })
} else {
  checks.push({ label: 'Ollama', status: 'warn', detail: 'not found — optional; needed for local model battles without BYOK', optional: true })
}

// ── Print table ───────────────────────────────────────────────────────────────
console.log()
console.log(`${BOLD}LenserFight dev environment check${RESET}`)
console.log()

const maxLabel = Math.max(...checks.map(c => c.label.length))
for (const c of checks) {
  const label = c.label.padEnd(maxLabel + 2)
  const flag  = c.optional ? `${YELLOW}(optional)${RESET} ` : ''
  if (c.status === 'ok')   console.log(ok(`${label}${flag}${c.detail}`))
  if (c.status === 'warn') console.log(warn(`${label}${flag}${c.detail}`))
  if (c.status === 'fail') console.log(fail(`${label}${flag}${c.detail}`))
}

console.log()

const failures = checks.filter(c => c.status === 'fail')
const warnings = checks.filter(c => c.status === 'warn')

if (failures.length) {
  console.log(`${RED}${BOLD}${failures.length} required check(s) failed. Fix them before continuing.${RESET}`)
  process.exit(1)
}

if (warnings.length) {
  console.log(`${YELLOW}${warnings.length} optional check(s) not met — see notes above.${RESET}`)
  console.log(`${GREEN}Required checks passed. You can run the CLI-only path now.${RESET}`)
} else {
  console.log(`${GREEN}${BOLD}All checks passed. Full-stack Supabase mode is available.${RESET}`)
}
