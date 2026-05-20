jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    start: jest.fn(),
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
jest.mock('../utils/lifecycle', () => ({
  runLifecycleAction: jest.fn(),
}))

import { callRpc, callRest, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
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
  const { default: cmd } = (await import('./lenser')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('lenser list', () => {
  it('lists AI lensers via fn_runner_list', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'agent-1', name: 'Bot1', handle: 'bot1', adapter_type: 'openai', is_active: true, created_at: '2026-01-01' },
    ] as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { json: false }, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith('fn_runner_list', {}, expect.objectContaining({ requireAuth: true }))
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('outputs JSON when --json set', async () => {
    const agents = [{ id: 'a1', name: 'B1', adapter_type: 'openai', is_active: true, created_at: '2026-01-01' }]
    mockCallRpc.mockResolvedValueOnce(agents as any)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { json: true }, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(agents)
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('auth'))

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { json: false }, rawArgs: [] })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('lenser remove', () => {
  it('deactivates an AI lenser by resolved id', async () => {
    // fn_runner_list is called to resolve the identifier
    mockCallRpc.mockResolvedValueOnce([
      { id: 'agent-uuid-full', name: 'Bot', handle: 'bot', adapter_type: 'openai', is_active: true, created_at: '2026-01-01' },
    ] as any)
    mockCallRpc.mockResolvedValueOnce(null as any) // fn_runner_remove

    const cmd = await getSubCmd('remove')
    await cmd.run?.({ args: { id: 'bot' }, rawArgs: ['bot'] })

    expect(mockCallRpc).toHaveBeenCalledWith('fn_runner_remove', expect.anything(), expect.objectContaining({ requireAuth: true }))
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('not found'))

    const cmd = await getSubCmd('remove')
    await cmd.run?.({ args: { id: 'bad' }, rawArgs: ['bad'] })

    expect(mockHandleError).toHaveBeenCalled()
  })
})
