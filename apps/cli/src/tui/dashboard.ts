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

// ─── Command catalog (for autocomplete) ──────────────────────────────────────

/**
 * Flat list of all available `lf` subcommands with short descriptions.
 * Shown as inline suggestions while the user types in command mode.
 */
export const COMMAND_CATALOG: Array<{ cmd: string; desc: string }> = [
  { cmd: 'approval list',         desc: 'List pending approvals for an AI lenser' },
  { cmd: 'approval approve',      desc: 'Approve a team run' },
  { cmd: 'approval reject',       desc: 'Reject a team run' },
  { cmd: 'battle list',           desc: 'List recent battles' },
  { cmd: 'battle create',         desc: 'Create a new battle' },
  { cmd: 'battle view',           desc: 'View battle details' },
  { cmd: 'battle stream',         desc: 'Stream live battle events' },
  { cmd: 'schedule list',         desc: 'List workflow schedules' },
  { cmd: 'schedule create',       desc: 'Create a new schedule' },
  { cmd: 'schedule pause',        desc: 'Pause a schedule' },
  { cmd: 'schedule resume',       desc: 'Resume a paused schedule' },
  { cmd: 'memory list-profiles',  desc: 'List memory profiles for an agent' },
  { cmd: 'memory list',           desc: 'List memory entries' },
  { cmd: 'memory search',         desc: 'Full-text search across memories' },
  { cmd: 'memory delete',         desc: 'Delete a memory entry' },
  { cmd: 'lenser list',           desc: 'List registered AI lensers' },
  { cmd: 'lenser connect',        desc: 'Register a new AI lenser' },
  { cmd: 'lenser view',           desc: 'View lenser config and status' },
  { cmd: 'lenser pause',          desc: 'Pause an AI lenser' },
  { cmd: 'lenser resume',         desc: 'Resume a paused AI lenser' },
  { cmd: 'lenser status',         desc: 'Show workspace settings for a lenser' },
  { cmd: 'lenser follow',         desc: 'Follow a lenser by UUID' },
  { cmd: 'lenser unfollow',       desc: 'Unfollow a lenser' },
  { cmd: 'lenser followers',      desc: 'List your followers' },
  { cmd: 'lenser following',      desc: 'List lensers you follow' },
  { cmd: 'lenser suggested',      desc: 'Discover suggested lensers' },
  { cmd: 'run',                   desc: 'Run a workflow against an AI lenser' },
  { cmd: 'execution list',        desc: 'List workflow executions' },
  { cmd: 'execution view',        desc: 'View a workflow execution' },
  { cmd: 'execution cancel',      desc: 'Cancel a running execution' },
  { cmd: 'workflow list',         desc: 'List available workflows' },
  { cmd: 'workflow view',         desc: 'View workflow definition' },
  { cmd: 'team list',             desc: 'List your teams' },
  { cmd: 'team create',           desc: 'Create a team' },
  { cmd: 'team add-member',       desc: 'Add a member to a team' },
  { cmd: 'feed',                  desc: 'Show activity feed' },
  { cmd: 'leaderboard',          desc: 'Show the global leaderboard' },
  { cmd: 'lens list',             desc: 'List all lenses' },
  { cmd: 'lens create',           desc: 'Create a new lens' },
  { cmd: 'lens view',             desc: 'View a lens' },
  { cmd: 'auth login',            desc: 'Log in to LenserFight' },
  { cmd: 'auth logout',           desc: 'Log out' },
  { cmd: 'auth whoami',           desc: 'Show current user' },
  { cmd: 'config show',           desc: 'Show project config' },
  { cmd: 'doctor',                desc: 'Diagnose environment issues' },
  { cmd: 'status',                desc: 'Show overall system status' },
  { cmd: 'gateway status',        desc: 'Show local gateway status' },
  { cmd: 'kill-switch enable',    desc: 'Enable global kill switch' },
  { cmd: 'kill-switch disable',   desc: 'Disable global kill switch' },
  { cmd: 'dark-launch status',    desc: 'Show dark launch config' },
  { cmd: 'budget show',           desc: 'Show credit budget' },
  { cmd: 'analytics summary',     desc: 'Show analytics summary' },
  { cmd: 'completion bash',       desc: 'Generate bash completions' },
  { cmd: 'completion zsh',        desc: 'Generate zsh completions' },
]

/**
 * Returns up to `max` commands that match the current input prefix (case-insensitive).
 * Matches on both command name and description.
 */
export function getSuggestions(input: string, max = 5): Array<{ cmd: string; desc: string }> {
  if (!input.trim()) return []
  const lower = input.toLowerCase()
  return COMMAND_CATALOG
    .filter((e) => e.cmd.startsWith(lower) || e.cmd.includes(lower))
    .slice(0, max)
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
let cmdState: {
  active: boolean
  input: string
  error: string | null
  selectedSuggestion: number
} = {
  active: false,
  input: '',
  error: null,
  selectedSuggestion: -1,
}

// ─── Sub-dashboard state ──────────────────────────────────────────────────────

type SubDashboardId = 'approvals' | 'battles' | 'schedules' | 'memory' | null

interface SubDashboardDef {
  id: SubDashboardId
  title: string
  commands: Array<{ key: string; cmd: string[]; label: string }>
  exitKeys: string[]
}

const SUB_DASHBOARDS: Record<string, SubDashboardDef> = {
  a: {
    id: 'approvals',
    title: 'Approvals',
    commands: [
      { key: 'l', cmd: ['approval', 'list', '--status=pending'], label: 'list pending' },
      { key: 'a', cmd: ['approval', 'approve'], label: 'approve run (type ID)' },
      { key: 'r', cmd: ['approval', 'reject'],  label: 'reject run (type ID)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  b: {
    id: 'battles',
    title: 'Battles',
    commands: [
      { key: 'l', cmd: ['battle', 'list'],   label: 'list battles' },
      { key: 'c', cmd: ['battle', 'create'], label: 'create battle (opens prompt)' },
      { key: 's', cmd: ['battle', 'stream'], label: 'stream latest battle' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  s: {
    id: 'schedules',
    title: 'Schedules',
    commands: [
      { key: 'l', cmd: ['schedule', 'list'],   label: 'list schedules' },
      { key: 'p', cmd: ['schedule', 'pause'],  label: 'pause schedule (type ID)' },
      { key: 'r', cmd: ['schedule', 'resume'], label: 'resume schedule (type ID)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  m: {
    id: 'memory',
    title: 'Memory',
    commands: [
      { key: 'p', cmd: ['memory', 'list-profiles'], label: 'list memory profiles' },
      { key: 'l', cmd: ['memory', 'list'],           label: 'list entries (type agent ID)' },
      { key: 's', cmd: ['memory', 'search'],         label: 'search memories (type query)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
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
    keyBind('l', 'lensers'),
    keyBind('f', 'feed'),
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
      `  ${A.dim}Enter to run  Tab to complete  Esc to cancel${A.reset}\n`,
    )

    // ── Inline suggestions ─────────────────────────────────────────────────
    const suggestions = getSuggestions(cmdState.input)
    if (suggestions.length > 0) {
      out.write('\n')
      suggestions.forEach((s, i) => {
        const isSelected = i === cmdState.selectedSuggestion
        const prefix = isSelected
          ? `${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${s.cmd.padEnd(30)} ${A.dim}${s.desc}${A.reset}`
          : `  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${s.cmd.padEnd(30)}${A.reset}  ${A.dim}${s.desc}${A.reset}`
        out.write(`  ${prefix}\n`)
      })
    }
  }
}

// Variant that only redraws the bottom portion (command bar) to avoid
// flickering the logs panel while the user types. Falls back to full
// renderFrame when not in command mode.
function redrawCommandBar(): void {
  if (!cmdState.active) return
  const out = process.stdout
  const cols = (process.stdout.columns ?? 80) - 4
  const clearLine = ' '.repeat(cols)

  const suggestions = getSuggestions(cmdState.input)
  // Lines needed: optional error (1) + prompt (1) + blank (1) + suggestions (N)
  const extraLines = (cmdState.error ? 1 : 0) + 1 + (suggestions.length > 0 ? 1 + suggestions.length : 0)

  out.write('\x1b[s')           // save cursor
  out.write('\x1b[999;1H')      // move to near-bottom

  // Clear all lines we'll write
  for (let i = 0; i < extraLines + 1; i++) {
    out.write(`\r${clearLine}\n`)
  }
  // Re-position to start of our block
  out.write(`\x1b[${extraLines + 1}A`)

  if (cmdState.error) {
    out.write(`\r  ${clearLine}\r  ${A.brightRed}${sym.fail}  ${cmdState.error}${A.reset}\n`)
  }

  out.write(
    `\r  ${clearLine}\r  ${A.gray}lf${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
    `${A.brightWhite}${cmdState.input}${A.reset}${A.brightYellow}▎${A.reset}` +
    `  ${A.dim}Enter to run  Tab to complete  Esc to cancel${A.reset}\n`,
  )

  if (suggestions.length > 0) {
    out.write(`\r${clearLine}\n`)
    suggestions.forEach((s, i) => {
      const isSelected = i === cmdState.selectedSuggestion
      const prefix = isSelected
        ? `${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${s.cmd.padEnd(30)} ${A.dim}${s.desc}${A.reset}`
        : `  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${s.cmd.padEnd(30)}${A.reset}  ${A.dim}${s.desc}${A.reset}`
      out.write(`\r  ${clearLine}\r  ${prefix}\n`)
    })
  }

  out.write('\x1b[u')           // restore cursor
}

// ─── Sub-dashboard renderer ───────────────────────────────────────────────────

function renderSubDashboard(def: SubDashboardDef): void {
  const out = process.stdout
  out.write(A.clearScreen + A.homeCursor)

  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const title = `${A.brightCyan}${A.bold}${def.title}${A.reset}`

  out.write(`\n  ${brand}   ${A.gray}│${A.reset}   ${title}\n`)
  out.write(`  ${A.gray}${'─'.repeat(60)}${A.reset}\n\n`)

  out.write(`  ${A.bold}${A.brightWhite}Actions${A.reset}\n\n`)
  for (const c of def.commands) {
    out.write(`  ${keyBind(c.key, c.label)}\n`)
  }

  out.write('\n')
  const exitBindings = [
    keyBind(':', 'command'),
    keyBind('q', 'back to dashboard'),
    keyBind('Esc', 'back to dashboard'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  out.write(`  ${exitBindings}\n`)
}

// ─── Sub-dashboard interaction loop ──────────────────────────────────────────

// cmdBar state re-used inside sub-dashboards too
let subCmdState: { active: boolean; input: string; error: string | null; selectedSuggestion: number } = {
  active: false,
  input: '',
  error: null,
  selectedSuggestion: -1,
}

function redrawSubCommandBar(def: SubDashboardDef): void {
  const out = process.stdout
  const cols = (process.stdout.columns ?? 80) - 4
  const clearLine = ' '.repeat(cols)

  const suggestions = getSuggestions(subCmdState.input)
  const extraLines = (subCmdState.error ? 1 : 0) + 1 + (suggestions.length > 0 ? 1 + suggestions.length : 0)

  out.write('\x1b[s')
  out.write('\x1b[999;1H')

  for (let i = 0; i < extraLines + 1; i++) {
    out.write(`\r${clearLine}\n`)
  }
  out.write(`\x1b[${extraLines + 1}A`)

  if (subCmdState.error) {
    out.write(`\r  ${clearLine}\r  ${A.brightRed}${sym.fail}  ${subCmdState.error}${A.reset}\n`)
  }

  const promptSuffix = def.title.toLowerCase()
  out.write(
    `\r  ${clearLine}\r  ${A.gray}lf ${promptSuffix}${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
    `${A.brightWhite}${subCmdState.input}${A.reset}${A.brightYellow}▎${A.reset}` +
    `  ${A.dim}Enter to run  Tab to complete  Esc to cancel${A.reset}\n`,
  )

  if (suggestions.length > 0) {
    out.write(`\r${clearLine}\n`)
    suggestions.forEach((s, i) => {
      const isSelected = i === subCmdState.selectedSuggestion
      const prefix = isSelected
        ? `${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${s.cmd.padEnd(30)} ${A.dim}${s.desc}${A.reset}`
        : `  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${s.cmd.padEnd(30)}${A.reset}  ${A.dim}${s.desc}${A.reset}`
      out.write(`\r  ${clearLine}\r  ${prefix}\n`)
    })
  }

  out.write('\x1b[u')
}

async function runSubDashboard(def: SubDashboardDef): Promise<void> {
  subCmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
  renderSubDashboard(def)

  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }

    const onData = async (data: Buffer | string) => {
      const key = data.toString()

      if (key === '\x03') { process.exit(130) }

      // ── Sub-dashboard command mode ───────────────────────────────────────
      if (subCmdState.active) {
        if (key === '\x1b') {
          subCmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
          renderSubDashboard(def)
          return
        }
        if (key === '\r' || key === '\n') {
          const raw = subCmdState.input.trim()
          if (!raw) {
            subCmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
            renderSubDashboard(def)
            return
          }
          const argv = tokenise(raw)
          const validationError = validateSubcommand(argv)
          if (validationError) {
            subCmdState = { ...subCmdState, error: validationError }
            redrawSubCommandBar(def)
            return
          }
          subCmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
          process.stdin.off('data', onData)
          try { process.stdin.setRawMode(false) } catch { /* ignore */ }
          await runChild(argv)
          try { process.stdin.setRawMode(true) } catch { /* ignore */ }
          renderSubDashboard(def)
          process.stdin.on('data', onData)
          return
        }
        // Tab — cycle through suggestions
        if (key === '\t') {
          const suggestions = getSuggestions(subCmdState.input)
          if (suggestions.length > 0) {
            const next = (subCmdState.selectedSuggestion + 1) % suggestions.length
            subCmdState = { ...subCmdState, selectedSuggestion: next }
            redrawSubCommandBar(def)
          }
          return
        }
        // Shift+Tab — cycle backwards
        if (key === '\x1b[Z') {
          const suggestions = getSuggestions(subCmdState.input)
          if (suggestions.length > 0) {
            const prev = subCmdState.selectedSuggestion <= 0
              ? suggestions.length - 1
              : subCmdState.selectedSuggestion - 1
            subCmdState = { ...subCmdState, selectedSuggestion: prev }
            redrawSubCommandBar(def)
          }
          return
        }
        if (key === '\x7f' || key === '\x08') {
          subCmdState = { ...subCmdState, input: subCmdState.input.slice(0, -1), error: null, selectedSuggestion: -1 }
          redrawSubCommandBar(def)
          return
        }
        if (key.length === 1 && key >= ' ') {
          subCmdState = { ...subCmdState, input: subCmdState.input + key, error: null, selectedSuggestion: -1 }
          redrawSubCommandBar(def)
        }
        return
      }

      // ── Normal sub-dashboard mode ────────────────────────────────────────
      if (key === ':') {
        subCmdState = { active: true, input: '', error: null, selectedSuggestion: -1 }
        renderSubDashboard(def)
        // Draw the empty command bar at the bottom
        redrawSubCommandBar(def)
        return
      }
      // Exit sub-dashboard
      if (def.exitKeys.includes(key)) {
        process.stdin.off('data', onData)
        resolve()
        return
      }
      // Quick-action shortcut keys
      const action = def.commands.find((c) => c.key === key)
      if (action) {
        process.stdin.off('data', onData)
        try { process.stdin.setRawMode(false) } catch { /* ignore */ }
        await runChild(action.cmd)
        try { process.stdin.setRawMode(true) } catch { /* ignore */ }
        renderSubDashboard(def)
        process.stdin.on('data', onData)
      }
    }

    process.stdin.on('data', onData)
  })
}

// ─── Key dispatch ────────────────────────────────────────────────────────────

const KEY_BINDINGS: Record<string, string[]> = {
  a: ['approval', 'list'],
  b: ['battle', 'list'],
  s: ['schedule', 'list'],
  m: ['memory', 'list-profiles'],
  l: ['lenser', 'list'],
  f: ['feed'],
}

let restoreCleanup = () => { /* installed in runDashboard */ }

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
      process.stdout.write(`\n  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} / ${A.brightYellow}Enter${A.reset}${A.gray} to return…${A.reset}\n`)
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
    // If a suggestion is selected via Tab, use it
    const suggestions = getSuggestions(cmdState.input)
    let raw = cmdState.input.trim()
    if (cmdState.selectedSuggestion >= 0 && suggestions[cmdState.selectedSuggestion]) {
      raw = suggestions[cmdState.selectedSuggestion].cmd
    }

    if (!raw) {
      cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
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

    cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
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

    if (key === '\x03') { exit(130); return }
    if (inChild) return

    // ── Command input mode ─────────────────────────────────────────────────
    if (cmdState.active) {
      if (key === '\x1b') {
        cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
        void renderFrame()
        return
      }
      if (key === '\r' || key === '\n') {
        await submitCommand()
        return
      }
      // Tab — cycle forward through suggestions
      if (key === '\t') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const next = (cmdState.selectedSuggestion + 1) % suggestions.length
          cmdState = { ...cmdState, selectedSuggestion: next }
          redrawCommandBar()
        }
        return
      }
      // Shift+Tab — cycle backwards
      if (key === '\x1b[Z') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const prev = cmdState.selectedSuggestion <= 0
            ? suggestions.length - 1
            : cmdState.selectedSuggestion - 1
          cmdState = { ...cmdState, selectedSuggestion: prev }
          redrawCommandBar()
        }
        return
      }
      if (key === '\x7f' || key === '\x08') {
        cmdState = { ...cmdState, input: cmdState.input.slice(0, -1), error: null, selectedSuggestion: -1 }
        redrawCommandBar()
        return
      }
      if (key.length === 1 && key >= ' ') {
        cmdState = { ...cmdState, input: cmdState.input + key, error: null, selectedSuggestion: -1 }
        redrawCommandBar()
      }
      return
    }

    // ── Normal dashboard mode ──────────────────────────────────────────────
    if (key === ':') {
      cmdState = { active: true, input: '', error: null, selectedSuggestion: -1 }
      void renderFrame()
      return
    }
    if (key === 'q' || key === 'Q' || key === '\x1b') { exit(0); return }

    // Sub-dashboard shortcut keys
    const subDef = SUB_DASHBOARDS[key.toLowerCase()]
    if (subDef) {
      inChild = true
      if (timer) clearInterval(timer)
      try { process.stdin.setRawMode(false) } catch { /* ignore */ }
      await runSubDashboard(subDef)
      try { process.stdin.setRawMode(true) } catch { /* ignore */ }
      inChild = false
      timer = setInterval(() => { void renderFrame() }, 2000)
      void renderFrame()
      return
    }

    // Fallback: keys without a sub-dashboard still spawn the child directly
    const binding = KEY_BINDINGS[key.toLowerCase()]
    if (binding && !subDef) {
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

  await renderFrame()
  timer = setInterval(() => { void renderFrame() }, 2000)
}

// Exposed for tests that want to assert the cleanup contract.
export function _internal_getRestoreCleanup(): () => void {
  return restoreCleanup
}
