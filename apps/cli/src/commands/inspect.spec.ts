jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    start: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import { callRpc } from '../utils/api'
import { printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.resetAllMocks()
  process.exitCode = 0
})

async function getSub(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./inspect')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('inspect tool-usage', () => {
  it('passes --agent and --days through to fn_get_tool_invocation_rollup', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        workflow_id: 'wf-1',
        workflow_title: 'My WF',
        tool_id: 'http_get',
        total_invocations: 12,
        approved_count: 10,
        rejected_count: 2,
        last_invoked_at: '2026-05-04T12:00:00Z',
      },
    ])

    const cmd = await getSub('tool-usage')
    await cmd.run?.({
      args: { agent: 'agent-uuid', days: '14', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_tool_invocation_rollup',
      { p_ai_lenser_id: 'agent-uuid', p_days: 14 },
      { requireAuth: true }
    )
    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    expect(rows[0][0]).toBe('My WF')
    expect(rows[0][2]).toBe('12')
    expect(rows[0][3]).toBe('10')
    expect(rows[0][4]).toBe('2')
  })
})
