import { render } from 'ink-testing-library'

import { DataTable, filterRows, sortRows, paginateRows, type DataTableRow } from './DataTable'

const ROWS: DataTableRow[] = [
  { id: '1', cells: { name: 'Charlie', status: 'active' } },
  { id: '2', cells: { name: 'Alpha', status: 'paused' } },
  { id: '3', cells: { name: 'Bravo', status: 'failed' } },
]

describe('filterRows', () => {
  it('matches case-insensitively across any cell', () => {
    expect(filterRows(ROWS, 'alpha')).toHaveLength(1)
    expect(filterRows(ROWS, 'ACTIVE')).toHaveLength(1)
  })

  it('returns all rows for an empty query', () => {
    expect(filterRows(ROWS, '  ')).toHaveLength(3)
  })
})

describe('sortRows', () => {
  it('sorts ascending by the given column', () => {
    const sorted = sortRows(ROWS, { key: 'name', dir: 'asc' })
    expect(sorted.map((r) => r.cells.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('reverses for descending', () => {
    const sorted = sortRows(ROWS, { key: 'name', dir: 'desc' })
    expect(sorted.map((r) => r.cells.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('is a no-op with no sort key', () => {
    expect(sortRows(ROWS, { key: null, dir: 'asc' })).toEqual(ROWS)
  })
})

describe('paginateRows', () => {
  it('slices by page size and clamps out-of-range pages', () => {
    const { pageRows, totalPages, page } = paginateRows(ROWS, 5, 2)
    expect(totalPages).toBe(2)
    expect(page).toBe(1)
    expect(pageRows).toHaveLength(1)
  })
})

describe('DataTable component', () => {
  it('renders the empty message when there are no rows', () => {
    const { lastFrame } = render(
      <DataTable
        columns={[{ key: 'name', label: 'NAME', width: 10 }]}
        rows={[]}
        selectedIndex={0}
        sort={{ key: null, dir: 'asc' }}
        emptyMessage="Nothing to show."
      />,
    )
    expect(lastFrame()).toContain('Nothing to show.')
  })

  it('renders every row and column', () => {
    const { lastFrame } = render(
      <DataTable
        columns={[
          { key: 'name', label: 'NAME', width: 10 },
          { key: 'status', label: 'STATUS', width: 10, status: true },
        ]}
        rows={ROWS}
        selectedIndex={1}
        sort={{ key: 'name', dir: 'asc' }}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Charlie')
    expect(frame).toContain('Alpha')
    expect(frame).toContain('Bravo')
    expect(frame).toContain('NAME')
  })
})
