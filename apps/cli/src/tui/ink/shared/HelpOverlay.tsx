import { Box, Text, useInput } from 'ink'
import { useState } from 'react'

export interface ShortcutEntry {
  keys: string
  description: string
}

interface HelpOverlayProps {
  open: boolean
  onClose: () => void
  globalShortcuts: ShortcutEntry[]
  contextualShortcuts: ShortcutEntry[]
  contextLabel: string
}

function matches(entry: ShortcutEntry, query: string): boolean {
  const q = query.toLowerCase()
  return entry.keys.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)
}

/** Searchable shortcut reference — global bindings plus whatever the focused screen contributes. */
export function HelpOverlay({ open, onClose, globalShortcuts, contextualShortcuts, contextLabel }: HelpOverlayProps) {
  const [query, setQuery] = useState('')

  useInput(
    (input, key) => {
      if (key.escape) {
        setQuery('')
        onClose()
        return
      }
      if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1))
        return
      }
      if (input && !key.ctrl && !key.meta) {
        setQuery((q) => q + input)
      }
    },
    { isActive: open },
  )

  if (!open) return null

  const globalMatches = globalShortcuts.filter((e) => matches(e, query))
  const contextMatches = contextualShortcuts.filter((e) => matches(e, query))

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magentaBright" paddingX={2} paddingY={1} marginTop={1}>
      <Text color="magentaBright" bold>
        Keyboard shortcuts {query ? `— filter: "${query}"` : ''}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="whiteBright" bold>
          Global
        </Text>
        {globalMatches.length === 0 ? (
          <Text color="gray">No matches.</Text>
        ) : (
          globalMatches.map((e) => (
            <Text key={e.keys}>
              <Text color="yellowBright">{e.keys.padEnd(14)}</Text>
              <Text dimColor>{e.description}</Text>
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="whiteBright" bold>
          {contextLabel}
        </Text>
        {contextMatches.length === 0 ? (
          <Text color="gray">No matches.</Text>
        ) : (
          contextMatches.map((e) => (
            <Text key={e.keys}>
              <Text color="yellowBright">{e.keys.padEnd(14)}</Text>
              <Text dimColor>{e.description}</Text>
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Type to filter · Esc to close</Text>
      </Box>
    </Box>
  )
}
