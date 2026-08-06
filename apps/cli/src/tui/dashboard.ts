import { A, sym, isPlainText, stripAnsi } from '@lenserfight/cli-client'
import { getHumanActivityFeed } from '../lib/data-services'
import { buildCommandInventory } from '../lib/command-inventory'
import { getActiveProfileName } from '../utils/profiles'
import { probeBackendHealth } from '../lib/health-probe'
import { truncate } from '../utils/output'
import { dispatchInProcess } from './command-dispatch'

// Single sink for full-screen frames used by the non-interactive fallbacks
// (non-TTY / small-terminal degrade paths below hand off to this; the
// interactive ink screen renders itself). Honors NO_COLOR / dumb-terminal /
// non-TTY by stripping ANSI so output stays readable when piped.
function writeFrame(body: string): void {
  if (isPlainText()) {
    process.stdout.write(stripAnsi(body) + '\n')
    return
  }
  process.stdout.write(A.clearScreen + A.homeCursor + body + '\n')
}

// Pure helpers — exported for unit tests without standing up a TTY.

export function formatHealthStatus(ok: boolean): string {
  return ok
    ? `${A.bgGreen}${A.white}${A.bold} ${sym.pass} HEALTHY ${A.reset}`
    : `${A.bgRed}${A.white}${A.bold} ${sym.fail}  DOWN   ${A.reset}`
}

export interface ActionLogRow {
  id?: string
  ai_lenser_id?: string
  team_run_id?: string | null
  action_type?: string
  payload?: Record<string, unknown>
  created_at?: string
}

export function formatActionLogRow(row: ActionLogRow): string {
  const ts = row.created_at ? new Date(row.created_at).toLocaleString() : '—'
  const action = (row.action_type ?? '—').padEnd(20)
  const payload = row.payload ? JSON.stringify(row.payload) : ''
  return `${A.gray}${ts}${A.reset}  ${A.brightCyan}${action}${A.reset}  ${A.dim}${truncate(payload, 72)}${A.reset}`
}

// ─── Command bar suggestions (inventory-backed) ──────────────────────────────
//
// Sourced live from buildCommandInventory() — the single source of truth for
// the full command tree — instead of a hand-maintained catalog. The old
// dashboard's ~270-line COMMAND_CATALOG had drifted to list only ~230 of the
// ~546 real leaf commands; this replaces it entirely rather than restoring it.

export interface CommandSuggestion {
  cmd: string
  desc: string
}

let inventoryCache: CommandSuggestion[] | null = null

export async function loadCommandSuggestions(): Promise<CommandSuggestion[]> {
  if (inventoryCache) return inventoryCache
  const entries = await buildCommandInventory()
  inventoryCache = entries.map((e) => ({ cmd: e.name, desc: e.description }))
  return inventoryCache
}

/** Test-only: seed the suggestion cache without walking the real command tree. */
export function _setCommandSuggestionsForTest(entries: CommandSuggestion[] | null): void {
  inventoryCache = entries
}

/**
 * Synchronous lookup against the already-loaded suggestion cache (populated
 * by `loadCommandSuggestions()` before the dashboard becomes interactive).
 * Ranks prefix matches ahead of mid-string matches so typing e.g. "run"
 * surfaces "run submit" before "battle run".
 */
export function getSuggestions(input: string, max = 5): CommandSuggestion[] {
  if (!input.trim() || !inventoryCache) return []
  const lower = input.toLowerCase()
  const prefix: CommandSuggestion[] = []
  const substring: CommandSuggestion[] = []
  for (const e of inventoryCache) {
    if (e.cmd.startsWith(lower)) prefix.push(e)
    else if (e.cmd.includes(lower)) substring.push(e)
  }
  return [...prefix, ...substring].slice(0, max)
}

/**
 * Compute the next highlighted suggestion index when cycling with Tab / arrows.
 * Wraps around in both directions. Returns -1 (no selection) when the list is
 * empty so callers can keep the "free-typed input" behavior.
 */
export function cycleSuggestion(current: number, count: number, dir: 1 | -1): number {
  if (count <= 0) return -1
  if (dir === 1) return (current + 1) % count
  return current <= 0 ? count - 1 : current - 1
}

export function tokenise(raw: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (quote) {
      if (ch === quote) { quote = null } else { current += ch }
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

// ─── Recent action-log feed ──────────────────────────────────────────────────

export async function fetchRecentLogs(): Promise<ActionLogRow[]> {
  try {
    const feed = await getHumanActivityFeed(10)
    return feed.map((item) => ({
      ai_lenser_id: item.ai_lenser_id,
      team_run_id: item.team_run_id,
      action_type: item.action_type ?? item.kind,
      payload: item.payload,
      created_at: item.occurred_at,
    }))
  } catch {
    return []
  }
}

// ─── Dispatched-command run glue ──────────────────────────────────────────────
//
// Runs a command bar selection in-process (see ./command-dispatch.ts) and
// waits for a keypress before re-mounting the ink screen, mirroring the
// legacy child-spawn UX (clear, run, "press q/Enter to return") without ever
// spawning a subprocess.

const RETURN_KEYS = new Set(['q', 'Q', '\x1b', '\r', '\n'])

function waitForReturnKey(): Promise<void> {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    const onData = (buf: Buffer | string) => {
      const key = buf.toString()
      if (key === '\x03') { process.stdin.off('data', onData); process.exit(130) }
      if (RETURN_KEYS.has(key)) { process.stdin.off('data', onData); resolve() }
    }
    process.stdin.on('data', onData)
  })
}

async function runDispatchedCommand(argv: string[]): Promise<void> {
  const out = process.stdout
  out.write(A.showCursor + A.clearScreen + A.homeCursor)
  out.write(`\n  ${A.bold}${A.brightCyan}${sym.run}  lf ${argv.join(' ')}${A.reset}\n\n`)

  try { process.stdin.setRawMode(false) } catch { /* ignore */ }
  const { code } = await dispatchInProcess(argv)
  try { process.stdin.setRawMode(true) } catch { /* ignore */ }

  const status = code === 0
    ? `${A.brightGreen}${sym.pass} done${A.reset}`
    : `${A.brightRed}${sym.fail} exited with code ${code}${A.reset}`
  out.write(`\n  ${status}\n`)
  out.write(
    `  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} / ${A.brightYellow}Enter${A.reset}${A.gray} to return…${A.reset}\n`,
  )
  await waitForReturnKey()
}

// ─── Small-terminal fallback (non-interactive plain-text frame) ─────────────

const MIN_COLUMNS = 60
const MIN_ROWS = 15

async function renderSmallTerminalFallback(): Promise<void> {
  const [profile, healthy, logs] = await Promise.all([
    getActiveProfileName(),
    probeBackendHealth(),
    fetchRecentLogs(),
  ])
  const lines = [
    `${A.brightMagenta}${A.bold}${sym.fight} LenserFight${A.reset}  ${A.gray}│${A.reset}  profile ${profile}  ${A.gray}│${A.reset}  ${formatHealthStatus(healthy)}`,
    '',
    `${A.brightYellow}${sym.warn}  Terminal too small for the full dashboard (need at least ${MIN_COLUMNS}x${MIN_ROWS}).${A.reset}`,
    `${A.gray}Resize your terminal, or run individual commands directly, e.g. \`lf status\`.${A.reset}`,
    '',
    `${A.bold}Recent agent logs${A.reset}`,
    ...(logs.length > 0
      ? logs.slice(0, 5).map(formatActionLogRow)
      : [`${A.gray}${sym.dot}  No action logs yet${A.reset}`]),
  ]
  writeFrame(lines.join('\n'))
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function runDashboard(): Promise<void> {
  // Warm the suggestion cache before the command bar can be opened. Failure
  // degrades to an empty suggestion list — free-typed commands still work.
  await loadCommandSuggestions().catch(() => undefined)

  const { runInkDashboard, renderInkStatic } = await import('./ink/app')

  // Non-TTY / piped output (scripting, CI, `lf < /dev/null`): paint a single
  // static ink frame and return instead of hanging on raw-mode key handling.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    await renderInkStatic()
    return
  }

  const cols = process.stdout.columns ?? 0
  const rows = process.stdout.rows ?? 0
  if ((cols > 0 && cols < MIN_COLUMNS) || (rows > 0 && rows < MIN_ROWS)) {
    await renderSmallTerminalFallback()
    return
  }

  const out = process.stdout
  out.write(A.altScreenOn + A.hideCursor)

  const cleanup = () => {
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    out.write(A.showCursor + A.altScreenOff)
  }

  process.on('SIGINT', () => { cleanup(); process.exit(130) })
  process.on('SIGTERM', () => { cleanup(); process.exit(143) })

  // Main-screen loop: mount ink, wait for the user's choice, dispatch the
  // chosen command in-process, then re-mount ink so panels reflect the
  // updated action log / recent-commands list.
  for (;;) {
    const action = await runInkDashboard()

    if (action.type === 'quit') {
      cleanup()
      process.exit(action.code ?? 0)
    }

    // ink has unmounted and released raw mode; re-arm stdin for the
    // dispatched command and the "press q/Enter to return" prompt below.
    try { process.stdin.resume() } catch { /* ignore */ }
    try { process.stdin.setEncoding('utf-8') } catch { /* ignore */ }

    await runDispatchedCommand(action.argv)
  }
}
