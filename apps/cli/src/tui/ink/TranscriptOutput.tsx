import { sym } from '@lenserfight/cli-client'
import { Box, Text } from 'ink'

import type { TranscriptEntry } from './replTypes'

const KIND_COLOR: Record<TranscriptEntry['kind'], string> = {
  command: 'cyanBright',
  shell: 'yellowBright',
  meta: 'magentaBright',
  system: 'gray',
}

const KIND_GLYPH: Record<TranscriptEntry['kind'], string> = {
  command: '❯',
  shell: '!',
  meta: '/',
  system: sym.dot,
}

function statusLine(entry: TranscriptEntry): { text: string; color: string } | null {
  if (entry.status === 'running') return null
  const ms = entry.finishedAt && entry.startedAt ? entry.finishedAt - entry.startedAt : 0
  if (entry.status === 'cancelled') return { text: `${sym.warn} cancelled after ${ms}ms`, color: 'yellowBright' }
  if (entry.status === 'error') return { text: entry.errorSummary ?? `${sym.fail} failed`, color: 'redBright' }
  return { text: `${sym.pass} done in ${ms}ms`, color: 'greenBright' }
}

interface TranscriptOutputProps {
  entry: TranscriptEntry
}

/**
 * Renders one transcript entry: command echo, captured output lines, and a
 * status footer. Output lines are rendered as plain text on purpose — they
 * usually already carry embedded ANSI color from the command's own formatter
 * (consola / the A/sym helpers), and wrapping them in another Ink <Text
 * color> would fight that instead of composing with it.
 */
export function TranscriptOutput({ entry }: TranscriptOutputProps) {
  const status = statusLine(entry)
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={KIND_COLOR[entry.kind]} bold>
        {KIND_GLYPH[entry.kind]} {entry.displayCommand}
      </Text>
      {entry.lines.map((line, i) => (
        <Text key={i}>
          {line.stream === 'stderr' ? <Text color="redBright">{sym.dot} </Text> : null}
          {line.text}
        </Text>
      ))}
      {entry.status === 'error' && entry.errorSummary ? (
        <Box flexDirection="column" marginTop={entry.lines.length > 0 ? 1 : 0}>
          <Text color="redBright">{entry.errorSummary}</Text>
          {entry.errorDetail ? (
            <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
              {entry.errorDetail.split('\n').map((l, i) => (
                <Text key={i} color="gray">
                  {l}
                </Text>
              ))}
            </Box>
          ) : (
            <Text dimColor>run with --debug or /debug for full details</Text>
          )}
        </Box>
      ) : null}
      {status ? (
        <Text color={status.color} dimColor>
          {status.text}
        </Text>
      ) : null}
    </Box>
  )
}
