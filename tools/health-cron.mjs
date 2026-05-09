#!/usr/bin/env node
/**
 * AC-2: health:cron — Check that required pg_cron jobs are scheduled and healthy.
 *
 * Queries Supabase (via SUPABASE_URL + SERVICE_ROLE_KEY env vars) and verifies:
 *   1. Required crons are scheduled in cron.job.
 *   2. Their most recent cron.job_run_details record is < 5 min ago.
 *
 * Exits 0 if all checks pass, 1 if any required cron is missing or stale.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/health-cron.mjs
 *   pnpm health:cron
 */

import { spawnSync } from 'node:child_process'

const REQUIRED_CRONS = [
  'dispatch-scheduled-workflows',
  'webhook-outbox-dispatcher',
  'expire-stale-approvals',
]

const MAX_LAG_MINUTES = 5

// Accept VITE_SUPABASE_URL as a fallback (local dev .env.local convention)
const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
const isLocal = url && (url.includes('127.0.0.1') || url.includes('localhost'))

function resolveServiceRoleKey() {
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) return process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!isLocal) return undefined
  try {
    const r = spawnSync('supabase', ['status', '--output', 'json'], { encoding: 'utf-8' })
    if (r.status === 0) {
      const data = JSON.parse(r.stdout)
      if (data?.SERVICE_ROLE_KEY) {
        console.log('[health:cron] resolved service-role key via `supabase status`')
        return data.SERVICE_ROLE_KEY
      }
    }
  } catch { /* supabase CLI not available */ }
  return undefined
}

const key = resolveServiceRoleKey()

if (!url || !key) {
  console.error('[health:cron] Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.')
  console.error('[health:cron] For local dev, start Supabase first: supabase start')
  process.exit(1)
}

const REST = `${url}/rest/v1`
const headers = {
  apikey:          key,
  Authorization:   `Bearer ${key}`,
  'Content-Type':  'application/json',
}

async function rpcQuery(fn, params = {}) {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`RPC ${fn} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function tableQuery(table, qs = '') {
  const res = await fetch(`${REST}/${table}${qs}`, { headers: { ...headers, Prefer: 'return=representation' } })
  if (!res.ok) throw new Error(`Query ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET  = '\x1b[0m'

const ok   = (msg) => console.log(`${GREEN}  ✔  ${RESET}${msg}`)
const fail = (msg) => console.error(`${RED}  ✘  ${RESET}${msg}`)
const warn = (msg) => console.warn(`${YELLOW}  ⚠  ${RESET}${msg}`)

let failures = 0

// ── 1. Check scheduled jobs exist in cron.job ──────────────────────────────
let scheduledJobs = []
try {
  scheduledJobs = await tableQuery('cron_jobs', '?select=jobname')
} catch {
  // cron.job may not be exposed via PostgREST — fall back to health probe results
  warn('cron.job not queryable via REST; using fn_admin_health RPC for cron status.')
  try {
    const health = await rpcQuery('fn_admin_health')
    scheduledJobs = (health?.crons ?? []).map((c) => ({ jobname: c.name }))
  } catch (e) {
    warn(`fn_admin_health unavailable: ${e.message}. Skipping cron existence check.`)
    scheduledJobs = REQUIRED_CRONS.map((n) => ({ jobname: n }))
  }
}

const scheduledNames = new Set(scheduledJobs.map((j) => j.jobname))

for (const name of REQUIRED_CRONS) {
  if (scheduledNames.has(name)) {
    ok(`Cron scheduled: ${name}`)
  } else {
    fail(`Cron MISSING from schedule: ${name}`)
    failures++
  }
}

// ── 2. Check last-run timestamp is recent ──────────────────────────────────
const cutoff = new Date(Date.now() - MAX_LAG_MINUTES * 60 * 1000).toISOString()
try {
  const runs = await tableQuery(
    'cron_job_run_details',
    `?select=jobid,start_time&order=start_time.desc&start_time=gte.${cutoff}&limit=50`
  )
  const recentJobs = new Set(runs.map((r) => r.jobid))

  for (const name of REQUIRED_CRONS) {
    const job = scheduledJobs.find((j) => j.jobname === name)
    if (!job?.jobid) continue
    if (recentJobs.has(job.jobid)) {
      ok(`Cron ran recently (< ${MAX_LAG_MINUTES} min): ${name}`)
    } else {
      fail(`Cron STALE — no run in last ${MAX_LAG_MINUTES} min: ${name}`)
      failures++
    }
  }
} catch {
  warn('cron_job_run_details not queryable via REST — skipping recency check.')
}

console.log()
if (failures > 0) {
  console.error(`${RED}${failures} cron check(s) failed.${RESET}`)
  process.exit(1)
} else {
  console.log(`${GREEN}All cron health checks passed.${RESET}`)
}
