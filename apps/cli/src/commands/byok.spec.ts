jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn((err: unknown) => { throw err }),
}))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    box: jest.fn(),
  },
}))

import { callRpc } from '../utils/api'
import { printTable } from '../utils/output'
import byokCommand from './byok'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

// ─── lf byok usage ───────────────────────────────────────────────────────────

describe('lf byok usage', () => {
  const usageCmd = byokCommand.subCommands?.['usage']

  it('prints usage rows when records exist', async () => {
    const fakeRows = [
      {
        id: 'row-uuid-1',
        key_id: 'key-uuid-1',
        battle_id: 'battle-uuid-1',
        model_id: 'claude-sonnet-4-6',
        called_at: new Date().toISOString(),
        token_count: 1234,
        caller_role: 'service_role',
      },
    ]
    mockCallRpc.mockResolvedValueOnce(fakeRows)

    await (usageCmd as { run: (ctx: unknown) => Promise<void> }).run({
      args: { key: 'key-uuid-1', json: false },
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_byok_usage_list',
      { p_key_id: 'key-uuid-1', p_limit: 20 },
      { requireAuth: true }
    )
    expect(process.exitCode).toBeFalsy()
  })
})

// ─── lf byok check-rotation ──────────────────────────────────────────────────

describe('lf byok check-rotation', () => {
  const checkRotationCmd = byokCommand.subCommands?.['check-rotation']

  it('exits 0 when no keys are overdue', async () => {
    mockCallRpc.mockResolvedValueOnce([])

    await (checkRotationCmd as { run: (ctx: unknown) => Promise<void> }).run({
      args: { json: false },
    })

    expect(process.exitCode).toBeFalsy()
  })

  it('exits 1 and reports key when an overdue key is found', async () => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 86_400_000).toISOString()
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'key-uuid-overdue',
        provider: 'openai',
        key_hint: 'abcd',
        agent_id: 'agent-uuid-1',
        last_rotated_at: ninetyOneDaysAgo,
      },
    ])

    await (checkRotationCmd as { run: (ctx: unknown) => Promise<void> }).run({
      args: { json: false },
    })

    expect(process.exitCode).toBe(1)
  })

  it('shows "n/a" days_overdue for a never-rotated key instead of an epoch-based number', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'key-uuid-never',
        provider: 'anthropic',
        key_hint: 'wxyz',
        agent_id: 'agent-uuid-2',
        last_rotated_at: null,
      },
    ])

    await (checkRotationCmd as { run: (ctx: unknown) => Promise<void> }).run({
      args: { json: false },
    })

    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    expect(rows[0]).toEqual(['anthropic', '···· wxyz', 'never', 'n/a'])
    expect(process.exitCode).toBe(1)
  })
})
