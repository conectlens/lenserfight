import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'

import { getSuggestions, cycleSuggestion, tokenise, getAllCommandSuggestions } from '../dashboard'

import { rankPaletteEntries, type PaletteEntry } from './paletteMatch'
import { SIDEBAR_ITEMS } from './shared/Sidebar'

import type { ViewFrame } from './state/types'

export type CommandPaletteMode = 'raw' | 'fuzzy' | null

interface CommandPaletteProps {
  mode: CommandPaletteMode
  onClose: () => void
  onDispatch: (argv: string[]) => void
  onNavigate: (view: ViewFrame) => void
}

function buildFuzzyEntries(): PaletteEntry[] {
  const navEntries: PaletteEntry[] = SIDEBAR_ITEMS.map((item) => ({
    id: `nav:${item.id}`,
    kind: 'nav',
    label: item.label,
    description: `Go to ${item.label}`,
  }))
  const cmdEntries: PaletteEntry[] = getAllCommandSuggestions().map((s) => ({
    id: `cmd:${s.cmd}`,
    kind: 'command',
    label: s.cmd,
    description: s.desc,
  }))
  return [...navEntries, ...cmdEntries]
}

/**
 * Two entry points into the same overlay: `:` keeps the original raw citty
 * dispatch (backward compatible with every existing command), Ctrl+K adds a
 * fuzzy picker across navigation destinations and the full command
 * inventory. Both dispatch through the same callbacks so AppShell doesn't
 * need to know which mode produced the action.
 */
export function CommandPalette({ mode, onClose, onDispatch, onNavigate }: CommandPaletteProps) {
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState(-1)

  const rawSuggestions = mode === 'raw' ? getSuggestions(input) : []
  const fuzzyEntries = useMemo(() => (mode === 'fuzzy' ? buildFuzzyEntries() : []), [mode])
  const fuzzyMatches = mode === 'fuzzy' ? rankPaletteEntries(fuzzyEntries, input, 8) : []

  const count = mode === 'raw' ? rawSuggestions.length : fuzzyMatches.length

  const reset = () => {
    setInput('')
    setSelected(-1)
  }

  const submit = () => {
    if (mode === 'raw') {
      let raw = input.trim()
      if (selected >= 0 && rawSuggestions[selected]) raw = rawSuggestions[selected].cmd
      reset()
      onClose()
      if (raw) onDispatch(tokenise(raw))
      return
    }
    if (mode === 'fuzzy') {
      const entry = fuzzyMatches[selected >= 0 ? selected : 0]
      reset()
      onClose()
      if (!entry) return
      if (entry.kind === 'nav') {
        const id = entry.id.slice('nav:'.length) as ViewFrame['id']
        onNavigate({ id, title: entry.label })
      } else {
        onDispatch(tokenise(entry.label))
      }
    }
  }

  useInput(
    (char, key) => {
      if (key.escape) {
        reset()
        onClose()
        return
      }
      if (key.upArrow || key.downArrow || (key.shift && key.tab)) {
        const dir: 1 | -1 = key.downArrow ? 1 : -1
        setSelected((s) => cycleSuggestion(s, count, dir))
        return
      }
      if (key.tab) {
        if (count > 0) setSelected((s) => cycleSuggestion(s, count, 1))
        return
      }
      if (key.return) {
        submit()
        return
      }
      if (key.backspace || key.delete) {
        setInput((s) => s.slice(0, -1))
        setSelected(-1)
        return
      }
      if (char && !key.ctrl && !key.meta) {
        setInput((s) => s + char)
        setSelected(-1)
      }
    },
    { isActive: mode !== null },
  )

  if (mode === null) return null

  const promptLabel = mode === 'raw' ? 'lf' : 'go to / run'

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellowBright" paddingX={1} marginTop={1}>
      <Text>
        <Text color="gray">{promptLabel}</Text> <Text color="yellowBright">{sym.arrow}</Text>{' '}
        <Text color="whiteBright">{input}</Text>
        <Text color="yellowBright">▎</Text>
        {'  '}
        <Text dimColor>Enter to run  Tab/↑↓ to pick  Esc to cancel</Text>
      </Text>
      {mode === 'raw'
        ? rawSuggestions.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {rawSuggestions.map((s, i) => (
                <SuggestionLine key={s.cmd} label={s.cmd} desc={s.desc} selected={i === selected} />
              ))}
            </Box>
          )
        : fuzzyMatches.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {fuzzyMatches.map((entry, i) => (
                <SuggestionLine
                  key={entry.id}
                  label={entry.kind === 'nav' ? `${sym.arrow} ${entry.label}` : entry.label}
                  desc={entry.description}
                  selected={i === selected}
                />
              ))}
            </Box>
          )}
    </Box>
  )
}

function SuggestionLine({ label, desc, selected }: { label: string; desc: string; selected: boolean }) {
  return selected ? (
    <Text backgroundColor="blue" color="whiteBright">
      {'  '}
      {sym.arrow} {label.padEnd(32)}
      <Text dimColor>{desc}</Text>
    </Text>
  ) : (
    <Text>
      <Text color="gray">{sym.dot}</Text>
      {'  '}
      <Text color="cyanBright">{label.padEnd(32)}</Text>
      <Text dimColor>{desc}</Text>
    </Text>
  )
}
