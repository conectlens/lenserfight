#!/usr/bin/env node
/**
 * AG-1: Generate a static /status page into docs/public/status/index.html.
 *
 * Checks:
 *   1. Supabase REST API health (fn_health_check RPC)
 *   2. Cron job freshness (dispatch-scheduled-workflows, webhook-outbox-dispatcher)
 *   3. Platform system flags state
 *
 * Outputs a self-contained HTML page with a timestamp and status table.
 * Designed to run nightly via CI (schedule: '0 6 * * *') or on-demand.
 *
 * Required env vars:
 *   SUPABASE_URL               — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key for privileged RPCs
 *
 * Usage:
 *   pnpm gen:status-page
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/gen-status-page.mjs
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../docs/public/status')
mkdirSync(outDir, { recursive: true })

const envLocalPath = resolve(__dirname, '../.env.local')
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

// Accept SUPABASE_URL as a fallback (local dev .env.local convention)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.SUPABASE_URL

const isLocal = SUPABASE_URL && (SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost'))

function resolveServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!isLocal) return undefined
  try {
    const r = spawnSync('supabase', ['status', '--output', 'json'], { encoding: 'utf-8' })
    if (r.status === 0) {
      const data = JSON.parse(r.stdout)
      if (data?.SERVICE_ROLE_KEY) {
        console.log('gen-status-page: resolved service-role key via `supabase status`')
        return data.SERVICE_ROLE_KEY
      }
    }
  } catch { /* supabase CLI not available */ }
  return undefined
}

const SERVICE_ROLE_KEY = resolveServiceRoleKey()

const STALE_CRON_MS = 5 * 60 * 1000 // 5 min

// ─── Checks ───────────────────────────────────────────────────────────────────

const RPC_HEADERS = SUPABASE_URL && SERVICE_ROLE_KEY
  ? {
    'Content-Type': 'application/json',
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  }
  : null

async function rpc(name, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: RPC_HEADERS,
    body: JSON.stringify(params),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

async function checkHealth() {
  if (!RPC_HEADERS) {
    return { name: 'API health', status: 'unknown', note: 'credentials not set' }
  }
  try {
    // fn_health is the canonical health check RPC
    const { ok, status, body } = await rpc('fn_health')
    if (!ok) return { name: 'API health', status: 'degraded', note: `HTTP ${status}` }
    const healthy = body?.status === 'ok' || body?.healthy === true || ok
    return { name: 'API health', status: healthy ? 'ok' : 'degraded', note: healthy ? '' : JSON.stringify(body) }
  } catch (err) {
    return { name: 'API health', status: 'error', note: err.message }
  }
}

async function checkCronJob(jobName) {
  if (!RPC_HEADERS) {
    return { name: `cron: ${jobName}`, status: 'unknown', note: 'credentials not set' }
  }
  try {
    // Use fn_health which includes cron status in its response
    const { ok, body } = await rpc('fn_health')
    if (!ok || !body) {
      return { name: `cron: ${jobName}`, status: 'unknown', note: 'fn_health unavailable' }
    }
    const crons = body?.crons ?? []
    const job = crons.find((c) => c.name === jobName || c.jobname === jobName)
    if (!job) {
      // fn_health may not include cron detail — mark as unknown rather than fail
      return { name: `cron: ${jobName}`, status: 'unknown', note: 'not reported by fn_health' }
    }
    if (!job.last_run_at) {
      return { name: `cron: ${jobName}`, status: 'unknown', note: 'no runs recorded' }
    }
    const age = Date.now() - new Date(job.last_run_at).getTime()
    const stale = age > STALE_CRON_MS
    return {
      name: `cron: ${jobName}`,
      status: stale ? 'stale' : 'ok',
      note: stale ? `last run ${Math.round(age / 60000)} min ago` : `last run ${Math.round(age / 1000)}s ago`,
    }
  } catch (err) {
    return { name: `cron: ${jobName}`, status: 'error', note: err.message }
  }
}

async function checkPlatformFlags() {
  if (!RPC_HEADERS) {
    return { name: 'Platform flags', status: 'unknown', note: 'credentials not set' }
  }
  try {
    const { ok, status, body } = await rpc('fn_get_platform_system_flags')
    if (!ok) return { name: 'Platform flags', status: 'unknown', note: `HTTP ${status}` }
    const summary = Object.entries(body ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    return { name: 'Platform flags', status: 'ok', note: summary || 'none' }
  } catch (err) {
    return { name: 'Platform flags', status: 'error', note: err.message }
  }
}

// ─── HTML generation ──────────────────────────────────────────────────────────

function statusBadge(status) {
  const colors = { ok: '#22c55e', degraded: '#f59e0b', stale: '#f59e0b', error: '#ef4444', unknown: '#6b7280' }
  const color = colors[status] ?? '#6b7280'
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px"></span>${status}`
}

function buildHtml(checks, generatedAt) {
  const allOk = checks.every((c) => c.status === 'ok')
  const overallStatus = allOk ? 'Operational' : 'Degraded'
  const overallColor = allOk ? '#22c55e' : '#f59e0b'

  const rows = checks
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #27272a">${c.name}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #27272a">${statusBadge(c.status)}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:0.85em">${c.note ?? ''}</td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LenserFight Status</title>
  <meta name="robots" content="noindex">
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #09090b; color: #fafafa; }
    .container { max-width: 720px; margin: 0 auto; padding: 40px 16px; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #a1a1aa; font-size: 0.9rem; margin-bottom: 32px; }
    .overall { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; font-weight: 600; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: #18181b; border-radius: 8px; overflow: hidden; }
    th { text-align: left; padding: 10px 16px; background: #27272a; font-size: 0.8rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
    .footer { margin-top: 24px; color: #52525b; font-size: 0.8rem; }
    a { color: #818cf8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>LenserFight Status</h1>
    <p class="subtitle">Generated ${generatedAt}</p>
    <div class="overall">
      <span style="width:14px;height:14px;border-radius:50%;background:${overallColor};display:inline-block"></span>
      ${overallStatus}
    </div>
    <table>
      <thead><tr><th>Check</th><th>Status</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="footer">
      Updated nightly. For incidents see <a href="https://github.com/conectlens/lenserfight/discussions">GitHub Discussions</a>.
    </p>
  </div>
</body>
</html>`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const generatedAt = new Date().toUTCString()
console.log(`gen-status-page: running checks at ${generatedAt}`)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log()
  console.log('  NOTE: Supabase credentials not set — all checks will report as unknown.')
  console.log('  To run with live data, set:')
  console.log('    SUPABASE_URL=<your-project-url>')
  console.log('    SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>')
  console.log('  For local Supabase: start `supabase start` and this script will auto-resolve the key.')
  console.log()
}

const checks = await Promise.all([
  checkHealth(),
  checkCronJob('dispatch-scheduled-workflows'),
  checkCronJob('webhook-outbox-dispatcher'),
  checkPlatformFlags(),
])

for (const c of checks) {
  const icon = c.status === 'ok' ? '✓' : c.status === 'unknown' ? '?' : '✗'
  console.log(`  ${icon} ${c.name}: ${c.status}${c.note ? ` (${c.note})` : ''}`)
}

const html = buildHtml(checks, generatedAt)
writeFileSync(`${outDir}/index.html`, html, 'utf-8')
console.log(`\nStatus page written to docs/public/status/index.html`)
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('  (page shows unknown status — set credentials above to get live results)')
}
