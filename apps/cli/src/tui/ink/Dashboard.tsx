import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { sym } from '@lenserfight/cli-client'
import { getSuggestions, cycleSuggestion, tokenise } from '../dashboard'
import { HealthPanel } from './panels/HealthPanel'
import { ActionLogPanel } from './panels/ActionLogPanel'
import { CommandBar, type CommandBarState } from './CommandBar'
import { useDashboardData, type DashboardData } from './useDashboardData'

/** What the ink dashboard hands back to the dispatch loop in ../dashboard.ts when it exits. */
export type DashboardAction =
  | { type: 'quit'; code?: number }
  | { type: 'command'; argv: string[] }

interface DashboardProps {
  onAction: (action: DashboardAction) => void
  /** Enable raw-mode key handling. False for the non-TTY static frame. */
  interactive?: boolean
  /** Refresh interval; null disables polling. Defaults to 2000ms when interactive. */
  pollMs?: number | null
  /** Pre-fetched data for the static frame and tests (skips the network). */
  initialData?: DashboardData
}

const EMPTY_CMD: CommandBarState = {
  active: false,
  input: '',
  error: null,
  selectedSuggestion: -1,
}

// Domain quick-keys are visual placeholders in this build — per-domain
// drill-down (the old SUB_DASHBOARDS tree) is Phase B. Pressing one surfaces
// a notice instead of silently doing nothing or crashing. Use ':' to run any
// command directly in the meantime.
const DOMAIN_KEYS = new Set(['g', 'w', 'e', 'k', 'a', 'b', 's', 'm', 'l', 'f'])

const BINDINGS: Array<[string, string]> = [
  ['g', 'agents'],
  ['w', 'workflows'],
  ['e', 'execute'],
  ['k', 'configure'],
  ['a', 'approvals'],
  ['b', 'battles'],
  ['s', 'schedules'],
  ['m', 'memory'],
  ['l', 'lensers'],
  ['f', 'feed'],
  [':', 'command'],
  ['q', 'quit'],
]

const NOT_IMPLEMENTED_NOTICE =
  "Domain views aren't implemented in this build yet. Press ':' to run any command directly."

export function Dashboard({ onAction, interactive = true, pollMs, initialData }: DashboardProps) {
  const poll = pollMs === undefined ? (interactive ? 2000 : null) : pollMs
  const data = useDashboardData(poll, initialData)
  const [cmd, setCmd] = useState<CommandBarState>(EMPTY_CMD)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = () => {
    const suggestions = getSuggestions(cmd.input)
    let raw = cmd.input.trim()
    if (cmd.selectedSuggestion >= 0 && suggestions[cmd.selectedSuggestion]) {
      raw = suggestions[cmd.selectedSuggestion].cmd
    }
    if (!raw) {
      setCmd(EMPTY_CMD)
      return
    }
    const argv = tokenise(raw)
    onAction({ type: 'command', argv })
  }

  // Key handling via ink's useInput. Esc cancels the command bar (or quits),
  // Tab/↑↓ cycle suggestions, ':' opens the command bar, domain keys show the
  // "not yet implemented" notice. `isActive: false` (non-TTY static frame)
  // makes ink skip raw mode entirely.
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        onAction({ type: 'quit', code: 130 })
        return
      }

      // ── Command input mode ─────────────────────────────────────────────────
      if (cmd.active) {
        if (key.escape) {
          setCmd(EMPTY_CMD)
          return
        }
        if (key.upArrow || key.downArrow || (key.shift && key.tab)) {
          const count = getSuggestions(cmd.input).length
          const dir: 1 | -1 = key.downArrow ? 1 : -1
          setCmd((s) => ({ ...s, selectedSuggestion: cycleSuggestion(s.selectedSuggestion, count, dir) }))
          return
        }
        if (key.tab) {
          const count = getSuggestions(cmd.input).length
          if (count > 0) {
            setCmd((s) => ({ ...s, selectedSuggestion: cycleSuggestion(s.selectedSuggestion, count, 1) }))
          }
          return
        }
        if (key.return) {
          submit()
          return
        }
        if (key.backspace || key.delete) {
          setCmd((s) => ({ ...s, input: s.input.slice(0, -1), error: null, selectedSuggestion: -1 }))
          return
        }
        if (input && !key.ctrl && !key.meta) {
          setCmd((s) => ({ ...s, input: s.input + input, error: null, selectedSuggestion: -1 }))
        }
        return
      }

      // ── Normal dashboard mode ──────────────────────────────────────────────
      if (key.escape) {
        onAction({ type: 'quit' })
        return
      }
      if (input === ':') {
        setNotice(null)
        setCmd({ active: true, input: '', error: null, selectedSuggestion: -1 })
        return
      }
      if (input === 'q' || input === 'Q') {
        onAction({ type: 'quit' })
        return
      }
      if (input && DOMAIN_KEYS.has(input.toLowerCase())) {
        setNotice(NOT_IMPLEMENTED_NOTICE)
      }
    },
    { isActive: interactive },
  )

  return (
    <Box flexDirection="column" paddingX={2}>
      <HealthPanel profile={data.profile} healthy={data.healthy} banner={data.banner} />
      <ActionLogPanel logs={data.logs} />
      {data.recentCommands.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="whiteBright" bold>
            Recent commands
          </Text>
          {data.recentCommands.slice(0, 5).map((r, i) => (
            <Text key={`${r.timestamp}-${i}`}>
              <Text color={r.code === 0 ? 'greenBright' : 'redBright'}>{r.code === 0 ? sym.pass : sym.fail}</Text>
              {'  '}
              <Text color="cyanBright">lf {r.argv.join(' ')}</Text>
            </Text>
          ))}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text>
          {BINDINGS.map(([k, label], i) => (
            <Text key={k}>
              {i > 0 ? (
                <Text color="gray">
                  {'  '}
                  {sym.dot}
                  {'  '}
                </Text>
              ) : null}
              <Text color="gray">[</Text>
              <Text color="yellowBright">{k}</Text>
              <Text color="gray">]</Text>
              <Text dimColor> {label}</Text>
            </Text>
          ))}
        </Text>
      </Box>
      {notice ? (
        <Box marginTop={1}>
          <Text color="yellowBright">{sym.warn}  {notice}</Text>
        </Box>
      ) : null}
      <CommandBar state={cmd} promptPrefix="lf" />
    </Box>
  )
}
