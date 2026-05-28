#!/usr/bin/env node
/**
 * AG-3: pnpm announcement:dashboard
 *
 * Prints a go/no-go readiness snapshot for the OSS announcement day.
 * Checks that each gate listed in docs/explanation/community/announcement-readiness.md
 * is satisfied via local file checks and (optionally) live API probes.
 *
 * Usage:
 *   pnpm announcement:dashboard
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm announcement:dashboard
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── Colours (no deps) ────────────────────────────────────────────────────────
const G = '\x1b[32m' // green
const Y = '\x1b[33m' // yellow
const R = '\x1b[31m' // red
const B = '\x1b[34m' // blue
const D = '\x1b[2m'  // dim
const X = '\x1b[0m'  // reset
const TICK  = `${G}✓${X}`
const CROSS = `${R}✗${X}`
const WARN  = `${Y}?${X}`

// ─── Check helpers ────────────────────────────────────────────────────────────

function fileExists(relPath, label) {
  const full = resolve(root, relPath)
  const ok = existsSync(full)
  return { label, ok, note: ok ? '' : `missing: ${relPath}` }
}

function fileContains(relPath, needle, label) {
  const full = resolve(root, relPath)
  if (!existsSync(full)) return { label, ok: false, note: `missing: ${relPath}` }
  const ok = readFileSync(full, 'utf-8').includes(needle)
  return { label, ok, note: ok ? '' : `"${needle}" not found in ${relPath}` }
}

async function httpOk(url, headers, label) {
  try {
    const res = await fetch(url, { method: 'POST', headers, body: '{}' })
    const ok = res.ok
    return { label, ok, note: ok ? '' : `HTTP ${res.status}` }
  } catch (err) {
    return { label, ok: false, note: err.message }
  }
}

// ─── Gate groups ──────────────────────────────────────────────────────────────

const rpcHeaders = SUPABASE_URL
  ? {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY ?? '',
      Authorization: `Bearer ${SERVICE_ROLE_KEY ?? ''}`,
    }
  : null

const groups = [
  {
    name: 'AA — Docs truth',
    checks: [
      fileExists('docs/tutorials/getting-started/overview.md', 'overview.md exists'),
      fileContains('docs/tutorials/getting-started/overview.md', 'Private Alpha', 'BYOK status labelled Private Alpha'),
      fileContains('docs/index.md', 'Private Alpha', 'Landing page disclaims BYOK alpha'),
    ],
  },
  {
    name: 'AB — First-run UX',
    checks: [
      fileExists('scripts/setup-doctor.mjs', 'setup:doctor script'),
      fileExists('examples/local-battle/haiku-shootout/spec.yaml', 'haiku-shootout example'),
      fileExists('examples/local-battle/haiku-shootout/README.md', 'haiku-shootout README'),
    ],
  },
  {
    name: 'AC — Production safety',
    checks: [
      fileExists('libs/features/battles/src/lib/pages/PlatformFlagsAdminPage.tsx', 'PlatformFlagsAdminPage'),
      fileExists('tools/health-cron.mjs', 'health:cron script'),
      fileExists('docs/how-to/operations/announcement-day-runbook.md', 'announcement-day-runbook'),
    ],
  },
  {
    name: 'AD — Contributor lane',
    checks: [
      fileExists('.github/pull_request_template.md', 'PR template'),
      fileExists('docs/how-to/contributors/finding-work.md', 'finding-work doc'),
    ],
  },
  {
    name: 'AE — Acquisition surface',
    checks: [
      fileExists('tools/gen-shortlinks.mjs', 'gen-shortlinks script'),
      fileExists('docs/public/r/quickstart/index.html', '/r/quickstart redirect'),
      fileExists('docs/public/r/discord/index.html', '/r/discord redirect'),
    ],
  },
  {
    name: 'AF — Retention loop',
    checks: [
      fileExists('apps/cli/src/commands/whats-new.ts', 'lf whats-new command'),
      fileExists('docs/reference/battles/local-artifact-schema.md', 'local artifact schema doc'),
    ],
  },
  {
    name: 'AG — Telemetry & health',
    checks: [
      fileExists('tools/gen-status-page.mjs', 'gen:status-page script'),
      fileExists('.github/workflows/status-page.yml', 'status page CI workflow'),
      fileExists('docs/how-to/operations/incident-response.md', 'incident response doc'),
      fileExists('docs/how-to/contributors/github-discussions-setup.md', 'discussions setup doc'),
    ],
  },
]

// Optionally add live checks when credentials are set
if (rpcHeaders && SUPABASE_URL) {
  groups.push({
    name: 'Live API probes',
    checks: [
      await httpOk(`${SUPABASE_URL}/rest/v1/rpc/fn_health_check`, rpcHeaders, 'fn_health_check OK'),
    ],
  })
}

// ─── Render ───────────────────────────────────────────────────────────────────

const WIDTH = 60
console.log(`\n${B}╔${'═'.repeat(WIDTH - 2)}╗${X}`)
console.log(`${B}║${X}  LenserFight — Announcement Readiness Dashboard${' '.repeat(WIDTH - 50)}${B}║${X}`)
console.log(`${B}╚${'═'.repeat(WIDTH - 2)}╝${X}\n`)

let totalPassed = 0
let totalFailed = 0

for (const group of groups) {
  const passed = group.checks.filter((c) => c.ok).length
  const total = group.checks.length
  const allOk = passed === total
  const icon = allOk ? TICK : CROSS
  console.log(`${icon} ${B}${group.name}${X}  ${D}(${passed}/${total})${X}`)
  for (const c of group.checks) {
    const marker = c.ok ? TICK : CROSS
    const note = c.note ? ` ${D}— ${c.note}${X}` : ''
    console.log(`    ${marker}  ${c.label}${note}`)
  }
  totalPassed += passed
  totalFailed += total - passed
  console.log()
}

const overallOk = totalFailed === 0
const summary = overallOk
  ? `${G}ALL GATES PASS — ready to announce! (${totalPassed}/${totalPassed + totalFailed})${X}`
  : `${R}NOT READY — ${totalFailed} gate(s) failing (${totalPassed}/${totalPassed + totalFailed} pass)${X}`

console.log(`${'─'.repeat(WIDTH)}`)
console.log(summary)
console.log(`${'─'.repeat(WIDTH)}\n`)

if (totalFailed > 0) process.exitCode = 1
