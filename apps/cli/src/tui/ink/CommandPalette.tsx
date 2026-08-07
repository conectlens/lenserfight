import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'

import { getAllCommandSuggestions } from '../dashboard'

import { rankPaletteEntries, type PaletteEntry } from './paletteMatch'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSelect: (command: string) => void
}

/**
 * Ctrl+K searchable command palette — fuzzy search across the full command
 * inventory (the same canonical registry the input bar's inline suggestions
 * and the resolver use). Selecting an entry fills the input rather than
 * dispatching directly, so the user can still edit args before running it.
 */
export function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const entries = useMemo<PaletteEntry[]>(
    () =>
      getAllCommandSuggestions().map((s) => ({
        id: `cmd:${s.cmd}`,
        kind: 'command',
        label: s.cmd,
        description: s.desc,
      })),
    [],
  )
  const matches = open ? rankPaletteEntries(entries, query, 8) : []

  useInput(
    (char, key) => {
      if (key.escape) {
        setQuery('')
        setSelected(0)
        onClose()
        return
      }
      if (key.return) {
        const entry = matches[selected]
        setQuery('')
        setSelected(0)
        onClose()
        if (entry) onSelect(entry.label)
        return
      }
      if (key.upArrow) {
        setSelected((s) => (matches.length ? (s <= 0 ? matches.length - 1 : s - 1) : 0))
        return
      }
      if (key.downArrow || key.tab) {
        setSelected((s) => (matches.length ? (s + 1) % matches.length : 0))
        return
      }
      if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1))
        setSelected(0)
        return
      }
      if (char && !key.ctrl && !key.meta) {
        setQuery((q) => q + char)
        setSelected(0)
      }
    },
    { isActive: open },
  )

  if (!open) return null

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellowBright" paddingX={1} marginTop={1}>
      <Text>
        <Text color="gray">search commands</Text> <Text color="yellowBright">{sym.arrow}</Text> <Text>{query}</Text>
        <Text color="yellowBright">▎</Text>
      </Text>
      {matches.length === 0 ? (
        <Text color="gray">No matches.</Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {matches.map((entry, i) => (
            <Text
              key={entry.id}
              backgroundColor={i === selected ? 'blue' : undefined}
              color={i === selected ? 'whiteBright' : undefined}
            >
              {'  '}
              <Text color={i === selected ? undefined : 'cyanBright'}>{entry.label.padEnd(32)}</Text>
              <Text dimColor={i !== selected}>{entry.description}</Text>
            </Text>
          ))}
        </Box>
      )}
      <Text dimColor>Enter to fill input · Tab/↑↓ to move · Esc to close</Text>
    </Box>
  )
}
