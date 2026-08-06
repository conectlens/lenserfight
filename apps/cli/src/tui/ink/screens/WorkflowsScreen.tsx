import { Box, Text, useInput } from 'ink'
import { useMemo } from 'react'

import { listRecentWorkflowRuns, listWorkflowRuns, type WorkflowRunListRow } from '../../../lib/data-services/executions'
import { useAsyncData } from '../hooks/useAsyncData'
import { DataTable, type DataTableRow, type SortState } from '../shared/DataTable'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { useAppState } from '../state/AppStateContext'

const COLUMNS = [
  { key: 'workflow_id', label: 'WORKFLOW', width: 16 },
  { key: 'runs', label: 'RECENT RUNS', width: 14 },
  { key: 'last_status', label: 'LAST STATUS', width: 14, status: true },
  { key: 'last_run_at', label: 'LAST RUN', width: 20 },
]

interface WorkflowSummary {
  workflowId: string
  runCount: number
  lastStatus: string
  lastRunAt: string | null
}

function summarize(runs: WorkflowRunListRow[]): WorkflowSummary[] {
  const byWorkflow = new Map<string, WorkflowRunListRow[]>()
  for (const run of runs) {
    const list = byWorkflow.get(run.workflow_id) ?? []
    list.push(run)
    byWorkflow.set(run.workflow_id, list)
  }
  return Array.from(byWorkflow.entries()).map(([workflowId, list]) => {
    const sorted = [...list].sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    return { workflowId, runCount: list.length, lastStatus: sorted[0]?.status ?? '—', lastRunAt: sorted[0]?.started_at ?? null }
  })
}

interface WorkflowsScreenProps {
  focused: boolean
  width: number
  showDetail: boolean
}

export function WorkflowsScreen({ focused, width, showDetail }: WorkflowsScreenProps) {
  const { getScreenState, setScreenState } = useAppState()
  const saved = getScreenState('workflows')
  const selectedIndex = (saved.selectedIndex as number) ?? 0

  const { data, loading, error, reload } = useAsyncData(() => listRecentWorkflowRuns({ limit: 100 }), ['workflows'])
  const summaries = useMemo(() => summarize(data ?? []), [data])
  const rows: DataTableRow[] = summaries.map((s) => ({
    id: s.workflowId,
    cells: {
      workflow_id: s.workflowId.slice(0, 8),
      runs: String(s.runCount),
      last_status: s.lastStatus,
      last_run_at: s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : '—',
    },
  }))
  const sort: SortState = { key: null, dir: 'asc' }
  const clampedSelected = Math.min(selectedIndex, Math.max(0, rows.length - 1))
  const selected = summaries[clampedSelected]

  const { data: detailRuns, loading: detailLoading } = useAsyncData(
    () => (selected ? listWorkflowRuns(selected.workflowId, 15) : Promise.resolve([])),
    [selected?.workflowId],
  )

  useInput(
    (input, key) => {
      if (error) {
        if (input === 'r') reload()
        return
      }
      if (key.upArrow) setScreenState('workflows', { selectedIndex: Math.max(0, clampedSelected - 1) })
      else if (key.downArrow) setScreenState('workflows', { selectedIndex: Math.min(rows.length - 1, clampedSelected + 1) })
    },
    { isActive: focused },
  )

  const listWidth = showDetail ? Math.floor(width * 0.55) : width

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width={listWidth} paddingRight={showDetail ? 2 : 0}>
        <Text color="whiteBright" bold>
          Workflows with recent activity
        </Text>
        <Box marginTop={1}>
          {loading ? (
            <LoadingIndicator label="Loading workflows…" />
          ) : error ? (
            <ErrorState message={error} />
          ) : rows.length === 0 ? (
            <EmptyState message="No workflow runs yet." hint="Create one with 'lf workflow create'." />
          ) : (
            <DataTable columns={COLUMNS} rows={rows} selectedIndex={clampedSelected} sort={sort} />
          )}
        </Box>
      </Box>
      {showDetail ? (
        <Box flexDirection="column" width={Math.max(24, width - listWidth - 2)} borderStyle="round" borderColor="gray" paddingX={1}>
          {!selected ? (
            <EmptyState message="Select a workflow to see its runs." />
          ) : detailLoading ? (
            <LoadingIndicator label="Loading runs…" />
          ) : (
            <>
              <Text color="whiteBright" bold>
                {selected.workflowId.slice(0, 8)} — steps
              </Text>
              {(detailRuns ?? []).map((run) => (
                <Text key={run.id}>
                  <Text color="gray">{run.started_at ? new Date(run.started_at).toLocaleTimeString() : '—'}</Text>{' '}
                  <Text color="cyanBright">{run.status}</Text>
                </Text>
              ))}
            </>
          )}
        </Box>
      ) : null}
    </Box>
  )
}
