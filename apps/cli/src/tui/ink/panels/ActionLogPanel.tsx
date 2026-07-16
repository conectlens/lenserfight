import { Box, Text } from 'ink'
import { sym } from '../../../utils/ansi'
import { truncate } from '../../../utils/output'
import type { ActionLogRow } from '../../dashboard'

interface ActionLogPanelProps {
  logs: ActionLogRow[]
}

/** "Recent agent logs" panel. Mirrors the legacy timestamp / action / payload columns. */
export function ActionLogPanel({ logs }: ActionLogPanelProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text color="whiteBright" bold>
          Recent agent logs
        </Text>
        <Text color="gray">
          {'  '}
          {sym.dot}
          {sym.dot}
          {sym.dot}
        </Text>
      </Text>
      <Box height={1} />
      {logs.length === 0 ? (
        <Text color="gray">
          {sym.dot}  No action logs yet  {sym.arrow}  waiting for events…
        </Text>
      ) : (
        logs.map((row, i) => <ActionLogLine key={row.id ?? i} row={row} />)
      )}
    </Box>
  )
}

function ActionLogLine({ row }: { row: ActionLogRow }) {
  const ts = row.created_at ? new Date(row.created_at).toLocaleString() : '—'
  const action = (row.action_type ?? '—').padEnd(20)
  const payload = row.payload ? JSON.stringify(row.payload) : ''
  return (
    <Text>
      <Text color="gray">{ts}</Text>
      {'  '}
      <Text color="cyanBright">{action}</Text>
      {'  '}
      <Text dimColor>{truncate(payload, 72)}</Text>
    </Text>
  )
}
