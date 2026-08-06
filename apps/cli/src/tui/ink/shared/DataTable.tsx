import { Box, Text } from 'ink'

import { toneForStatus, type StatusTone } from './StatusBadge'

export interface DataTableColumn {
  key: string
  label: string
  width: number
  /** Render this column's cells as a status badge instead of plain text. */
  status?: boolean
}

export interface DataTableRow {
  id: string
  cells: Record<string, string>
}

export interface SortState {
  key: string | null
  dir: 'asc' | 'desc'
}

export function filterRows(rows: DataTableRow[], query: string): DataTableRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => Object.values(row.cells).some((v) => v.toLowerCase().includes(q)))
}

export function sortRows(rows: DataTableRow[], sort: SortState): DataTableRow[] {
  if (!sort.key) return rows
  const key = sort.key
  const sorted = [...rows].sort((a, b) => {
    const av = a.cells[key] ?? ''
    const bv = b.cells[key] ?? ''
    return av.localeCompare(bv, undefined, { numeric: true })
  })
  return sort.dir === 'desc' ? sorted.reverse() : sorted
}

export function paginateRows(
  rows: DataTableRow[],
  page: number,
  pageSize: number,
): { pageRows: DataTableRow[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const clampedPage = Math.min(Math.max(0, page), totalPages - 1)
  const start = clampedPage * pageSize
  return { pageRows: rows.slice(start, start + pageSize), totalPages, page: clampedPage }
}

function fit(text: string, width: number): string {
  if (text.length > width) return text.slice(0, Math.max(0, width - 1)) + '…'
  return text.padEnd(width)
}

interface DataTableProps {
  columns: DataTableColumn[]
  rows: DataTableRow[]
  selectedIndex: number
  sort: SortState
  emptyMessage?: string
}

export function DataTable({ columns, rows, selectedIndex, sort, emptyMessage }: DataTableProps) {
  if (rows.length === 0) {
    return <Text color="gray">{emptyMessage ?? 'No rows.'}</Text>
  }

  return (
    <Box flexDirection="column">
      <Text>
        {columns.map((col) => (
          <Text key={col.key} color="whiteBright" bold>
            {fit(col.label + (sort.key === col.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''), col.width)}
            {'  '}
          </Text>
        ))}
      </Text>
      {rows.map((row, i) => {
        const selected = i === selectedIndex
        return (
          <Text key={row.id} backgroundColor={selected ? 'blue' : undefined}>
            {columns.map((col) => {
              const value = row.cells[col.key] ?? ''
              if (col.status) {
                const tone: StatusTone = toneForStatus(value)
                const color = selected
                  ? 'whiteBright'
                  : ({ success: 'greenBright', warn: 'yellowBright', error: 'redBright', info: 'cyanBright', muted: 'gray' } as const)[
                      tone
                    ]
                return (
                  <Text key={col.key} color={color} bold={!selected}>
                    {fit(value, col.width)}
                    {'  '}
                  </Text>
                )
              }
              return (
                <Text key={col.key} color={selected ? 'whiteBright' : undefined}>
                  {fit(value, col.width)}
                  {'  '}
                </Text>
              )
            })}
          </Text>
        )
      })}
    </Box>
  )
}
