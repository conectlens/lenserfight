import { Box, Text } from 'ink'
import { sym } from '../../utils/ansi'
import { getSuggestions } from '../dashboard'

export interface CommandBarState {
  active: boolean
  input: string
  error: string | null
  selectedSuggestion: number
}

interface CommandBarProps {
  state: CommandBarState
  promptPrefix: string
}

/**
 * The `:` command bar with fuzzy autocomplete. Purely presentational — key
 * handling lives in the parent Dashboard's useInput. Mirrors the legacy
 * paintCommandBar layout (prompt line, hints, ranked suggestion list).
 */
export function CommandBar({ state, promptPrefix }: CommandBarProps) {
  if (!state.active) return null
  const suggestions = getSuggestions(state.input)

  return (
    <Box flexDirection="column" marginTop={1}>
      {state.error ? (
        <Text color="redBright">
          {sym.fail}  {state.error}
        </Text>
      ) : null}
      <Text>
        <Text color="gray">{promptPrefix}</Text>{' '}
        <Text color="yellowBright">{sym.arrow}</Text>{' '}
        <Text color="whiteBright">{state.input}</Text>
        <Text color="yellowBright">▎</Text>
        {'  '}
        <Text dimColor>Enter to run  Tab/↑↓ to pick  Esc to cancel</Text>
      </Text>
      {suggestions.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          {suggestions.map((s, i) => {
            const selected = i === state.selectedSuggestion
            return selected ? (
              <Text key={s.cmd} backgroundColor="blue" color="whiteBright">
                {'  '}
                {sym.arrow} {s.cmd.padEnd(32)}
                <Text dimColor>{s.desc}</Text>
              </Text>
            ) : (
              <Text key={s.cmd}>
                <Text color="gray">{sym.dot}</Text>
                {'  '}
                <Text color="cyanBright">{s.cmd.padEnd(32)}</Text>
                <Text dimColor>{s.desc}</Text>
              </Text>
            )
          })}
        </Box>
      ) : null}
    </Box>
  )
}
