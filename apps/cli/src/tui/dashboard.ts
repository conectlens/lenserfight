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
  { cmd: 'leaderboard',           desc: 'Show the global leaderboard' },
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

export function getSuggestions(input: string, max = 5): Array<{ cmd: string; desc: string }> {
  if (!input.trim()) return []
  const lower = input.toLowerCase()
  return COMMAND_CATALOG
    .filter((e) => e.cmd.startsWith(lower) || e.cmd.includes(lower))
    .slice(0, max)
}

// ─── Subcommand validation ────────────────────────────────────────────────────

const REQUIRED_FLAGS: Record<string, string[]> = {
  'approval list': ['--ai-lenser'],
}

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

// ─── Cached render state (for synchronous repaints) ──────────────────────────

// Holds the last-fetched async values so we can repaint synchronously
// while the user types without waiting for network calls.
let _cachedProfile = 'default'
let _cachedHealthy = false
let _cachedLogs: ActionLogRow[] = []

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

// ─── Command bar state ────────────────────────────────────────────────────────

interface CmdBarState {
  active: boolean
  input: string
  error: string | null
  selectedSuggestion: number
}

let cmdState: CmdBarState = {
  active: false,
  input: '',
  error: null,
  selectedSuggestion: -1,
}

// ─── Command bar renderer (shared, synchronous) ───────────────────────────────

/**
 * Renders just the command bar lines into `buf`. No cursor tricks — callers
 * are responsible for having cleared the screen before calling paintScreen().
 */
function paintCommandBar(
  buf: string[],
  state: CmdBarState,
  promptPrefix: string,
): void {
  if (!state.active) return

  buf.push('')
  if (state.error) {
    buf.push(`  ${A.brightRed}${sym.fail}  ${state.error}${A.reset}`)
  }
  buf.push(
    `  ${A.gray}${promptPrefix}${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
    `${A.brightWhite}${state.input}${A.reset}${A.brightYellow}▎${A.reset}` +
    `  ${A.dim}Enter to run  Tab/↑↓ to pick  Esc to cancel${A.reset}`,
  )

  const suggestions = getSuggestions(state.input)
  if (suggestions.length > 0) {
    buf.push('')
    suggestions.forEach((s, i) => {
      const selected = i === state.selectedSuggestion
      if (selected) {
        buf.push(`  ${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${s.cmd.padEnd(32)}${A.dim}${s.desc}${A.reset}`)
      } else {
        buf.push(`  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${s.cmd.padEnd(32)}${A.reset}${A.dim}${s.desc}${A.reset}`)
      }
    })
  }
}

// ─── Main dashboard screen ────────────────────────────────────────────────────

function paintMainScreen(): void {
  const buf: string[] = []

  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const profilePart = `${A.gray}profile${A.reset}  ${A.brightCyan}${_cachedProfile}${A.reset}`
  const health = formatHealthStatus(_cachedHealthy)

  buf.push('')
  buf.push(`  ${brand}   ${A.gray}│${A.reset}   ${profilePart}   ${A.gray}│${A.reset}   ${health}`)
  buf.push(`  ${A.gray}${'─'.repeat(60)}${A.reset}`)
  buf.push(`  ${A.gray}${new Date().toLocaleString()}  ${sym.dot}  refresh 2s${A.reset}`)
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}Recent agent logs${A.reset}  ${A.gray}${sym.dot}${sym.dot}${sym.dot}${A.reset}`)
  buf.push('')

  if (_cachedLogs.length === 0) {
    buf.push(`  ${A.gray}${sym.dot}  No action logs yet  ${sym.arrow}  waiting for events…${A.reset}`)
  } else {
    for (const row of _cachedLogs) {
      buf.push('  ' + formatActionLogRow(row))
    }
  }

  buf.push('')
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
  buf.push(`  ${bindings}`)

  paintCommandBar(buf, cmdState, 'lf')

  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

async function renderFrame(): Promise<void> {
  const [profile, healthy, logs] = await Promise.all([
    getActiveProfileName(),
    probeHealth(),
    fetchRecentLogs(),
  ])
  _cachedProfile = profile
  _cachedHealthy = healthy
  _cachedLogs = logs
  paintMainScreen()
}

// ─── Sub-dashboard types ──────────────────────────────────────────────────────

interface SubDashboardDef {
  title: string
  commands: Array<{ key: string; cmd: string[]; label: string }>
  exitKeys: string[]
}

const SUB_DASHBOARDS: Record<string, SubDashboardDef> = {
  a: {
    title: 'Approvals',
    commands: [
      { key: 'l', cmd: ['approval', 'list', '--status=pending'], label: 'list pending' },
      { key: 'a', cmd: ['approval', 'approve'], label: 'approve run (enter ID via :)' },
      { key: 'r', cmd: ['approval', 'reject'],  label: 'reject run (enter ID via :)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  b: {
    title: 'Battles',
    commands: [
      { key: 'l', cmd: ['battle', 'list'],   label: 'list battles' },
      { key: 'c', cmd: ['battle', 'create'], label: 'create battle' },
      { key: 's', cmd: ['battle', 'stream'], label: 'stream latest battle' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  s: {
    title: 'Schedules',
    commands: [
      { key: 'l', cmd: ['schedule', 'list'],   label: 'list schedules' },
      { key: 'p', cmd: ['schedule', 'pause'],  label: 'pause schedule (enter ID via :)' },
      { key: 'r', cmd: ['schedule', 'resume'], label: 'resume schedule (enter ID via :)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  m: {
    title: 'Memory',
    commands: [
      { key: 'p', cmd: ['memory', 'list-profiles'], label: 'list memory profiles' },
      { key: 'l', cmd: ['memory', 'list'],           label: 'list entries (enter agent ID via :)' },
      { key: 's', cmd: ['memory', 'search'],         label: 'search memories (enter query via :)' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  l: {
    title: 'Lensers',
    commands: [
      { key: 'l', cmd: ['lenser', 'list'],      label: 'list AI lensers' },
      { key: 'f', cmd: ['lenser', 'followers'], label: 'list your followers' },
      { key: 'g', cmd: ['lenser', 'following'], label: 'list who you follow' },
      { key: 'd', cmd: ['lenser', 'suggested'], label: 'discover suggested lensers' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
  f: {
    title: 'Feed',
    commands: [
      { key: 'f', cmd: ['feed'],        label: 'show activity feed' },
      { key: 'l', cmd: ['leaderboard'], label: 'show leaderboard' },
    ],
    exitKeys: ['q', 'Q', '\x1b'],
  },
}

// ─── Sub-dashboard screen painter ────────────────────────────────────────────

function paintSubScreen(def: SubDashboardDef, subCmd: CmdBarState): void {
  const buf: string[] = []

  const brand = `${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`
  const title = `${A.brightCyan}${A.bold}${def.title}${A.reset}`

  buf.push('')
  buf.push(`  ${brand}   ${A.gray}│${A.reset}   ${title}`)
  buf.push(`  ${A.gray}${'─'.repeat(60)}${A.reset}`)
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}Actions${A.reset}`)
  buf.push('')

  for (const c of def.commands) {
    buf.push(`  ${keyBind(c.key, c.label)}`)
  }

  buf.push('')
  const exitBindings = [
    keyBind(':', 'command'),
    keyBind('q', 'back'),
    keyBind('Esc', 'back'),
  ].join(`  ${A.gray}${sym.dot}${A.reset}  `)
  buf.push(`  ${exitBindings}`)

  paintCommandBar(buf, subCmd, `lf ${def.title.toLowerCase()}`)

  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

// ─── Sub-dashboard interaction loop ──────────────────────────────────────────

async function runSubDashboard(def: SubDashboardDef): Promise<void> {
  let subCmd: CmdBarState = { active: false, input: '', error: null, selectedSuggestion: -1 }
  paintSubScreen(def, subCmd)

  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }

    const onData = async (data: Buffer | string) => {
      const key = data.toString()

      if (key === '\x03') { process.exit(130) }

      // ── Command input mode ─────────────────────────────────────────────────
      if (subCmd.active) {
        if (key === '\x1b') {
          subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
          return
        }
        if (key === '\r' || key === '\n') {
          const suggestions = getSuggestions(subCmd.input)
          let raw = subCmd.input.trim()
          if (subCmd.selectedSuggestion >= 0 && suggestions[subCmd.selectedSuggestion]) {
            raw = suggestions[subCmd.selectedSuggestion].cmd
          }
          if (!raw) {
            subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
            paintSubScreen(def, subCmd)
            return
          }
          const argv = tokenise(raw)
          const validationError = validateSubcommand(argv)
          if (validationError) {
            subCmd = { ...subCmd, error: validationError }
            paintSubScreen(def, subCmd)
            return
          }
          subCmd = { active: false, input: '', error: null, selectedSuggestion: -1 }
          process.stdin.off('data', onData)
          try { process.stdin.setRawMode(false) } catch { /* ignore */ }
          await runChild(argv)
          try { process.stdin.setRawMode(true) } catch { /* ignore */ }
          paintSubScreen(def, subCmd)
          process.stdin.on('data', onData)
          return
        }
        // Tab — cycle forward
        if (key === '\t') {
          const suggestions = getSuggestions(subCmd.input)
          if (suggestions.length > 0) {
            const next = (subCmd.selectedSuggestion + 1) % suggestions.length
            subCmd = { ...subCmd, selectedSuggestion: next }
            paintSubScreen(def, subCmd)
          }
          return
        }
        // Shift+Tab — cycle backwards
        if (key === '\x1b[Z') {
          const suggestions = getSuggestions(subCmd.input)
          if (suggestions.length > 0) {
            const prev = subCmd.selectedSuggestion <= 0
              ? suggestions.length - 1
              : subCmd.selectedSuggestion - 1
            subCmd = { ...subCmd, selectedSuggestion: prev }
            paintSubScreen(def, subCmd)
          }
          return
        }
        if (key === '\x7f' || key === '\x08') {
          subCmd = { ...subCmd, input: subCmd.input.slice(0, -1), error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
          return
        }
        if (key.length === 1 && key >= ' ') {
          subCmd = { ...subCmd, input: subCmd.input + key, error: null, selectedSuggestion: -1 }
          paintSubScreen(def, subCmd)
        }
        return
      }

      // ── Normal sub-dashboard mode ──────────────────────────────────────────
      if (key === ':') {
        subCmd = { active: true, input: '', error: null, selectedSuggestion: -1 }
        paintSubScreen(def, subCmd)
        return
      }
      if (def.exitKeys.includes(key)) {
        process.stdin.off('data', onData)
        resolve()
        return
      }
      const action = def.commands.find((c) => c.key === key)
      if (action) {
        process.stdin.off('data', onData)
        try { process.stdin.setRawMode(false) } catch { /* ignore */ }
        await runChild(action.cmd)
        try { process.stdin.setRawMode(true) } catch { /* ignore */ }
        paintSubScreen(def, subCmd)
        process.stdin.on('data', onData)
      }
    }

    process.stdin.on('data', onData)
  })
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

function runChild(argv: string[]): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(A.showCursor + A.clearScreen + A.homeCursor)
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

function tokenise(raw: string): string[] {
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

// ─── Public entry point ──────────────────────────────────────────────────────

let restoreCleanup = () => { /* installed in runDashboard */ }

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

  const exit = (code = 0) => { cleanup(); process.exit(code) }

  process.on('SIGINT', () => exit(130))
  process.on('SIGTERM', () => exit(143))

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')

  async function submitCommand(): Promise<void> {
    const suggestions = getSuggestions(cmdState.input)
    let raw = cmdState.input.trim()
    if (cmdState.selectedSuggestion >= 0 && suggestions[cmdState.selectedSuggestion]) {
      raw = suggestions[cmdState.selectedSuggestion].cmd
    }

    if (!raw) {
      cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
      paintMainScreen()
      return
    }

    const argv = tokenise(raw)
    const validationError = validateSubcommand(argv)
    if (validationError) {
      cmdState = { ...cmdState, error: validationError }
      paintMainScreen()
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

  process.stdin.on('data', async (data) => {
    const key = data.toString()

    if (key === '\x03') { exit(130); return }
    if (inChild) return

    // ── Command input mode ───────────────────────────────────────────────────
    if (cmdState.active) {
      if (key === '\x1b') {
        cmdState = { active: false, input: '', error: null, selectedSuggestion: -1 }
        paintMainScreen()
        return
      }
      if (key === '\r' || key === '\n') {
        await submitCommand()
        return
      }
      if (key === '\t') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const next = (cmdState.selectedSuggestion + 1) % suggestions.length
          cmdState = { ...cmdState, selectedSuggestion: next }
          paintMainScreen()
        }
        return
      }
      if (key === '\x1b[Z') {
        const suggestions = getSuggestions(cmdState.input)
        if (suggestions.length > 0) {
          const prev = cmdState.selectedSuggestion <= 0
            ? suggestions.length - 1
            : cmdState.selectedSuggestion - 1
          cmdState = { ...cmdState, selectedSuggestion: prev }
          paintMainScreen()
        }
        return
      }
      if (key === '\x7f' || key === '\x08') {
        cmdState = { ...cmdState, input: cmdState.input.slice(0, -1), error: null, selectedSuggestion: -1 }
        paintMainScreen()
        return
      }
      if (key.length === 1 && key >= ' ') {
        cmdState = { ...cmdState, input: cmdState.input + key, error: null, selectedSuggestion: -1 }
        paintMainScreen()
      }
      return
    }

    // ── Normal dashboard mode ────────────────────────────────────────────────
    if (key === ':') {
      cmdState = { active: true, input: '', error: null, selectedSuggestion: -1 }
      paintMainScreen()
      return
    }
    if (key === 'q' || key === 'Q' || key === '\x1b') { exit(0); return }

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
    }
  })

  await renderFrame()
  timer = setInterval(() => { void renderFrame() }, 2000)
}

export function _internal_getRestoreCleanup(): () => void {
  return restoreCleanup
}
