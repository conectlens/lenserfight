jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}))
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
  truncate: (s: string) => s,
}))

import consola from 'consola'
import { existsSync, readFileSync } from 'node:fs'
import { callRpc, callRest, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./policy')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

// Standard two-call handle resolution (profiles -> ai_lensers).
function mockResolveHandle() {
  mockCallRest
    .mockResolvedValueOnce([{ id: 'profile-1' }] as any)
    .mockResolvedValueOnce([{ id: 'agent-1' }] as any)
}

describe('policy log', () => {
  it('honors --json even when there are zero rows', async () => {
    mockResolveHandle()
    mockCallRest.mockResolvedValueOnce([] as any) // policy_evaluations

    const cmd = await getSubCmd('log')
    await cmd.run?.({ args: { handle: 'bot', limit: '20', verdict: '', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith([])
    expect(consola.info).not.toHaveBeenCalled()
  })

  it('prints a table for non-JSON output', async () => {
    mockResolveHandle()
    mockCallRest.mockResolvedValueOnce([
      { policy_type: 'budget', verdict: 'deny', reason: 'over cap', evaluated_at: '2026-05-01T00:00:00Z' },
    ] as any)

    const cmd = await getSubCmd('log')
    await cmd.run?.({ args: { handle: 'bot', limit: '20', verdict: '', json: false } })

    expect(mockPrintTable).toHaveBeenCalled()
    expect(mockPrintJson).not.toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRest.mockRejectedValueOnce(new Error('boom'))

    const cmd = await getSubCmd('log')
    await cmd.run?.({ args: { handle: 'bot', limit: '20', verdict: '', json: false } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('policy stats', () => {
  it('rejects an invalid --period with exit code 1', async () => {
    const cmd = await getSubCmd('stats')
    await cmd.run?.({ args: { handle: 'bot', period: '1y', json: false } })

    expect(consola.error).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
    expect(mockCallRest).not.toHaveBeenCalled()
  })

  it('honors --json with grouped counts even when empty', async () => {
    mockResolveHandle()
    mockCallRest.mockResolvedValueOnce([] as any)

    const cmd = await getSubCmd('stats')
    await cmd.run?.({ args: { handle: 'bot', period: '24h', json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith([])
  })

  it('groups rows by policy_type and verdict for the table', async () => {
    mockResolveHandle()
    mockCallRest.mockResolvedValueOnce([
      { policy_type: 'budget', verdict: 'deny' },
      { policy_type: 'budget', verdict: 'deny' },
      { policy_type: 'content', verdict: 'allow' },
    ] as any)

    const cmd = await getSubCmd('stats')
    await cmd.run?.({ args: { handle: 'bot', period: '7d', json: false } })

    expect(mockPrintTable).toHaveBeenCalledWith(
      ['Policy Type', 'Verdict', 'Count'],
      expect.arrayContaining([['budget', 'deny', '2']]),
    )
  })
})

describe('policy set', () => {
  it('exits 1 when the policy file does not exist', async () => {
    mockExistsSync.mockReturnValueOnce(false)

    const cmd = await getSubCmd('set')
    await cmd.run?.({
      args: { handle: 'bot', file: '/nope.json', 'policy-type': 'content', 'max-daily-runs': '', json: false },
    })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('not found'), '/nope.json')
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('exits 1 when the policy file is invalid JSON', async () => {
    mockExistsSync.mockReturnValueOnce(true)
    mockReadFileSync.mockReturnValueOnce('{ not json' as any)

    const cmd = await getSubCmd('set')
    await cmd.run?.({
      args: { handle: 'bot', file: '/bad.json', 'policy-type': 'content', 'max-daily-runs': '', json: false },
    })

    expect(consola.error).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('sets a rate_limit policy from --max-daily-runs', async () => {
    mockResolveHandle()
    mockCallRpc.mockResolvedValueOnce(null as any)

    const cmd = await getSubCmd('set')
    await cmd.run?.({
      args: { handle: 'bot', file: '', 'policy-type': 'rate_limit', 'max-daily-runs': '25', json: false },
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_set_agent_policy',
      expect.objectContaining({
        p_ai_lenser_id: 'agent-1',
        p_policy_type: 'rate_limit',
        p_config: { max_daily_runs: 25 },
      }),
      expect.objectContaining({ requireAuth: true }),
    )
    expect(consola.success).toHaveBeenCalled()
  })
})
