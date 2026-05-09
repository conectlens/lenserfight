import { spawn } from 'node:child_process'
import { A, sym } from '../utils/ansi'
import { detectOllama, detectDocker } from '../lib/onboarding/detect'
import { fetchJourneyState } from '../lib/onboarding/journey'
import { isAuthenticated } from '../utils/auth'
import { getSuggestions, validateSubcommand } from './dashboard'
import {
  ROOMS,
  type RuntimeEnv,
  type LabyrinthProgress,
  type LabyrinthPath,
  type PathAction,
} from './rooms'

// ── State ─────────────────────────────────────────────────────────────────────

interface LabyrinthState {
  roomId: string
  cursorIdx: number
  history: string[]
  env: RuntimeEnv
  progress: LabyrinthProgress
  // search
  searchActive: boolean
  searchQuery: string
  // command bar (`:` mode)
  cmdActive: boolean
  cmdInput: string
  cmdError: string | null
  cmdSuggestion: number
  // discovery flash — shown once per newly revealed path
  pendingDiscovery: string | null
  // help overlay
  helpActive: boolean
  // transient status line after command execution
  statusMsg: string | null
}

const EMPTY_ENV: RuntimeEnv = {
  ollama: false,
  docker: false,
  supabase: false,
  authenticated: false,
  journeyState: null,
  battleCount: 0,
  agentCount: 0,
  teamCount: 0,
  workflowCount: 0,
}

let state: LabyrinthState = {
  roomId: 'bootstrap',
  cursorIdx: 0,
  history: [],
  env: EMPTY_ENV,
  progress: {
    visitedRooms: new Set(),
    discoveredHidden: new Set(),
    totalBattles: 0,
  },
  searchActive: false,
  searchQuery: '',
  cmdActive: false,
  cmdInput: '',
  cmdError: null,
  cmdSuggestion: -1,
  pendingDiscovery: null,
  helpActive: false,
  statusMsg: null,
}

// ── Runtime environment scanner ───────────────────────────────────────────────

async function scanEnv(): Promise<RuntimeEnv> {
  const [ollamaResult, dockerResult, journeyResult] = await Promise.allSettled([
    detectOllama(),
    Promise.resolve(detectDocker()),
    fetchJourneyState().catch(() => null),
  ])

  return {
    ollama: ollamaResult.status === 'fulfilled' && ollamaResult.value.ok,
    docker: dockerResult.status === 'fulfilled' && dockerResult.value.ok,
    supabase: false,
    authenticated: isAuthenticated(),
    journeyState: journeyResult.status === 'fulfilled' ? journeyResult.value : null,
    battleCount: 0,
    agentCount: 0,
    teamCount: 0,
    workflowCount: 0,
  }
}

// ── Discovery checker ─────────────────────────────────────────────────────────

function checkDiscoveries(env: RuntimeEnv, progress: LabyrinthProgress): string | null {
  if (env.ollama && progress.totalBattles >= 1 && !progress.discoveredHidden.has('local_arena')) {
    return 'local_arena'
  }
  if (env.journeyState?.team_created && !progress.discoveredHidden.has('team_collab')) {
    return 'team_collab'
  }
  return null
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function getVisiblePaths(s: LabyrinthState): LabyrinthPath[] {
  const room = ROOMS[s.roomId]
  if (!room) return []
  const all = room.buildPaths(s.env, s.progress)
  if (!s.searchActive || !s.searchQuery.trim()) return all
  const q = s.searchQuery.toLowerCase()
  return all.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      (p.sublabel ?? '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q),
  )
}

function clampCursor(idx: number, paths: LabyrinthPath[]): number {
  if (paths.length === 0) return 0
  return Math.max(0, Math.min(idx, paths.length - 1))
}

function recommendedCursorIdx(
  roomId: string,
  env: RuntimeEnv,
  progress: LabyrinthProgress,
): number {
  const room = ROOMS[roomId]
  if (!room) return 0
  const rec = room.recommend(env, progress)
  if (!rec) return 0
  const paths = room.buildPaths(env, progress)
  const idx = paths.findIndex((p) => p.id === rec)
  return idx >= 0 ? idx : 0
}

// ── ANSI layout helpers ───────────────────────────────────────────────────────

const SEP = `  ${A.gray}${'─'.repeat(62)}${A.reset}`

function breadcrumb(s: LabyrinthState): string {
  const chain = [...s.history, s.roomId]
  return chain.map((r) => `${A.gray}${r}${A.reset}`).join(`${A.dim}/${A.reset}`)
}

function badgeStr(badge: string | undefined): string {
  if (!badge) return ''
  return `  ${A.bgMagenta}${A.white}${A.bold} ${badge} ${A.reset}`
}

function pathLine(path: LabyrinthPath, selected: boolean): string {
  const cursor = selected
    ? `${A.brightYellow}${sym.arrow}${A.reset}`
    : ' '
  const keyHint = `${A.gray}[${A.reset}${A.brightYellow}${path.key}${A.reset}${A.gray}]${A.reset}`

  let labelColor: string
  let dimSuffix: string

  if (!path.unlocked) {
    labelColor = A.dim
    dimSuffix = `  ${A.dim}⚠ locked${A.reset}`
  } else if (selected) {
    labelColor = `${A.bold}${A.brightWhite}`
    dimSuffix = path.sublabel ? `  ${A.dim}${path.sublabel}${A.reset}` : ''
  } else {
    labelColor = A.brightCyan
    dimSuffix = path.sublabel ? `  ${A.dim}${path.sublabel}${A.reset}` : ''
  }

  const badge = badgeStr(path.badge)
  return `  ${cursor} ${keyHint} ${labelColor}${path.label}${A.reset}${dimSuffix}${badge}`
}

// ── Screen painters ───────────────────────────────────────────────────────────

function paintScreen(s: LabyrinthState): void {
  const buf: string[] = []
  const room = ROOMS[s.roomId]

  // header
  buf.push('')
  buf.push(
    `  ${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}` +
    `  ${A.gray}│${A.reset}  ` +
    breadcrumb(s) +
    `  ${A.gray}│${A.reset}  ` +
    (s.env.authenticated
      ? `${A.brightGreen}${A.bold}ONLINE${A.reset}`
      : `${A.brightRed}OFFLINE${A.reset}`),
  )
  buf.push(SEP)

  if (!room) {
    buf.push(`  ${A.brightRed}Unknown room: ${s.roomId}${A.reset}`)
    process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
    return
  }

  // room title + subtitle
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}${room.title}${A.reset}`)
  buf.push(`  ${A.dim}${room.subtitle(s.env)}${A.reset}`)
  buf.push('')
  buf.push(SEP)
  buf.push('')
  buf.push(`  ${A.bold}${A.brightWhite}Available Paths${A.reset}`)
  buf.push('')

  const paths = getVisiblePaths(s)

  if (paths.length === 0) {
    buf.push(`  ${A.gray}${sym.dot}  No paths match your query.${A.reset}`)
  } else {
    for (let i = 0; i < paths.length; i++) {
      buf.push(pathLine(paths[i], i === s.cursorIdx))
    }
  }

  buf.push('')
  buf.push(SEP)

  // recommended action
  const rec = room.recommend(s.env, s.progress)
  if (rec) {
    const recPath = paths.find((p) => p.id === rec)
    if (recPath) {
      buf.push(
        `  ${A.dim}Suggested:${A.reset}  ${A.brightYellow}${sym.arrow}${A.reset}  ${A.bold}${recPath.label}${A.reset}`,
      )
    }
  }

  // search bar
  if (s.searchActive) {
    buf.push('')
    buf.push(
      `  ${A.gray}/${A.reset}  ${A.brightWhite}${s.searchQuery}${A.reset}${A.brightYellow}▎${A.reset}` +
      `  ${A.dim}Esc to cancel  Enter to select${A.reset}`,
    )
  }

  // command bar
  if (s.cmdActive) {
    buf.push('')
    if (s.cmdError) {
      buf.push(`  ${A.brightRed}${sym.fail}  ${s.cmdError}${A.reset}`)
    }
    buf.push(
      `  ${A.gray}lf${A.reset} ${A.brightYellow}${sym.arrow}${A.reset} ` +
      `${A.brightWhite}${s.cmdInput}${A.reset}${A.brightYellow}▎${A.reset}` +
      `  ${A.dim}Enter to run  Tab/↑↓ to pick  Esc to cancel${A.reset}`,
    )
    const sugs = getSuggestions(s.cmdInput)
    if (sugs.length > 0) {
      buf.push('')
      sugs.forEach((sg, i) => {
        const sel = i === s.cmdSuggestion
        if (sel) {
          buf.push(
            `  ${A.bgBlue}${A.brightWhite}  ${sym.arrow} ${sg.cmd.padEnd(32)}${A.dim}${sg.desc}${A.reset}`,
          )
        } else {
          buf.push(
            `  ${A.gray}${sym.dot}${A.reset}  ${A.brightCyan}${sg.cmd.padEnd(32)}${A.reset}${A.dim}${sg.desc}${A.reset}`,
          )
        }
      })
    }
  }

  // help overlay
  if (s.helpActive) {
    buf.push('')
    buf.push(SEP)
    buf.push(`  ${A.bold}${A.brightWhite}Keyboard Reference${A.reset}`)
    buf.push('')
    const keys = [
      ['j / k',     'navigate up / down'],
      ['gg / G',    'jump to first / last path'],
      ['Enter',     'execute selected path'],
      ['Space',     'preview path details'],
      ['Tab',       'expand action details'],
      ['b',         'backtrack to previous room'],
      ['/',         'search paths'],
      [':',         'command bar'],
      ['?',         'toggle this help'],
      ['q / Esc',   'quit labyrinth'],
    ]
    for (const [k, desc] of keys) {
      buf.push(
        `  ${A.gray}[${A.reset}${A.brightYellow}${k.padEnd(10)}${A.reset}${A.gray}]${A.reset}  ${A.dim}${desc}${A.reset}`,
      )
    }
  }

  // status message
  if (s.statusMsg) {
    buf.push('')
    buf.push(`  ${A.brightGreen}${sym.pass}  ${s.statusMsg}${A.reset}`)
  }

  // footer bindings
  buf.push('')
  const footer = [
    `${A.gray}[${A.reset}${A.brightYellow}j/k${A.reset}${A.gray}]${A.reset}${A.dim} move${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}Enter${A.reset}${A.gray}]${A.reset}${A.dim} run${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}b${A.reset}${A.gray}]${A.reset}${A.dim} back${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}/${A.reset}${A.gray}]${A.reset}${A.dim} search${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}:${A.reset}${A.gray}]${A.reset}${A.dim} command${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}?${A.reset}${A.gray}]${A.reset}${A.dim} help${A.reset}`,
    `${A.gray}[${A.reset}${A.brightYellow}q${A.reset}${A.gray}]${A.reset}${A.dim} quit${A.reset}`,
  ].join(`  ${A.gray}·${A.reset}  `)
  buf.push(`  ${footer}`)

  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintLoadingScreen(msg: string): void {
  const buf: string[] = [
    '',
    `  ${A.brightMagenta}${A.bold}${sym.fight}  LenserFight${A.reset}`,
    SEP,
    '',
    `  ${A.brightCyan}${sym.run}  ${msg}${A.reset}`,
    '',
  ]
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintDiscoveryFlash(name: string, reason: string): void {
  const buf: string[] = [
    '',
    `  ${A.brightMagenta}${A.bold}${sym.robot}  DISCOVERY UNLOCKED${A.reset}`,
    SEP,
    '',
    `  ${A.bold}${A.brightYellow}${name}${A.reset}`,
    '',
    `  ${A.dim}Reason: ${reason}${A.reset}`,
    `  ${A.dim}A new path has been added to the labyrinth.${A.reset}`,
    '',
    SEP,
    `  ${A.gray}Press any key to continue…${A.reset}`,
    '',
  ]
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

// ── Child process runner ──────────────────────────────────────────────────────

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

function waitForAnyKey(): Promise<void> {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    const onData = (buf: Buffer | string) => {
      const key = buf.toString()
      if (key === '\x03') { process.stdin.off('data', onData); process.exit(130) }
      process.stdin.off('data', onData)
      resolve()
    }
    process.stdin.on('data', onData)
  })
}

function runChild(argv: string[]): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(A.showCursor + A.clearScreen + A.homeCursor)
    process.stdout.write(
      `\n  ${A.bold}${A.brightCyan}${sym.run}  lf ${argv.join(' ')}${A.reset}\n\n`,
    )
    const child = spawn('lf', argv, { stdio: 'inherit' })
    child.on('exit', () => {
      process.stdout.write(
        `\n  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} / Enter to return…${A.reset}\n`,
      )
      void waitForReturnKey().then(resolve)
    })
    child.on('error', () => {
      process.stdout.write(
        `\n  ${A.brightRed}${sym.fail}  Could not spawn lf — is it on PATH?${A.reset}\n` +
        `  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} to return.${A.reset}\n`,
      )
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

// ── Navigation helpers ────────────────────────────────────────────────────────

function navigateTo(roomId: string): void {
  if (!ROOMS[roomId]) return
  state.history.push(state.roomId)
  state.roomId = roomId
  state.progress.visitedRooms.add(roomId)
  state.cursorIdx = recommendedCursorIdx(roomId, state.env, state.progress)
  state.searchActive = false
  state.searchQuery = ''
  state.statusMsg = null
  state.helpActive = false
}

function backtrack(): void {
  const prev = state.history.pop()
  if (prev) {
    state.roomId = prev
    state.cursorIdx = 0
    state.searchActive = false
    state.searchQuery = ''
    state.statusMsg = null
  }
}

// ── Action dispatcher ─────────────────────────────────────────────────────────

type ActionResult =
  | { type: 'done' }
  | { type: 'prompt'; prefill: string }
  | { type: 'navigate'; roomId: string }

async function dispatchAction(action: PathAction): Promise<ActionResult> {
  if (action.type === 'navigate') {
    return { type: 'navigate', roomId: action.roomId }
  }
  if (action.type === 'prompt') {
    return { type: 'prompt', prefill: action.prefill }
  }
  // execute
  await runChild(action.argv)
  return { type: 'done' }
}

// ── Command bar submit ────────────────────────────────────────────────────────

async function submitCommandBar(): Promise<boolean> {
  const sugs = getSuggestions(state.cmdInput)
  let raw = state.cmdInput.trim()
  if (state.cmdSuggestion >= 0 && sugs[state.cmdSuggestion]) {
    raw = sugs[state.cmdSuggestion].cmd
  }
  if (!raw) {
    state.cmdActive = false
    state.cmdInput = ''
    state.cmdError = null
    state.cmdSuggestion = -1
    return false
  }
  const argv = tokenise(raw)
  const err = validateSubcommand(argv)
  if (err) {
    state.cmdError = err
    return false
  }
  state.cmdActive = false
  state.cmdInput = ''
  state.cmdError = null
  state.cmdSuggestion = -1
  await runChild(argv)
  return true
}

// ── Main keyboard handler ─────────────────────────────────────────────────────

type HandlerMode = 'normal' | 'search' | 'cmd' | 'discovery'
let handlerMode: HandlerMode = 'normal'
let pendingGg = false

async function handleKey(
  key: string,
  onChildStart: () => void,
  onChildEnd: () => void,
): Promise<boolean> {
  if (key === '\x03') { process.exit(130) }

  // ── Discovery flash mode ──────────────────────────────────────────────────
  if (handlerMode === 'discovery') {
    handlerMode = 'normal'
    state.pendingDiscovery = null
    return false
  }

  // ── Command bar mode ──────────────────────────────────────────────────────
  if (state.cmdActive) {
    if (key === '\x1b') {
      state.cmdActive = false
      state.cmdInput = ''
      state.cmdError = null
      state.cmdSuggestion = -1
      return false
    }
    if (key === '\r' || key === '\n') {
      onChildStart()
      try { process.stdin.setRawMode(false) } catch { /* ignore */ }
      const ran = await submitCommandBar()
      try { process.stdin.setRawMode(true) } catch { /* ignore */ }
      onChildEnd()
      if (ran) {
        state.statusMsg = 'Command executed.'
        // Refresh env after a command
        state.env = await scanEnv()
      }
      return false
    }
    if (key === '\t') {
      const sugs = getSuggestions(state.cmdInput)
      if (sugs.length > 0) {
        state.cmdSuggestion = (state.cmdSuggestion + 1) % sugs.length
      }
      return false
    }
    if (key === '\x1b[Z') {
      const sugs = getSuggestions(state.cmdInput)
      if (sugs.length > 0) {
        state.cmdSuggestion = state.cmdSuggestion <= 0 ? sugs.length - 1 : state.cmdSuggestion - 1
      }
      return false
    }
    if (key === '\x7f' || key === '\x08') {
      state.cmdInput = state.cmdInput.slice(0, -1)
      state.cmdError = null
      state.cmdSuggestion = -1
      return false
    }
    if (key.length === 1 && key >= ' ') {
      state.cmdInput += key
      state.cmdError = null
      state.cmdSuggestion = -1
    }
    return false
  }

  // ── Search mode ───────────────────────────────────────────────────────────
  if (state.searchActive) {
    if (key === '\x1b') {
      state.searchActive = false
      state.searchQuery = ''
      state.cursorIdx = 0
      return false
    }
    if (key === '\r' || key === '\n') {
      const paths = getVisiblePaths(state)
      if (paths.length > 0) {
        state.cursorIdx = 0
        state.searchActive = false
        state.searchQuery = ''
      }
      return false
    }
    if (key === '\x7f' || key === '\x08') {
      state.searchQuery = state.searchQuery.slice(0, -1)
      state.cursorIdx = 0
      return false
    }
    if (key.length === 1 && key >= ' ') {
      state.searchQuery += key
      state.cursorIdx = 0
    }
    return false
  }

  // ── Normal navigation mode ────────────────────────────────────────────────
  const paths = getVisiblePaths(state)

  // quit
  if (key === 'q' || key === 'Q' || key === '\x1b') {
    if (state.history.length > 0) {
      backtrack()
      return false
    }
    return true // signal exit
  }

  // help toggle
  if (key === '?') {
    state.helpActive = !state.helpActive
    return false
  }

  // activate command bar
  if (key === ':') {
    state.cmdActive = true
    state.cmdInput = ''
    state.cmdError = null
    state.cmdSuggestion = -1
    return false
  }

  // activate search
  if (key === '/') {
    state.searchActive = true
    state.searchQuery = ''
    state.cursorIdx = 0
    return false
  }

  // backtrack
  if (key === 'b') {
    backtrack()
    return false
  }

  // cursor movement
  if (key === 'j' || key === '\x1b[B') {
    state.cursorIdx = clampCursor(state.cursorIdx + 1, paths)
    pendingGg = false
    return false
  }
  if (key === 'k' || key === '\x1b[A') {
    state.cursorIdx = clampCursor(state.cursorIdx - 1, paths)
    pendingGg = false
    return false
  }

  // gg / G jumps
  if (key === 'G') {
    state.cursorIdx = clampCursor(paths.length - 1, paths)
    pendingGg = false
    return false
  }
  if (key === 'g') {
    if (pendingGg) {
      state.cursorIdx = 0
      pendingGg = false
    } else {
      pendingGg = true
    }
    return false
  }

  pendingGg = false

  // execute / navigate selected path
  if (key === '\r' || key === '\n') {
    const path = paths[state.cursorIdx]
    if (!path || !path.unlocked) return false

    if (path.action.type === 'navigate') {
      navigateTo(path.action.roomId)
      return false
    }

    if (path.action.type === 'prompt') {
      state.cmdActive = true
      state.cmdInput = path.action.prefill
      state.cmdError = null
      state.cmdSuggestion = -1
      return false
    }

    // execute argv
    onChildStart()
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    await runChild(path.action.argv)
    try { process.stdin.setRawMode(true) } catch { /* ignore */ }
    onChildEnd()
    state.statusMsg = `Executed: lf ${path.action.argv.join(' ')}`
    state.env = await scanEnv()
    // check for newly discovered paths
    const discovery = checkDiscoveries(state.env, state.progress)
    if (discovery) {
      state.pendingDiscovery = discovery
    }
    return false
  }

  // space = preview (non-destructive — just shows sublabel in status)
  if (key === ' ') {
    const path = paths[state.cursorIdx]
    if (path) {
      state.statusMsg = path.sublabel
        ? `${path.label}  —  ${path.sublabel}`
        : path.label
    }
    return false
  }

  return false
}

// ── Discovery flash orchestrator ──────────────────────────────────────────────

const DISCOVERY_LABELS: Record<string, { label: string; reason: string }> = {
  local_arena: {
    label: 'Local Model Tournament',
    reason: 'Ollama runtime detected + first battle completed',
  },
  team_collab: {
    label: 'Advanced Team Collaboration',
    reason: 'Team created — multi-agent orchestration unlocked',
  },
}

async function handleDiscoveryFlash(id: string): Promise<void> {
  const meta = DISCOVERY_LABELS[id] ?? { label: id, reason: 'conditions met' }
  state.progress.discoveredHidden.add(id)
  paintDiscoveryFlash(meta.label, meta.reason)
  await waitForAnyKey()
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function runLabyrinth(): Promise<void> {
  const isTTY = process.stdin.isTTY

  // Non-TTY: just print room listing and exit
  if (!isTTY) {
    paintLoadingScreen('Scanning environment…')
    const env = await scanEnv()
    state.env = env
    const room = ROOMS[state.roomId]
    if (room) {
      process.stdout.write(
        `${room.title}\n${room.subtitle(env)}\n\n` +
        room.buildPaths(env, state.progress)
          .map((p) => `  [${p.key}] ${p.label}${p.unlocked ? '' : ' (locked)'}`)
          .join('\n') +
        '\n',
      )
    }
    return
  }

  const out = process.stdout
  out.write(A.altScreenOn + A.hideCursor)

  const cleanup = () => {
    try { process.stdin.setRawMode(false) } catch { /* ignore */ }
    process.stdin.pause()
    out.write(A.showCursor + A.altScreenOff)
  }

  const exit = (code = 0) => { cleanup(); process.exit(code) }
  process.on('SIGINT', () => exit(130))
  process.on('SIGTERM', () => exit(143))

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')

  // Initial env scan
  paintLoadingScreen('Scanning environment…')
  state.env = await scanEnv()
  state.progress.visitedRooms.add(state.roomId)
  state.cursorIdx = recommendedCursorIdx(state.roomId, state.env, state.progress)

  // Check for initial discoveries (e.g. returning user with Ollama + battles)
  const initialDiscovery = checkDiscoveries(state.env, state.progress)
  if (initialDiscovery) {
    state.pendingDiscovery = initialDiscovery
  }

  paintScreen(state)

  let inChild = false

  process.stdin.on('data', async (data) => {
    if (inChild) return
    const key = data.toString()

    // Handle pending discovery flash first
    if (state.pendingDiscovery) {
      const id = state.pendingDiscovery
      inChild = true
      try { process.stdin.setRawMode(false) } catch { /* ignore */ }
      await handleDiscoveryFlash(id)
      try { process.stdin.setRawMode(true) } catch { /* ignore */ }
      inChild = false
      state.pendingDiscovery = null
      paintScreen(state)
      return
    }

    const shouldExit = await handleKey(
      key,
      () => { inChild = true },
      () => { inChild = false },
    )

    if (shouldExit) {
      exit(0)
      return
    }

    paintScreen(state)
  })
}
