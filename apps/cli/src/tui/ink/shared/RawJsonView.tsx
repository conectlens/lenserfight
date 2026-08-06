import { redact } from '@lenserfight/cli-client'
import { Box, Text } from 'ink'

interface RawJsonViewProps {
  value: unknown
  open: boolean
}

/**
 * Collapsed by default — only rendered when a screen explicitly opens it
 * (the "view raw" action), never as the default row/detail rendering.
 * Every string leaf is piped through redact() since RPC payloads can carry
 * tokens/secrets (team_run metadata, memory entry content, schedule policy
 * blobs) that must never be echoed verbatim to the terminal.
 */
function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return redact(value)
  if (Array.isArray(value)) return value.map(redactDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v)
    return out
  }
  return value
}

export function RawJsonView({ value, open }: RawJsonViewProps) {
  if (!open) return null
  const json = JSON.stringify(redactDeep(value), null, 2)
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginTop={1}>
      <Text color="gray" dimColor>
        raw (redacted)
      </Text>
      {json.split('\n').map((line, i) => (
        <Text key={i} color="gray">
          {line}
        </Text>
      ))}
    </Box>
  )
}
