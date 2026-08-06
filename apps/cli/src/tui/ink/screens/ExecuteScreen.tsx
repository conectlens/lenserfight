import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'

import { listRecentWorkflowRuns, type WorkflowRunListRow } from '../../../lib/data-services/executions'
import { fetchWorkflowRunEvents, type WorkflowRunEventRow } from '../../../lib/workflow-event-stream'
import { useAsyncData } from '../hooks/useAsyncData'
import { DataTable, filterRows, sortRows, type DataTableRow, type SortState } from '../shared/DataTable'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { StatusBadge } from '../shared/StatusBadge'
import { useAppState } from '../state/AppStateContext'

const COLUMNS = [
  { key: 'id', label: 'RUN', width: 12 },
  { key: 'workflow_id', label: 'WORKFLOW', width: 14 },
  { key: 'status', label: 'STATUS', width: 12, status: true },
  { key: 'started_at', label: 'STARTED', width: 20 },
]

function toRow(run: WorkflowRunListRow): DataTableRow {
  return {
    id: run.id,
    cells: {
      id: run.id.slice(0, 8),
      workflow_id: run.workflow_id.slice(0, 8),
      status: run.status,
      started_at: run.started_at ? new Date(run.started_at).toLocaleTimeString() : '—',
    },
  }
}

const EVENT_POLL_MS = 1500

interface ExecuteScreenProps {
  focused: boolean
  width: number
  showDetail: boolean
}

export function ExecuteScreen({ focused, width, showDetail }: ExecuteScreenProps) {
  const { getScreenState, setScreenState } = useAppState()
  const saved = getScreenState('execute')
  const selectedIndex = (saved.selectedIndex as number) ?? 0
  const watching = (saved.detailOpen as boolean) ?? false
  const sort: SortState = { key: null, dir: 'asc' }

  const { data, loading, error, reload } = useAsyncData(() => listRecentWorkflowRuns({ limit: 30 }), ['execute-runs'])
  const runs = data ?? []
  const rows = sortRows(filterRows(runs.map(toRow), ''), sort)
  const clampedSelected = Math.min(selectedIndex, Math.max(0, rows.length - 1))
  const selectedRun = runs[clampedSelected]

  const [events, setEvents] = useState<WorkflowRunEventRow[]>([])
  const lastEventId = useRef(0)

  useEffect(() => {
    setEvents([])
    lastEventId.current = 0
    if (!watching || !selectedRun) return
    let cancelled = false
    const tick = async () => {
      try {
        const batch = await fetchWorkflowRunEvents(selectedRun.id, lastEventId.current, 50)
        if (cancelled || batch.length === 0) return
        lastEventId.current = Math.max(lastEventId.current, ...batch.map((e) => e.event_id))
        setEvents((prev) => [...prev, ...batch].slice(-100))
      } catch {
        /* transient — next tick retries */
      }
    }
    void tick()
    const timer = setInterval(tick, EVENT_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // Deliberately keyed on selectedRun?.id, not selectedRun itself: `runs` (and so
    // `selectedRun`) is a fresh array/object every render, which would restart the
    // poll loop (and drop lastEventId) on every re-render instead of only when the
    // watched run actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, selectedRun?.id])

  useInput(
    (input, key) => {
      if (error) {
        if (input === 'r') reload()
        return
      }
      if (key.upArrow) {
        setScreenState('execute', { selectedIndex: Math.max(0, clampedSelected - 1) })
        return
      }
      if (key.downArrow) {
        setScreenState('execute', { selectedIndex: Math.min(rows.length - 1, clampedSelected + 1) })
        return
      }
      if (key.return) {
        setScreenState('execute', { detailOpen: !watching })
        return
      }
      if (key.escape && watching) {
        setScreenState('execute', { detailOpen: false })
      }
    },
    { isActive: focused },
  )

  const listWidth = showDetail ? Math.floor(width * 0.55) : width

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width={listWidth} paddingRight={showDetail ? 2 : 0}>
        <Text color="whiteBright" bold>
          Recent executions
        </Text>
        <Box marginTop={1}>
          {loading ? (
            <LoadingIndicator label="Loading executions…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : rows.length === 0 ? (
            <EmptyState message="No workflow runs yet." hint="Trigger one with 'lf execute workflow run <id>'." />
          ) : (
            <DataTable columns={COLUMNS} rows={rows} selectedIndex={clampedSelected} sort={sort} />
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter: watch live events {'·'} r: refresh</Text>
        </Box>
      </Box>
      {showDetail ? (
        <Box flexDirection="column" width={Math.max(24, width - listWidth - 2)} borderStyle="round" borderColor={focused && watching ? 'cyanBright' : 'gray'} paddingX={1}>
          {!selectedRun ? (
            <EmptyState message="Select a run to watch its events." />
          ) : (
            <>
              <Text color="whiteBright" bold>
                Run {selectedRun.id.slice(0, 8)} <StatusBadge label={selectedRun.status} />
              </Text>
              <Text dimColor>{watching ? 'streaming…' : 'press Enter to stream events'}</Text>
              <Box marginTop={1} flexDirection="column">
                {events.length === 0 ? (
                  <Text color="gray">
                    {sym.dot} No events yet.
                  </Text>
                ) : (
                  events.slice(-15).map((e) => (
                    <Text key={e.event_id}>
                      <Text color="gray">{new Date(e.occurred_at).toLocaleTimeString()}</Text> <Text color="cyanBright">{e.type}</Text>
                    </Text>
                  ))
                )}
              </Box>
            </>
          )}
        </Box>
      ) : null}
    </Box>
  )
}
