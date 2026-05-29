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

async function getSubCmd(...path: string[]): Promise<AnyCmd> {
  const { default: cmd } = (await import('./lenser')) as { default: AnyCmd }
  let cur: AnyCmd = cmd
  for (const key of path) {
    const sub = cur.subCommands?.[key]
    cur = typeof sub === 'function' ? await sub() : (sub as AnyCmd)
  }
  return cur
}

function mockAiListCatalog(): void {
  mockCallRpc
    .mockResolvedValueOnce({ id: 'human-profile-id' } as never)
    .mockResolvedValueOnce([
      {
        id: 'agent-owned',
        handle: 'my-bot',
        display_name: 'My Bot',
        is_active: true,
        created_at: '2026-01-01',
        runtime_pref: 'cloud',
      },
    ] as never)
    .mockResolvedValueOnce([
      { id: 'profile-public', handle: 'ai_gpt', display_name: 'GPT', type: 'ai' },
    ] as never)

  mockCallRest.mockResolvedValueOnce([
    {
      id: 'agent-public',
      profile_id: 'profile-public',
      display_name: 'GPT',
      is_active: true,
      created_at: '2026-01-02',
    },
  ] as never)
}

describe('lenser find', () => {
  it('prints matches for an exact @handle', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { id: 'p1', handle: 'ofcskn', display_name: 'OFC', type: 'human' },
    ] as never)
    mockCallRest.mockResolvedValueOnce([] as never)

    const cmd = await getSubCmd('find')
    await cmd.run?.({ args: { handle: '@ofcskn', json: false }, rawArgs: ['@ofcskn'] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_search_lensers',
      expect.objectContaining({ p_query: '@ofcskn' }),
      expect.objectContaining({ requireAuth: true }),
    )
  })
})

describe('lenser list', () => {
  it('lists human and AI lensers by default (--type all)', async () => {
    mockCallRpc
      .mockResolvedValueOnce({ id: 'human-profile-id' } as never)
      .mockResolvedValueOnce([] as never) // human search
      .mockResolvedValueOnce([] as never) // owned AI
      .mockResolvedValueOnce([] as never) // public AI search

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { type: 'all', json: false }, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_search_lensers',
      expect.objectContaining({ p_query: '' }),
      expect.anything(),
    )
  })

  it('outputs JSON when --json set', async () => {
    mockCallRpc
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { type: 'all', json: true }, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith([])
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('auth'))

    const cmd = await getSubCmd('list')
    await cmd.run?.({ args: { type: 'all', json: false }, rawArgs: [] })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('lenser ai list', () => {
  it('lists owned and public AI lensers', async () => {
    mockAiListCatalog()

    const cmd = await getSubCmd('ai', 'list')
    await cmd.run?.({ args: { json: false }, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_agents_by_owner',
      { p_owner_lenser_id: 'human-profile-id' },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })
})

describe('lenser ai remove', () => {
  it('deactivates a gateway runner by resolved id', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'agent-uuid-full',
        name: 'Bot',
        handle: 'bot',
        adapter_type: 'openai',
        is_active: true,
        created_at: '2026-01-01',
      },
    ] as never)
    mockCallRpc.mockResolvedValueOnce(null as never)

    const cmd = await getSubCmd('ai', 'remove')
    await cmd.run?.({ args: { id: 'bot' }, rawArgs: ['bot'] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_runner_remove',
      expect.anything(),
      expect.objectContaining({ requireAuth: true }),
    )
  })

  it('calls handleError on failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('not found'))

    const cmd = await getSubCmd('ai', 'remove')
    await cmd.run?.({ args: { id: 'bad' }, rawArgs: ['bad'] })

    expect(mockHandleError).toHaveBeenCalled()
  })
})
