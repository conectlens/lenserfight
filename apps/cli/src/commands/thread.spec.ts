jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('@lenserfight/cli-client', () => ({
  ...jest.requireActual('@lenserfight/cli-client'),
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({ printJson: jest.fn(), printTable: jest.fn(), truncate: jest.fn((s: string) => s) }))

import consola from 'consola'
import { callRpc, callRest, handleError } from '@lenserfight/cli-client'
import { printJson } from '../utils/output'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let threadCmd: AnyCmd
let createCmd: AnyCmd

beforeAll(async () => {
  threadCmd = (await import('./thread')).default as AnyCmd
  createCmd = threadCmd.subCommands?.create as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf thread create', () => {
  it('rejects an invalid --visibility before calling the RPC', async () => {
    await createCmd?.run?.({
      args: { title: 't', content: 'c', visibility: 'friends-only', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(consolaError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid --visibility'),
      'friends-only',
      expect.any(String),
    )
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('creates a public thread and reports success from the public view row', async () => {
    mockCallRpc.mockResolvedValueOnce('thread-uuid' as never)
    mockCallRest.mockResolvedValueOnce([
      {
        id: 'thread-uuid',
        title: 'Hello',
        content: 'World',
        visibility: 'public',
        created_at: '2026-01-01T00:00:00Z',
      },
    ] as never)

    await createCmd?.run?.({
      args: { title: 'Hello', content: 'World', visibility: 'public', tags: 'tag-1, tag-2', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_content_create_thread',
      { p_title: 'Hello', p_content: 'World', p_visibility: 'public', p_tag_ids: ['tag-1', 'tag-2'] },
      { requireAuth: true },
    )
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Thread created'),
      'Hello',
      'thread-uuid',
    )
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('falls back to the input echo when the view has no row (private/community thread)', async () => {
    mockCallRpc.mockResolvedValueOnce('thread-uuid-2' as never)
    mockCallRest.mockResolvedValueOnce([] as never)

    await createCmd?.run?.({
      args: { title: 'Private note', content: 'Body', visibility: 'private', json: true },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'thread-uuid-2', title: 'Private note', visibility: 'private' }),
    )
  })

  it('reports errors via handleError', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('boom'))

    await createCmd?.run?.({
      args: { title: 'x', content: 'y', visibility: 'public', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('--as switches to the AI lenser, posts, then restores the previous active profile', async () => {
    mockCallRpc.mockImplementation(async (fn: string, params?: unknown) => {
      switch (fn) {
        case 'fn_lensers_get_active_profile':
          return { id: 'human-1' }
        case 'fn_search_lensers':
          return [{ id: 'ai-profile-1', handle: 'lenserfighter', display_name: 'LenserFighter', type: 'ai' }]
        case 'fn_resolve_ai_lenser_ids_for_profiles':
          return [{ profile_id: 'ai-profile-1', ai_lenser_id: 'ai-lenser-1' }]
        case 'fn_switch_active_lenser':
          return null
        case 'fn_content_create_thread':
          return 'thread-uuid-3'
        default:
          throw new Error(`Unexpected RPC in test: ${fn} (${JSON.stringify(params)})`)
      }
    })
    mockCallRest.mockResolvedValueOnce([
      { id: 'thread-uuid-3', title: 'As agent', content: 'Body', visibility: 'public', created_at: '2026-01-01T00:00:00Z' },
    ] as never)

    await createCmd?.run?.({
      args: { title: 'As agent', content: 'Body', visibility: 'public', as: 'lenserfighter', json: false },
      cmd: {},
      rawArgs: [],
    })

    const switchCalls = mockCallRpc.mock.calls.filter(([fn]) => fn === 'fn_switch_active_lenser')
    expect(switchCalls).toEqual([
      ['fn_switch_active_lenser', { p_lenser_id: 'ai-profile-1' }, { requireAuth: true }],
      ['fn_switch_active_lenser', { p_lenser_id: 'human-1' }, { requireAuth: true }],
    ])
    // Switched to the agent, created the thread, then restored — in that order.
    const rpcOrder = mockCallRpc.mock.calls.map(([fn]) => fn)
    expect(rpcOrder.indexOf('fn_switch_active_lenser')).toBeLessThan(rpcOrder.indexOf('fn_content_create_thread'))
    expect(rpcOrder.lastIndexOf('fn_switch_active_lenser')).toBeGreaterThan(rpcOrder.indexOf('fn_content_create_thread'))
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('--as still restores the previous profile when thread creation fails', async () => {
    mockCallRpc.mockImplementation(async (fn: string) => {
      switch (fn) {
        case 'fn_lensers_get_active_profile':
          return { id: 'human-1' }
        case 'fn_search_lensers':
          return [{ id: 'ai-profile-1', handle: 'lenserfighter', display_name: 'LenserFighter', type: 'ai' }]
        case 'fn_resolve_ai_lenser_ids_for_profiles':
          return [{ profile_id: 'ai-profile-1', ai_lenser_id: 'ai-lenser-1' }]
        case 'fn_switch_active_lenser':
          return null
        case 'fn_content_create_thread':
          throw new Error('boom')
        default:
          throw new Error(`Unexpected RPC in test: ${fn}`)
      }
    })

    await createCmd?.run?.({
      args: { title: 'x', content: 'y', visibility: 'public', as: 'lenserfighter', json: false },
      cmd: {},
      rawArgs: [],
    })

    const switchCalls = mockCallRpc.mock.calls.filter(([fn]) => fn === 'fn_switch_active_lenser')
    expect(switchCalls).toEqual([
      ['fn_switch_active_lenser', { p_lenser_id: 'ai-profile-1' }, { requireAuth: true }],
      ['fn_switch_active_lenser', { p_lenser_id: 'human-1' }, { requireAuth: true }],
    ])
    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error))
  })
})
