import { getExecContext, setExecContext } from '@lenserfight/cli-client'
import { Box, Static, Text, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'

import { formatDispatchError } from '../../lib/error-format'
import { appendHistory, loadHistory } from '../../lib/history'
import { describeShellDanger } from '../../lib/shell-danger'
import { execShell, killActiveShellChild, parseCd } from '../../lib/shell-exec'
import { readCliVersion } from '../../lib/version'
import { dispatchInProcess } from '../command-dispatch'
import { getSuggestions, tokenise } from '../dashboard'


import { CommandPalette } from './CommandPalette'
import { HistorySearch } from './HistorySearch'
import { ConfirmDialog } from './shared/ConfirmDialog'
import { HelpOverlay, type ShortcutEntry } from './shared/HelpOverlay'
import { StatusLine } from './StatusLine'
import { TranscriptOutput } from './TranscriptOutput'
import { useDashboardData } from './useDashboardData'

import type { TranscriptEntry } from './replTypes'
import type { TranscriptLine } from '../stream-capture'
import type { ConfirmRequest } from './state/types'

export interface ReplProps {
  onQuit: (code: number) => void
}

interface InputState {
  value: string
  cursor: number
}

const EMPTY_INPUT: InputState = { value: '', cursor: 0 }

const META_NAMES = new Set(['help', 'clear', 'history', 'status', 'settings', 'quit', 'debug'])

function matchMeta(raw: string): string | null {
  const m = raw.trim().match(/^\/(\w+)\s*$/)
  if (!m) return null
  const name = m[1].toLowerCase()
  return META_NAMES.has(name) ? name : null
}

function hasUnterminatedQuote(s: string): boolean {
  let quote: '"' | "'" | null = null
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
    }
  }
  return quote !== null
}

function completeBuffer(current: string): string | null {
  if (!current || current.includes(' ')) return null
  const matches = getSuggestions(current, 1)
  return matches[0]?.cmd ?? null
}

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Enter', description: 'Run the typed command' },
  { keys: '↑ / ↓', description: 'Browse command history (retry a past command by recalling + Enter)' },
  { keys: 'Ctrl+R', description: 'Reverse-search history' },
  { keys: 'Tab', description: 'Complete the command name' },
  { keys: 'Ctrl+K', description: 'Search the full command palette' },
  { keys: '!<cmd>', description: 'Run a local shell command (cwd persists, cd is tracked)' },
  { keys: 'Ctrl+C', description: 'Cancel the running command, or quit LenserFight if idle' },
]

const DISCOVERY_TIPS: ShortcutEntry[] = [
  { keys: 'agents, battle, workflow, …', description: 'Type any top-level command name to run it directly' },
  { keys: 'AGENTS · /agents · lf agents', description: 'Case and lf/lenserfight/slash prefixes are all accepted' },
  { keys: '/help /clear /history', description: 'TUI controls — not dispatched as CLI commands' },
  { keys: '/status /settings /debug /quit', description: 'More TUI controls (status/settings delegate to the real commands)' },
]

function welcomeEntry(): TranscriptEntry {
  return {
    id: 'welcome',
    kind: 'system',
    displayCommand: `LenserFight CLI v${readCliVersion()}`,
    lines: [{ stream: 'info', text: 'Type a command, or /help for a shortcut reference. Ctrl+C to quit.' }],
    status: 'done',
    startedAt: Date.now(),
    finishedAt: Date.now(),
  }
}

export function Repl({ onQuit }: ReplProps) {
  const dashboardData = useDashboardData(2000)

  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => [welcomeEntry()])
  const [liveEntry, setLiveEntry] = useState<TranscriptEntry | null>(null)
  const [inputState, setInputState] = useState<InputState>(EMPTY_INPUT)
  const [historyList, setHistoryList] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [draft, setDraft] = useState('')
  const [reverseSearchOpen, setReverseSearchOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmQueue, setConfirmQueue] = useState<ConfirmRequest[]>([])
  const [debugMode, setDebugMode] = useState(false)
  const [cwd, setCwd] = useState(() => process.cwd())

  const seqRef = useRef(0)
  const confirmSeqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const debugModeRef = useRef(false)

  // Mirrors inputState synchronously so rapid-fire input events (a paste, or
  // several keystrokes arriving in the same tick before React re-renders)
  // always build on the true latest value instead of a stale render closure
  // — the same class of bug CommandPalette.tsx avoids with functional
  // setState, but this component also needs a synchronous read (e.g. on
  // Enter) rather than just a functional writer.
  const inputRef = useRef<InputState>(EMPTY_INPUT)

  function updateInput(updater: (prev: InputState) => InputState): void {
    const next = updater(inputRef.current)
    inputRef.current = next
    setInputState(next)
  }

  function setInputValue(value: string): void {
    updateInput(() => ({ value, cursor: Array.from(value).length }))
  }

  useEffect(() => {
    debugModeRef.current = debugMode
  }, [debugMode])

  useEffect(() => {
    void loadHistory().then(setHistoryList)
  }, [])

  useEffect(() => () => killActiveShellChild(), [])

  const isRunning = liveEntry !== null
  const overlayActive = reverseSearchOpen || paletteOpen || helpOpen || confirmQueue.length > 0

  function requestConfirm(opts: { title: string; description: string; risk: ConfirmRequest['risk'] }): Promise<boolean> {
    return new Promise((resolve) => {
      const id = `confirm-${++confirmSeqRef.current}`
      setConfirmQueue((q) => [
        ...q,
        {
          id,
          title: opts.title,
          description: opts.description,
          risk: opts.risk,
          confirmLabel: 'Run',
          cancelLabel: 'Cancel',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      ])
    })
  }

  function pushSystemMessage(displayCommand: string, lines: string[]): void {
    const entry: TranscriptEntry = {
      id: String(++seqRef.current),
      kind: 'meta',
      displayCommand,
      lines: lines.map((text) => ({ stream: 'info' as const, text })),
      status: 'done',
      startedAt: Date.now(),
      finishedAt: Date.now(),
    }
    setTranscript((t) => [...t, entry])
  }

  async function runCommandEntry(argv: string[]): Promise<void> {
    const id = String(++seqRef.current)
    const collected: TranscriptLine[] = []
    const base: TranscriptEntry = {
      id,
      kind: 'command',
      displayCommand: `lf ${argv.join(' ')}`,
      argv,
      lines: [],
      status: 'running',
      startedAt: Date.now(),
    }
    setLiveEntry(base)

    const ac = new AbortController()
    abortRef.current = ac

    const result = await dispatchInProcess(argv, {
      signal: ac.signal,
      onLine: (line) => {
        collected.push(line)
        setLiveEntry((prev) => (prev && prev.id === id ? { ...prev, lines: collected.slice() } : prev))
      },
    })
    abortRef.current = null

    const cancelled = ac.signal.aborted
    const finished: TranscriptEntry = {
      ...base,
      lines: collected,
      status: cancelled ? 'cancelled' : result.code === 0 ? 'done' : 'error',
      exitCode: result.code,
      finishedAt: Date.now(),
    }
    if (finished.status === 'error' && result.error) {
      const fmt = formatDispatchError(result.error, argv, result.suggestions ?? [])
      finished.errorSummary = fmt.recovery ? `${fmt.cause}\n${fmt.recovery}` : fmt.cause
      if (debugModeRef.current) finished.errorDetail = fmt.detail
    }
    setTranscript((t) => [...t, finished])
    setLiveEntry(null)
  }

  async function runShellEntry(shellCmd: string): Promise<void> {
    const cdTarget = parseCd(shellCmd, cwd)
    if (cdTarget !== null) {
      setCwd(cdTarget)
      pushSystemMessage(`!${shellCmd}`, [`cwd → ${cdTarget}`])
      return
    }

    const danger = describeShellDanger(shellCmd)
    if (danger) {
      const proceed = await requestConfirm({
        title: 'Run destructive shell command?',
        description: `!${shellCmd}\n\nDetected: ${danger}`,
        risk: 'HIGH',
      })
      if (!proceed) {
        pushSystemMessage(`!${shellCmd}`, ['Cancelled — not run.'])
        return
      }
    }

    const id = String(++seqRef.current)
    const collected: TranscriptLine[] = []
    const base: TranscriptEntry = {
      id,
      kind: 'shell',
      displayCommand: shellCmd,
      lines: [],
      status: 'running',
      startedAt: Date.now(),
    }
    setLiveEntry(base)

    const ac = new AbortController()
    abortRef.current = ac

    const result = await execShell(shellCmd, {
      cwd,
      signal: ac.signal,
      onLine: (line) => {
        collected.push(line)
        setLiveEntry((prev) => (prev && prev.id === id ? { ...prev, lines: collected.slice() } : prev))
      },
    })
    abortRef.current = null

    const finished: TranscriptEntry = {
      ...base,
      lines: collected,
      status: result.cancelled ? 'cancelled' : result.exitCode === 0 ? 'done' : 'error',
      exitCode: result.exitCode ?? undefined,
      finishedAt: Date.now(),
    }
    if (finished.status === 'error') {
      finished.errorSummary = `Exited with code ${result.exitCode}.`
    }
    setTranscript((t) => [...t, finished])
    setLiveEntry(null)
  }

  async function handleMeta(name: string): Promise<void> {
    switch (name) {
      case 'help':
        setHelpOpen(true)
        return
      case 'clear':
        process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
        setTranscript([])
        return
      case 'history': {
        const recent = historyList.slice(-20)
        pushSystemMessage(
          '/history',
          recent.length
            ? recent.map((h, i) => `${historyList.length - recent.length + i + 1}  ${h}`)
            : ['No commands typed yet this session.'],
        )
        return
      }
      case 'status':
        await runCommandEntry(['status'])
        return
      case 'settings':
        await runCommandEntry(['configure'])
        return
      case 'quit':
        onQuit(0)
        return
      case 'debug': {
        const next = !debugMode
        setDebugMode(next)
        setExecContext({ isDebug: next })
        pushSystemMessage('/debug', [
          `Debug mode ${next ? 'ON' : 'OFF'} — ${
            next ? 'future errors show full detail.' : 'future errors show a concise summary only.'
          }`,
        ])
        return
      }
      default:
        return
    }
  }

  async function handleSubmit(raw: string): Promise<void> {
    if (!raw.trim() || isRunning) return

    void appendHistory(raw)
    setHistoryList((h) => [...h, raw])
    setHistoryIndex(-1)
    setDraft('')

    const meta = matchMeta(raw)
    if (meta) {
      await handleMeta(meta)
      return
    }

    const trimmedStart = raw.trimStart()
    if (trimmedStart.startsWith('!')) {
      const shellCmd = trimmedStart.slice(1).trim()
      if (shellCmd) await runShellEntry(shellCmd)
      return
    }

    await runCommandEntry(tokenise(raw))
  }

  // Cancel-while-running: a separate, narrowly-scoped listener so the main
  // input handler below can stay fully inactive during dispatch (a dispatched
  // command may open its own readline prompt for a destructive-action
  // confirmation, which needs to own stdin without Ink's input handling
  // fighting it for keystrokes).
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') abortRef.current?.abort()
    },
    { isActive: isRunning },
  )

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        onQuit(0)
        return
      }
      if (key.ctrl && input === 'r') {
        setReverseSearchOpen(true)
        return
      }
      if (key.ctrl && input === 'k') {
        setPaletteOpen(true)
        return
      }

      if (key.return) {
        if (!key.shift && hasUnterminatedQuote(inputRef.current.value)) {
          insertText('\n')
          return
        }
        const raw = inputRef.current.value
        updateInput(() => EMPTY_INPUT)
        void handleSubmit(raw)
        return
      }

      if (key.upArrow) {
        if (historyList.length === 0) return
        if (historyIndex === -1) setDraft(inputRef.current.value)
        const nextIndex = Math.min(historyList.length - 1, historyIndex + 1)
        setHistoryIndex(nextIndex)
        setInputValue(historyList[historyList.length - 1 - nextIndex])
        return
      }
      if (key.downArrow) {
        if (historyIndex === -1) return
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setInputValue(nextIndex === -1 ? draft : historyList[historyList.length - 1 - nextIndex])
        return
      }

      if (key.leftArrow) {
        updateInput((prev) => ({ ...prev, cursor: Math.max(0, prev.cursor - 1) }))
        return
      }
      if (key.rightArrow) {
        updateInput((prev) => ({ ...prev, cursor: Math.min(Array.from(prev.value).length, prev.cursor + 1) }))
        return
      }

      if (key.tab) {
        const completed = completeBuffer(inputRef.current.value)
        if (completed !== null) setInputValue(completed)
        return
      }

      if (key.backspace || key.delete) {
        updateInput((prev) => {
          if (prev.cursor === 0) return prev
          const chars = Array.from(prev.value)
          chars.splice(prev.cursor - 1, 1)
          return { value: chars.join(''), cursor: prev.cursor - 1 }
        })
        setHistoryIndex(-1)
        return
      }

      if (input && !key.ctrl && !key.meta) {
        insertText(input)
      }

      function insertText(text: string): void {
        updateInput((prev) => {
          const chars = Array.from(prev.value)
          const inserted = Array.from(text)
          chars.splice(prev.cursor, 0, ...inserted)
          return { value: chars.join(''), cursor: prev.cursor + inserted.length }
        })
        setHistoryIndex(-1)
      }
    },
    { isActive: !overlayActive && !isRunning },
  )

  const inputChars = Array.from(inputState.value)
  const before = inputChars.slice(0, inputState.cursor).join('')
  const atCursor = inputChars[inputState.cursor] ?? ' '
  const after = inputChars.slice(inputState.cursor + 1).join('')
  const trimmedInput = inputState.value.trim()
  const showSuggestions =
    !overlayActive && !isRunning && trimmedInput.length > 0 && !inputState.value.trimStart().startsWith('!') && !inputState.value.trimStart().startsWith('/')

  return (
    <Box flexDirection="column" paddingX={1}>
      <Static items={transcript}>{(entry) => <TranscriptOutput key={entry.id} entry={entry} />}</Static>
      {liveEntry ? <TranscriptOutput entry={liveEntry} /> : null}

      <Box marginTop={1}>
        <StatusLine data={dashboardData} cwd={cwd} runningJobs={isRunning ? 1 : 0} debugMode={debugMode} />
      </Box>

      {!overlayActive ? (
        <Box>
          <Text color={isRunning ? 'gray' : 'cyanBright'} bold>
            {isRunning ? '…' : '❯'}{' '}
          </Text>
          <Text>
            {before}
            <Text inverse>{atCursor}</Text>
            {after}
          </Text>
        </Box>
      ) : null}

      {showSuggestions ? (
        <Box flexDirection="column" marginLeft={2}>
          {getSuggestions(trimmedInput, 5).map((s) => (
            <Text key={s.cmd} dimColor>
              {s.cmd} <Text color="gray">— {s.desc}</Text>
            </Text>
          ))}
        </Box>
      ) : null}

      {reverseSearchOpen ? (
        <HistorySearch
          history={historyList}
          onClose={() => setReverseSearchOpen(false)}
          onSelect={(command) => {
            setReverseSearchOpen(false)
            setInputValue(command)
          }}
        />
      ) : null}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(command) => {
          setPaletteOpen(false)
          setInputValue(command)
        }}
      />

      <HelpOverlay
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        globalShortcuts={GLOBAL_SHORTCUTS}
        contextualShortcuts={DISCOVERY_TIPS}
        contextLabel="Discovering commands"
      />

      {confirmQueue[0] ? (
        <ConfirmDialog request={confirmQueue[0]} onResolve={(id) => setConfirmQueue((q) => q.filter((c) => c.id !== id))} />
      ) : null}
    </Box>
  )
}

/** Test-only: read the exec context's debug flag alongside the REPL's own toggle, kept in sync via /debug. */
export function _debugContextForTest(): boolean {
  return getExecContext().isDebug
}
