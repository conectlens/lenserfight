import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'

interface HistorySearchProps {
  history: string[]
  onClose: () => void
  onSelect: (command: string) => void
}

/** Ctrl+R reverse-search: filters history live, most-recent match first. */
export function HistorySearch({ history, onClose, onSelect }: HistorySearchProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const matches = useMemo(() => {
    if (!query.trim()) return [...history].reverse().slice(0, 8)
    const q = query.toLowerCase()
    return [...history].reverse().filter((h) => h.toLowerCase().includes(q)).slice(0, 8)
  }, [history, query])

  useInput((char, key) => {
    if (key.escape) {
      onClose()
      return
    }
    if (key.return) {
      const pick = matches[selected]
      if (pick) onSelect(pick)
      else onClose()
      return
    }
    if (key.upArrow) {
      setSelected((s) => Math.min(matches.length - 1, s + 1))
      return
    }
    if (key.downArrow) {
      setSelected((s) => Math.max(0, s - 1))
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
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyanBright" paddingX={1} marginTop={1}>
      <Text>
        <Text color="cyanBright">reverse-search</Text> <Text color="gray">{sym.arrow}</Text> <Text>{query}</Text>
        <Text color="cyanBright">▎</Text>
      </Text>
      {matches.length === 0 ? (
        <Text color="gray">No matches.</Text>
      ) : (
        matches.map((h, i) => (
          <Text key={`${h}-${i}`} backgroundColor={i === selected ? 'blue' : undefined} color={i === selected ? 'whiteBright' : undefined}>
            {h}
          </Text>
        ))
      )}
      <Text dimColor>Enter to fill input · ↑/↓ to move · Esc to cancel</Text>
    </Box>
  )
}
