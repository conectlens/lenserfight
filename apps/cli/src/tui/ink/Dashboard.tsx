import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { sym } from '../../utils/ansi'
import { getSuggestions, cycleSuggestion, validateSubcommand, tokenise } from '../dashboard'
import { HealthPanel } from './panels/HealthPanel'
import { ActionLogPanel } from './panels/ActionLogPanel'
import { CommandBar, type CommandBarState } from './CommandBar'
import { useDashboardData, type DashboardData } from './useDashboardData'

/** What the ink dashboard hands back to the legacy dispatch loop when it exits. */
export type DashboardAction =
  | { type: 'quit'; code?: number }
  | { type: 'sub'; key: string }
  | { type: 'command'; argv: string[] }

interface DashboardProps {
  /** Single-key sub-dashboard triggers (g/w/e/…) handled by the legacy loop. */
  subKeys: string[]
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

export function Dashboard({
  subKeys,
  onAction,
  interactive = true,
  pollMs,
  initialData,
}: DashboardProps) {
  const poll = pollMs === undefined ? (interactive ? 2000 : null) : pollMs
  const data = useDashboardData(poll, initialData)
  const [cmd, setCmd] = useState<CommandBarState>(EMPTY_CMD)

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
    const error = validateSubcommand(argv)
    if (error) {
      setCmd((s) => ({ ...s, error }))
      return
    }
    onAction({ type: 'command', argv })
  }

  // Key handling via ink's useInput. Mirrors the legacy dashboard's behavior:
  // Esc cancels the command bar (or quits), Tab/↑↓ cycle suggestions, single
  // keys open sub-dashboards. `isActive: false` (non-TTY static frame) makes
  // ink skip raw mode entirely.
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
        setCmd({ active: true, input: '', error: null, selectedSuggestion: -1 })
        return
      }
      if (input === 'q' || input === 'Q') {
        onAction({ type: 'quit' })
        return
      }
      if (input && subKeys.includes(input.toLowerCase())) {
        onAction({ type: 'sub', key: input.toLowerCase() })
      }
    },
    { isActive: interactive },
  )

  return (
    <Box flexDirection="column" paddingX={2}>
      <HealthPanel profile={data.profile} healthy={data.healthy} banner={data.banner} />
      <ActionLogPanel logs={data.logs} />
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
      <CommandBar state={cmd} promptPrefix="lf" />
    </Box>
  )
}
