import { spawn } from 'node:child_process'
import { callRest } from '../utils/api'
import { getActiveProfileName } from '../utils/profiles'
import { resolveConfig } from '../config/project-config'
import { truncate } from '../utils/output'
import { A, sym } from '../utils/ansi'

// Pure helpers — exported for unit tests without standing up a TTY.

export function formatHealthStatus(ok: boolean): string {
  return ok
    ? `${A.bgGreen}${A.white}${A.bold} ${sym.pass} HEALTHY ${A.reset}`
    : `${A.bgRed}${A.white}${A.bold} ${sym.fail}  DOWN   ${A.reset}`
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
  const action = (row.action_type ?? '—').padEnd(20)
  const payload = row.payload ? JSON.stringify(row.payload) : ''
  return `${A.gray}${ts}${A.reset}  ${A.brightCyan}${action}${A.reset}  ${A.dim}${truncate(payload, 72)}${A.reset}`
}

function keyBind(key: string, label: string): string {
  return `${A.gray}[${A.reset}${A.brightYellow}${key}${A.reset}${A.gray}]${A.reset} ${A.dim}${label}${A.reset}`
}

// ─── Health probe ────────────────────────────────────────────────────────────

async function probeHealth(): Promise<boolean> {
  try {
    const config = resolveConfig()
    if (!config.supabaseUrl) return false
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
  out.write(A.clearScreen + A.homeCursor)

  // ── Header ────────────────────────────────────────────────────────────────
  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const profilePart = `${A.gray}profile${A.reset}  ${A.brightCyan}${profile}${A.reset}`
  const health = formatHealthStatus(healthy)

  out.write(`\n  ${brand}   ${A.gray}│${A.reset}   ${profilePart}   ${A.gray}│${A.reset}   ${health}\n`)
  out.write(`  ${A.gray}${'─'.repeat(60)}${A.reset}\n`)
  out.write(`  ${A.gray}${new Date().toLocaleString()}  ${sym.dot}  refresh 2s${A.reset}\n\n`)

  // ── Logs section ──────────────────────────────────────────────────────────
  out.write(`  ${A.bold}${A.brightWhite}Recent agent logs${A.reset}  ${A.gray}${sym.dot}${sym.dot}${sym.dot}${A.reset}\n\n`)
  if (logs.length === 0) {
    out.write(`  ${A.gray}${sym.dot}  No action logs yet  ${sym.arrow}  waiting for events…${A.reset}\n`)
  } else {
    for (const row of logs) {
      out.write('  ' + formatActionLogRow(row) + '\n')
    }
  }

  // ── Key bindings ──────────────────────────────────────────────────────────
  out.write('\n')
  const bindings = [
    keyBind('a', 'approvals'),
    keyBind('b', 'battles'),
    keyBind('s', 'schedules'),
    keyBind('m', 'memory'),
    keyBind('q', 'quit'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  out.write(`  ${bindings}\n`)
}

// ─── Key dispatch ────────────────────────────────────────────────────────────

const KEY_BINDINGS: Record<string, string[]> = {
  a: ['approval', 'list'],
  b: ['battle', 'list'],
  s: ['schedule', 'list'],
  m: ['memory'],
}

let restoreCleanup = () => { /* installed in runDashboard */ }

function waitForKey(): Promise<void> {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    process.stdin.once('data', () => resolve())
  })
}

function runChild(argv: string[]): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(A.showCursor)
    process.stdout.write(A.clearScreen + A.homeCursor)
    process.stdout.write(`\n  ${A.bold}${A.brightCyan}${sym.run}  lf ${argv.join(' ')}${A.reset}\n\n`)
    const child = spawn('lf', argv, { stdio: 'inherit' })
    child.on('exit', () => {
      process.stdout.write(`\n  ${A.gray}Press any key to return to the dashboard…${A.reset}\n`)
      void waitForKey().then(resolve)
    })
    child.on('error', () => {
      process.stdout.write(`\n  ${A.brightRed}${sym.fail}  could not spawn lf — is it on PATH?${A.reset}\n`)
      process.stdout.write(`  ${A.gray}Press any key to return.${A.reset}\n`)
      void waitForKey().then(resolve)
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
  out.write(A.altScreenOn + A.hideCursor)

  let timer: NodeJS.Timeout | null = null
  let inChild = false

  const cleanup = () => {
    if (timer) clearInterval(timer)
    timer = null
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    process.stdin.pause()
    out.write(A.showCursor + A.altScreenOff)
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
    // Ctrl-C always exits, even while a subcommand is showing
    if (key === '\x03') { exit(130); return }
    // While a subcommand is active, let once('data') in waitForKey handle the keypress
    if (inChild) return
    // q / Q / Esc → exit dashboard
    if (key === 'q' || key === 'Q' || key === '\x1b') { exit(0); return }
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
