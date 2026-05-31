jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./rubric')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('rubric create', () => {
  it('rejects invalid JSON criteria before calling the API', async () => {
    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'R', description: '', criteria: '{not json' } })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'), expect.anything())
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('creates a rubric with parsed criteria', async () => {
    mockCallRpc.mockResolvedValueOnce('rubric-1' as any)

    const cmd = await getSubCmd('create')
    await cmd.run?.({ args: { title: 'R', description: 'd', criteria: '[{"title":"a","weight":1}]' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_rubrics_create',
      expect.objectContaining({ p_title: 'R', p_criteria: [{ title: 'a', weight: 1 }] }),
      expect.objectContaining({ requireAuth: true }),
    )
  })
})

describe('rubric list', () => {
  it('emits an empty JSON array (not an info line) when no rubrics and --json set', async () => {
    mockCallRpc.mockResolvedValueOnce([] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '20', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith([])
    expect(consola.info).not.toHaveBeenCalled()
    expect(mockPrintTable).not.toHaveBeenCalled()
  })

  it('renders a table when rubrics exist', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'rubric-1', title: 'Quality', criteria_count: 3, created_at: '2026-01-01' },
    ] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '10', json: false } })

    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('boom'))

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { limit: '20', json: false } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})
