import { spawn } from 'node:child_process'
import { callRest } from '../utils/api'
import { getActiveProfileName } from '../utils/profiles'
import { resolveConfig } from '../config/project-config'
import { truncate } from '../utils/output'

// ─── ANSI helpers ────────────────────────────────────────────────────────────
//
// No color dep is available in this workspace, so all styling is raw ANSI.

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  white: '\x1b[37m',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J',
  homeCursor: '\x1b[H',
}

// Pure helpers — exported for unit tests without standing up a TTY.

export function formatHealthStatus(ok: boolean): string {
  return ok
    ? `${ANSI.bgGreen}${ANSI.white}${ANSI.bold} HEALTHY ${ANSI.reset}`
    : `${ANSI.bgRed}${ANSI.white}${ANSI.bold}  DOWN   ${ANSI.reset}`
}

interface ActionLogRow {
  id?: string
  ai_lenser_id?: string
  team_run_id?: string | null
  action_type?: string
  payload?: Record<string, unknown>
  created_at?: string
}

export function formatActionLogRow(row: ActionLogRow): string {
  const ts = row.created_at ? new Date(row.created_at).toLocaleTimeString() : '—'
  const action = (row.action_type ?? '—').padEnd(18)
  const payload = row.payload ? JSON.stringify(row.payload) : ''
  return `${ANSI.dim}${ts}${ANSI.reset}  ${ANSI.cyan}${action}${ANSI.reset}  ${truncate(payload, 80)}`
}

// ─── Health probe ────────────────────────────────────────────────────────────

async function probeHealth(): Promise<boolean> {
  try {
    const config = resolveConfig()
    if (!config.supabaseUrl) return false
    // Hit the platform-api /health endpoint when available; fall back to
    // a basic Supabase reachability check.
    const probeUrls = [
      config.cloudApiUrl ? `${config.cloudApiUrl}/health` : null,
      `${config.supabaseUrl}/auth/v1/health`,
    ].filter((u): u is string => !!u)

    for (const url of probeUrls) {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 1500)
        const res = await fetch(url, { signal: ctrl.signal })
        clearTimeout(timer)
        if (res.ok) return true
      } catch {
        /* try next */
      }
    }
    return false
  } catch {
    return false
  }
}

// ─── Renderer ────────────────────────────────────────────────────────────────

async function fetchRecentLogs(): Promise<ActionLogRow[]> {
  try {
    const rows = await callRest<ActionLogRow[]>(
      'agents',
      'action_logs',
      'GET',
      undefined,
      {
        requireAuth: true,
        query: {
          select: 'id,ai_lenser_id,team_run_id,action_type,payload,created_at',
          order: 'created_at.desc',
          limit: 10,
        },
      },
    )
    return rows ?? []
  } catch {
    return []
  }
}

async function renderFrame(): Promise<void> {
  const [profile, healthy, logs] = await Promise.all([
    getActiveProfileName(),
    probeHealth(),
    fetchRecentLogs(),
  ])

  const out = process.stdout
  out.write(ANSI.homeCursor + ANSI.clearScreen)

  // Header
  out.write(`${ANSI.bold}LenserFight TUI${ANSI.reset}  `)
  out.write(`profile=${ANSI.cyan}${profile}${ANSI.reset}  `)
  out.write(`${formatHealthStatus(healthy)}\n`)
  out.write(`${ANSI.dim}${new Date().toLocaleString()} · refresh 2s${ANSI.reset}\n`)
  out.write('\n')

  // Logs
  out.write(`${ANSI.bold}Recent agent action logs${ANSI.reset}\n`)
  if (logs.length === 0) {
    out.write(`${ANSI.dim}  (no action logs yet — waiting…)${ANSI.reset}\n`)
  } else {
    for (const row of logs) {
      out.write('  ' + formatActionLogRow(row) + '\n')
    }
  }

  // Key bindings
  out.write('\n')
  out.write(
    `${ANSI.dim}[a] approvals  [b] battles  [s] schedules  [m] memory  [q/Esc] quit${ANSI.reset}\n`,
  )
}

// ─── Key dispatch ────────────────────────────────────────────────────────────

const KEY_BINDINGS: Record<string, string[]> = {
  a: ['approval', 'list'],
  b: ['battle', 'list'],
  s: ['schedule', 'list'],
  m: ['memory', 'list-entries'],
}

let restoreCleanup = () => { /* installed in runDashboard */ }

function runChild(argv: string[]): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(ANSI.showCursor)
    process.stdout.write(ANSI.clearScreen + ANSI.homeCursor)
    process.stdout.write(`Running: lf ${argv.join(' ')}\n\n`)
    const child = spawn('lf', argv, { stdio: 'inherit' })
    child.on('exit', () => {
      process.stdout.write('\nPress q to return to the dashboard…\n')
      resolve()
    })
    child.on('error', () => {
      process.stdout.write('\n[error] could not spawn lf — is it on PATH?\nPress q to return.\n')
      resolve()
    })
  })
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function runDashboard(): Promise<void> {
  if (!process.stdin.isTTY) {
    // No TTY → no interactive UI. Print a single snapshot and exit.
    await renderFrame()
    return
  }

  const out = process.stdout
  out.write(ANSI.hideCursor)

  let timer: NodeJS.Timeout | null = null
  let inChild = false

  const cleanup = () => {
    if (timer) clearInterval(timer)
    timer = null
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    process.stdin.pause()
    out.write(ANSI.showCursor)
    out.write('\n')
  }
  restoreCleanup = cleanup

  const exit = (code = 0) => {
    cleanup()
    process.exit(code)
  }

  process.on('SIGINT', () => exit(130))
  process.on('SIGTERM', () => exit(143))

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')

  process.stdin.on('data', async (data) => {
    const key = data.toString()
    // Ctrl-C, q, Esc → exit
    if (key === '' || key === 'q' || key === 'Q' || key === '') {
      exit(0)
      return
    }
    if (inChild) return
    const binding = KEY_BINDINGS[key.toLowerCase()]
    if (binding) {
      inChild = true
      if (timer) clearInterval(timer)
      try { process.stdin.setRawMode(false) } catch { /* ignore */ }
      await runChild(binding)
      try { process.stdin.setRawMode(true) } catch { /* ignore */ }
      inChild = false
      timer = setInterval(() => { void renderFrame() }, 2000)
      void renderFrame()
    }
  })

  // Initial paint + 2s tick.
  await renderFrame()
  timer = setInterval(() => { void renderFrame() }, 2000)
}

// Exposed for tests that want to assert the cleanup contract.
export function _internal_getRestoreCleanup(): () => void {
  return restoreCleanup
}
