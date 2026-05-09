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

// ─── Subcommand validation ────────────────────────────────────────────────────

/**
 * Map of known subcommands to their required --flag names.
 * Validation runs before spawning so the user gets an inline error
 * instead of a half-rendered child process output.
 */
const REQUIRED_FLAGS: Record<string, string[]> = {
  'approval list': ['--ai-lenser'],
}

/**
 * Returns an error message if required flags are missing, null otherwise.
 * Parses shell-style tokens so quoted values and `--flag=value` both work.
 */
export function validateSubcommand(argv: string[]): string | null {
  const subcommand = argv.slice(0, 2).join(' ')
  const required = REQUIRED_FLAGS[subcommand]
  if (!required) return null

  const missing = required.filter((flag) => {
    const bare = flag.replace(/^--/, '')
    return !argv.some(
      (a) => a === flag || a.startsWith(`${flag}=`) || a === `--${bare}`,
    )
  })

  if (missing.length === 0) return null
  return `Missing required argument: ${missing.join(', ')}`
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

// cmdState holds the live command-input-mode state so renderFrame can
// paint it without needing to pass it through every call.
let cmdState: { active: boolean; input: string; error: string | null } = {
  active: false,
  input: '',
  error: null,
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
    keyBind(':', 'command'),
    keyBind('q', 'quit'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  out.write(`  ${bindings}\n`)

  // ── Command input bar ─────────────────────────────────────────────────────
  if (cmdState.active) {
    out.write('\n')
    if (cmdState.error) {
      out.write(`  ${A.brightRed}${sym.fail}  ${cmdState.error}${A.reset}\n`)
    }
    out.write(
      `  ${A.gray}lf${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ${A.brightWhite}${cmdState.input}${A.reset}${A.brightYellow}▎${A.reset}` +
      `  ${A.dim}Enter to run  Esc to cancel${A.reset}\n`,
    )
  }
}

// Variant that only redraws the bottom portion (command bar) to avoid
// flickering the logs panel while the user types. Falls back to full
// renderFrame when not in command mode.
function redrawCommandBar(): void {
  if (!cmdState.active) return
  // Move cursor to a fixed row below logs (row 14 is safe for current layout)
  // and overwrite both lines of the command bar in-place.
  const out = process.stdout
  // Use relative cursor saves instead of hardcoded rows so it works at any
  // terminal height. We write the bar at the bottom of the screen.
  const cols = (process.stdout.columns ?? 80) - 4
  const clearLine = ' '.repeat(cols)

  // Erase error line + prompt line, then redraw.
  out.write('\x1b[s') // save cursor
  out.write('\x1b[999;1H') // move to last lines

  if (cmdState.error) {
    out.write(`\r  ${clearLine}\r  ${A.brightRed}${sym.fail}  ${cmdState.error}${A.reset}\n`)
  } else {
    out.write(`\r  ${clearLine}\n`)
  }
  out.write(
    `\r  ${clearLine}\r  ${A.gray}lf${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
    `${A.brightWhite}${cmdState.input}${A.reset}${A.brightYellow}▎${A.reset}` +
    `  ${A.dim}Enter to run  Esc to cancel${A.reset}`,
  )
  out.write('\x1b[u') // restore cursor
}

// ─── Key dispatch ────────────────────────────────────────────────────────────

const KEY_BINDINGS: Record<string, string[]> = {
  a: ['approval', 'list'],
  b: ['battle', 'list'],
  s: ['schedule', 'list'],
  m: ['memory'],
}

let restoreCleanup = () => { /* installed in runDashboard */ }

// Only these keys return to the dashboard. Other keystrokes are swallowed so
// users can read the sub-page output without accidentally bouncing back.
const RETURN_KEYS = new Set([
  'q', 'Q',
  '\x1b',   // Esc
  '\r',     // Enter (CR)
  '\n',     // Enter (LF)
])

function waitForReturnKey(): Promise<void> {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    const onData = (buf: Buffer | string) => {
      const key = buf.toString()
      if (key === '\x03') {
        process.stdin.off('data', onData)
        process.exit(130)
      }
      if (RETURN_KEYS.has(key)) {
        process.stdin.off('data', onData)
        resolve()
      }
      // Any other key: ignore — keep the sub-page visible.
    }
    process.stdin.on('data', onData)
  })
}

function runChild(argv: string[]): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(A.showCursor)
    process.stdout.write(A.clearScreen + A.homeCursor)
    process.stdout.write(`\n  ${A.bold}${A.brightCyan}${sym.run}  lf ${argv.join(' ')}${A.reset}\n\n`)
    const child = spawn('lf', argv, { stdio: 'inherit' })
    child.on('exit', () => {
      process.stdout.write(`\n  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} to return to the dashboard…${A.reset}\n`)
      void waitForReturnKey().then(resolve)
    })
    child.on('error', () => {
      process.stdout.write(`\n  ${A.brightRed}${sym.fail}  could not spawn lf — is it on PATH?${A.reset}\n`)
      process.stdout.write(`  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} to return.${A.reset}\n`)
      void waitForReturnKey().then(resolve)
    })
  })
}

/**
 * Tokenise a command string the same way a POSIX shell does for simple cases:
 * splits on whitespace, honours single/double-quoted groups, strips the quotes.
 */
function tokenise(raw: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current.length) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current.length) tokens.push(current)
  return tokens
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

  // ── Command-mode submission ───────────────────────────────────────────────

  async function submitCommand(): Promise<void> {
    const raw = cmdState.input.trim()
    if (!raw) {
      cmdState = { active: false, input: '', error: null }
      void renderFrame()
      return
    }

    const argv = tokenise(raw)
    const validationError = validateSubcommand(argv)
    if (validationError) {
      cmdState = { ...cmdState, error: validationError }
      redrawCommandBar()
      return
    }

    // Valid — hand off to child process.
    cmdState = { active: false, input: '', error: null }
    inChild = true
    if (timer) clearInterval(timer)
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    await runChild(argv)
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    inChild = false
    timer = setInterval(() => { void renderFrame() }, 2000)
    void renderFrame()
  }

  // ── Key handler ───────────────────────────────────────────────────────────

  process.stdin.on('data', async (data) => {
    const key = data.toString()

    // Ctrl-C always exits.
    if (key === '\x03') { exit(130); return }

    // While a subcommand is running, let waitForReturnKey() handle keys.
    if (inChild) return

    // ── Command input mode ─────────────────────────────────────────────────
    if (cmdState.active) {
      if (key === '\x1b') {
        // Esc — cancel command mode.
        cmdState = { active: false, input: '', error: null }
        void renderFrame()
        return
      }
      if (key === '\r' || key === '\n') {
        await submitCommand()
        return
      }
      if (key === '\x7f' || key === '\x08') {
        // Backspace / Delete.
        cmdState = { ...cmdState, input: cmdState.input.slice(0, -1), error: null }
        redrawCommandBar()
        return
      }
      // Printable character — append and redraw only the bar.
      if (key.length === 1 && key >= ' ') {
        cmdState = { ...cmdState, input: cmdState.input + key, error: null }
        redrawCommandBar()
      }
      return
    }

    // ── Normal dashboard mode ──────────────────────────────────────────────
    if (key === ':') {
      // Enter command mode.
      cmdState = { active: true, input: '', error: null }
      void renderFrame()
      return
    }
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
