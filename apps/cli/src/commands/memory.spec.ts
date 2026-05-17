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
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
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
  const { default: cmd } = (await import('./memory')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('memory list-profiles', () => {
  it('displays memory profiles for an agent', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'mp-1', name: 'Default', scope_type: 'global', isolation_mode: 'shared', retention_days: 90, is_default: true },
    ] as any)

    const cmd = await getSubCmd('list-profiles')
    await cmd.run?.({ args: { agent: 'agent-1', json: false } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_agent_memory_profiles',
      { p_ai_lenser_id: 'agent-1' },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('reports no profiles found', async () => {
    mockCallRpc.mockResolvedValueOnce([] as any)

    const cmd = await getSubCmd('list-profiles')
    await cmd.run?.({ args: { agent: 'agent-x', json: false } })

    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('No memory profiles'), expect.anything())
  })

  it('outputs JSON when --json flag is set', async () => {
    const profiles = [{ id: 'mp-1', name: 'P1' }]
    mockCallRpc.mockResolvedValueOnce(profiles as any)

    const cmd = await getSubCmd('list-profiles')
    await cmd.run?.({ args: { agent: 'a1', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(profiles)
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('fail'))

    const cmd = await getSubCmd('list-profiles')
    await cmd.run?.({ args: { agent: 'a1', json: false } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('memory list-entries', () => {
  it('lists entries from a memory profile', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'e-1', scope: 'global', source: 'run', content: 'test memory', confidence: 0.9, created_at: '2026-01-01' },
    ] as any)

    const cmd = await getSubCmd('list-entries')
    await cmd.run?.({ args: { profile: 'mp-1', workflow: '', scope: '', limit: '10', json: false } })

    expect(mockCallRpc).toHaveBeenCalled()
  })
})
