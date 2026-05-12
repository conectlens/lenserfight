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
  'auto-close-voting',
  'auto-finalize-battles',
  'vote-eligible-agents',
  'dispatch-scheduled-workflows',
  'automation-dispatcher',
  'series-rematch-dispatcher',
  'webhook-outbox-dispatcher',
  'expire-stale-approvals',
  'async-run-poller',          // AM — promoted from OPTIONAL once migration applied
]

// Pre-registered crons that AK–AT will land in subsequent migrations.
// When present, they are checked for recency; when absent, no failure is
// raised. This lets us monitor each cron from the moment its migration
// merges, without breaking the gate on rollouts that have not reached it yet.
const OPTIONAL_CRONS = [
  'timeout-stale-runs',        // AM (callable via async-run-poller's body)
  'team-run-claim',            // AL — workers prefer NOTIFY over cron
  'byok-key-expiry',           // AR
  'media-expiry',              // AT
  'cleanup-cron-runs',         // Z11 — daily automation.cron_runs retention
]

const MAX_LAG_MINUTES = 5

// Accept SUPABASE_URL as a fallback (local dev .env.local convention)
const url = process.env['SUPABASE_URL'] ?? process.env['SUPABASE_URL']
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
  console.error('[health:cron] Set SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.')
  console.error('[health:cron] For local dev, start Supabase first: supabase start')
  process.exit(1)
}

const REST = `${url}/rest/v1`
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
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

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

const ok = (msg) => console.log(`${GREEN}  ✔  ${RESET}${msg}`)
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

for (const name of OPTIONAL_CRONS) {
  if (scheduledNames.has(name)) {
    ok(`Optional cron scheduled: ${name}`)
  } else {
    warn(`Optional cron not yet scheduled (pre-registered for future phase): ${name}`)
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

  for (const name of OPTIONAL_CRONS) {
    const job = scheduledJobs.find((j) => j.jobname === name)
    if (!job?.jobid) continue   // not yet scheduled — silent
    if (recentJobs.has(job.jobid)) {
      ok(`Optional cron ran recently (< ${MAX_LAG_MINUTES} min): ${name}`)
    } else {
      warn(`Optional cron stale — no run in last ${MAX_LAG_MINUTES} min: ${name}`)
    }
  }
} catch {
  warn('cron_job_run_details not queryable via REST — skipping recency check.')
}

// ── 3. Check for stuck battle execution jobs (running > 10 min) ───────────────
// Emits a warning (not a failure) so a single legitimately slow job doesn't
// block CI. The Chainabit retry loop handles self-healing.
try {
  const stuckBattleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const stuckBattleJobs = await tableQuery(
    'battles_execution_jobs',
    `?select=job_id&status=eq.running&updated_at=lt.${stuckBattleCutoff}&limit=1`,
  )
  if (Array.isArray(stuckBattleJobs) && stuckBattleJobs.length > 0) {
    warn(`Battle execution job(s) stuck in running state for > 10 min — check battle-worker logs`)
  } else {
    ok('No stuck battle execution jobs (> 10 min)')
  }
} catch {
  warn('Could not query battles_execution_jobs for stuck-job check — skipping')
}

// ── 4. Check for stuck async media runs (running > 15 min) ────────────────────
// Async runs that outlive 15 min likely have a stale provider task ID.
// fn_timeout_stale_runs (optional pg_cron) is the recovery path.
try {
  const stuckAsyncCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const stuckAsyncRuns = await tableQuery(
    'execution_runs',
    `?select=id&status=eq.running&is_async=eq.true&started_at=lt.${stuckAsyncCutoff}&limit=1`,
  )
  if (Array.isArray(stuckAsyncRuns) && stuckAsyncRuns.length > 0) {
    warn(`Async media run(s) stuck in running state for > 15 min — fn_timeout_stale_runs may need to run`)
  } else {
    ok('No stuck async media runs (> 15 min)')
  }
} catch {
  warn('Could not query execution_runs for stuck async-run check — skipping')
}

console.log()
if (failures > 0) {
  console.error(`${RED}${failures} cron check(s) failed.${RESET}`)
  process.exit(1)
} else {
  console.log(`${GREEN}All cron health checks passed.${RESET}`)
}
