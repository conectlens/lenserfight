import { callRpc } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'

import { useAsyncData } from '../hooks/useAsyncData'
import { DataTable, type DataTableRow, type SortState } from '../shared/DataTable'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { useAppState } from '../state/AppStateContext'

interface BattleRow {
  id: string
  title: string
  status: string
  task_prompt: string
}

const COLUMNS = [
  { key: 'title', label: 'TITLE', width: 30 },
  { key: 'status', label: 'STATUS', width: 12, status: true },
  { key: 'task', label: 'TASK', width: 34 },
]

async function fetchPublicBattles(): Promise<BattleRow[]> {
  const rows = await callRpc<BattleRow[]>('fn_battles_list_public', { p_limit: 30, p_offset: 0 })
  return Array.isArray(rows) ? rows : []
}

interface BattleScreenProps {
  focused: boolean
  width: number
  showDetail: boolean
}

export function BattleScreen({ focused, width, showDetail }: BattleScreenProps) {
  const { getScreenState, setScreenState } = useAppState()
  const saved = getScreenState('battles')
  const selectedIndex = (saved.selectedIndex as number) ?? 0

  const { data, loading, error, reload } = useAsyncData(fetchPublicBattles, ['battles'])
  const battles = data ?? []
  const rows: DataTableRow[] = battles.map((b) => ({
    id: b.id,
    cells: { title: b.title, status: b.status, task: b.task_prompt },
  }))
  const sort: SortState = { key: null, dir: 'asc' }
  const clampedSelected = Math.min(selectedIndex, Math.max(0, rows.length - 1))
  const selected = battles[clampedSelected]

  useInput(
    (input, key) => {
      if (error) {
        if (input === 'r') reload()
        return
      }
      if (key.upArrow) setScreenState('battles', { selectedIndex: Math.max(0, clampedSelected - 1) })
      else if (key.downArrow) setScreenState('battles', { selectedIndex: Math.min(rows.length - 1, clampedSelected + 1) })
    },
    { isActive: focused },
  )

  const listWidth = showDetail ? Math.floor(width * 0.6) : width

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width={listWidth} paddingRight={showDetail ? 2 : 0}>
        <Text color="whiteBright" bold>
          Public battle activity
        </Text>
        <Box marginTop={1}>
          {loading ? (
            <LoadingIndicator label="Loading battles…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : rows.length === 0 ? (
            <EmptyState message="No public battles found." hint="Create one with 'lf battle create'." />
          ) : (
            <DataTable columns={COLUMNS} rows={rows} selectedIndex={clampedSelected} sort={sort} />
          )}
        </Box>
      </Box>
      {showDetail ? (
        <Box flexDirection="column" width={Math.max(24, width - listWidth - 2)} borderStyle="round" borderColor="gray" paddingX={1}>
          {!selected ? (
            <EmptyState message="Select a battle to see details." />
          ) : (
            <>
              <Text color="whiteBright" bold>
                {selected.title}
              </Text>
              <Text color="gray">
                Status: <Text color="cyanBright">{selected.status}</Text>
              </Text>
              <Box marginTop={1}>
                <Text>{selected.task_prompt}</Text>
              </Box>
            </>
          )}
        </Box>
      ) : null}
    </Box>
  )
}
