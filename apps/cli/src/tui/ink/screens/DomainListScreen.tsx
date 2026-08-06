import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'

import { useAsyncData } from '../hooks/useAsyncData'
import { DataTable, filterRows, sortRows, paginateRows, type DataTableRow, type SortState } from '../shared/DataTable'
import { DetailPanel, DetailEmpty } from '../shared/DetailPanel'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { useAppState } from '../state/AppStateContext'

import type { DomainListConfig, DomainRow } from './domainScreenConfigs'

const PAGE_SIZE = 10
const EMPTY_ROWS: DomainRow[] = []

interface DomainListScreenProps {
  config: DomainListConfig
  focused: boolean
  width: number
  showDetail: boolean
  onDispatch: (argv: string[]) => void
  /** Tells AppShell a text-entry field has focus, so global single-letter/digit shortcuts stop firing mid-typing. */
  onInputModeChange?: (active: boolean) => void
}

export function DomainListScreen({
  config,
  focused,
  width,
  showDetail,
  onDispatch,
  onInputModeChange,
}: DomainListScreenProps) {
  const { getScreenState, setScreenState, requestConfirm } = useAppState()
  const saved = getScreenState(config.id)

  const { data, loading, error, reload } = useAsyncData(config.fetch, [config.id])
  const rows = data ?? EMPTY_ROWS

  const [filterEditing, setFilterEditing] = useState(false)
  // Local + functional-update draft while editing: screenState (context/reducer state)
  // updates lag a render behind rapid synchronous keystrokes, so accumulating the typed
  // string via `filter + input` off the (possibly stale) committed value would drop
  // characters. The draft is only committed to screenState.filter on Enter/Esc.
  const [filterDraft, setFilterDraft] = useState('')
  const filter = filterEditing ? filterDraft : ((saved.filter as string) ?? '')
  const sort: SortState = { key: (saved.sortKey as string) ?? null, dir: (saved.sortDir as 'asc' | 'desc') ?? 'asc' }
  const selectedIndex = (saved.selectedIndex as number) ?? 0
  const detailOpen = (saved.detailOpen as boolean) ?? false
  const rawOpen = (saved.rawOpen as boolean) ?? false
  const page = (saved.page as number) ?? 0

  const tableRows: DataTableRow[] = useMemo(
    () => rows.map((row, i) => ({ id: config.rowId(row, i), cells: config.toCells(row) })),
    [rows, config],
  )
  const byId = useMemo(() => new Map(rows.map((row, i) => [config.rowId(row, i), row])), [rows, config])

  const filtered = filterRows(tableRows, filter)
  const sorted = sortRows(filtered, sort)
  const { pageRows, totalPages, page: clampedPage } = paginateRows(sorted, page, PAGE_SIZE)
  const clampedSelected = Math.min(selectedIndex, Math.max(0, pageRows.length - 1))
  const selectedTableRow = pageRows[clampedSelected]
  const selectedRow: DomainRow | undefined = selectedTableRow ? byId.get(selectedTableRow.id) : undefined

  const patch = (p: Record<string, unknown>) => setScreenState(config.id, p)

  const setEditing = (next: boolean) => {
    setFilterEditing(next)
    onInputModeChange?.(next)
  }

  useInput(
    (input, key) => {
      if (filterEditing) {
        if (key.return || key.escape) {
          setEditing(false)
          patch({ filter: key.escape ? '' : filterDraft })
          return
        }
        if (key.backspace || key.delete) {
          setFilterDraft((s) => s.slice(0, -1))
          return
        }
        if (input && !key.ctrl && !key.meta) setFilterDraft((s) => s + input)
        return
      }

      if (error) {
        if (input === 'r') reload()
        return
      }

      if (input === '/') {
        setFilterDraft((saved.filter as string) ?? '')
        setEditing(true)
        return
      }
      if (key.escape) {
        if (detailOpen) patch({ detailOpen: false, rawOpen: false })
        else if (filter) patch({ filter: '' })
        return
      }
      if (key.upArrow) {
        patch({ selectedIndex: Math.max(0, clampedSelected - 1) })
        return
      }
      if (key.downArrow) {
        patch({ selectedIndex: Math.min(pageRows.length - 1, clampedSelected + 1) })
        return
      }
      if (key.pageDown || input === ']') {
        patch({ page: Math.min(totalPages - 1, clampedPage + 1), selectedIndex: 0 })
        return
      }
      if (key.pageUp || input === '[') {
        patch({ page: Math.max(0, clampedPage - 1), selectedIndex: 0 })
        return
      }
      if (input === 's') {
        const keys = config.columns.map((c) => c.key)
        const idx = sort.key ? keys.indexOf(sort.key) : -1
        const next = keys[(idx + 1) % keys.length]
        patch({ sortKey: next, sortDir: 'asc' })
        return
      }
      if (input === 'S') {
        patch({ sortDir: sort.dir === 'asc' ? 'desc' : 'asc' })
        return
      }
      if (key.return) {
        if (selectedRow) patch({ detailOpen: !detailOpen })
        return
      }
      if (input === 'v' && detailOpen) {
        patch({ rawOpen: !rawOpen })
        return
      }
      if (selectedRow) {
        const action = config.actions.find((a) => a.key === input && (!a.visible || a.visible(selectedRow)))
        if (action) {
          const argv = action.buildArgv(selectedRow)
          if (action.confirm) {
            requestConfirm({
              title: action.confirm.title,
              description: action.confirm.description(selectedRow),
              risk: action.confirm.risk,
              confirmLabel: action.confirm.confirmLabel ?? 'Confirm',
              cancelLabel: 'Cancel',
              onConfirm: () => onDispatch(argv),
            })
          } else {
            onDispatch(argv)
          }
        }
      }
    },
    { isActive: focused },
  )

  const listWidth = showDetail ? Math.floor(width * 0.6) : width

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width={listWidth} paddingRight={showDetail ? 2 : 0}>
        <Text>
          <Text color="gray">Filter: </Text>
          <Text color={filterEditing ? 'yellowBright' : 'whiteBright'}>{filter || (filterEditing ? '' : '(none)')}</Text>
          {filterEditing ? <Text color="yellowBright">▎</Text> : null}
        </Text>
        <Box marginTop={1}>
          {loading ? (
            <LoadingIndicator label={`Loading ${config.title.toLowerCase()}…`} />
          ) : error ? (
            <ErrorState message={error} />
          ) : pageRows.length === 0 ? (
            <EmptyState message={config.emptyMessage} hint={config.emptyHint} />
          ) : (
            <DataTable columns={config.columns} rows={pageRows} selectedIndex={clampedSelected} sort={sort} />
          )}
        </Box>
        {!loading && !error && rows.length > 0 ? (
          <Box marginTop={1}>
            <Text dimColor>
              {sorted.length} row{sorted.length === 1 ? '' : 's'} {'·'} page {clampedPage + 1}/{totalPages} {'·'} / filter
              {'  '}
              {'·'} s sort {'  '} {'·'} Enter detail
              {config.actions.length > 0
                ? `  · ${config.actions.map((a) => `${a.key} ${a.label.toLowerCase()}`).join('  ')}`
                : ''}
            </Text>
          </Box>
        ) : null}
      </Box>
      {showDetail ? (
        selectedRow ? (
          <DetailPanel
            title={config.toCells(selectedRow)[config.columns[0].key] ?? 'Detail'}
            tabs={['Overview']}
            activeTab="Overview"
            focused={focused && detailOpen}
            width={Math.max(24, width - listWidth - 2)}
            rawValue={selectedRow}
            rawOpen={rawOpen}
          >
            {config.detailFields.map((field) => (
              <Text key={field.label}>
                <Text color="gray">{field.label}: </Text>
                <Text>{field.get(selectedRow)}</Text>
              </Text>
            ))}
          </DetailPanel>
        ) : (
          <Box width={Math.max(24, width - listWidth - 2)} borderStyle="round" borderColor="gray" paddingX={1}>
            <DetailEmpty />
          </Box>
        )
      ) : null}
    </Box>
  )
}
