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
}))

import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./budget')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('budget set', () => {
  it('calls fn_update_workspace_settings with resolved agent id', async () => {
    mockCallRest.mockResolvedValueOnce([{ id: 'profile-1' }] as any) // profiles
    mockCallRest.mockResolvedValueOnce([{ id: 'agent-1' }] as any) // ai_lensers
    mockCallRpc.mockResolvedValueOnce(null as any) // fn_update_workspace_settings

    const cmd = await getSubCmd('set')
    await cmd.run?.({ args: { handle: 'mybot', 'daily-credits': '100', enforce: 'true' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_update_workspace_settings',
      expect.objectContaining({
        p_ai_lenser_id: 'agent-1',
        p_settings: { max_daily_credits: 100, budget_enforce: true },
      }),
      expect.objectContaining({ requireAuth: true }),
    )
    expect(consola.success).toHaveBeenCalled()
  })

  it('exits 1 for non-numeric daily-credits', async () => {
    const cmd = await getSubCmd('set')
    await cmd.run?.({ args: { handle: 'bot', 'daily-credits': 'abc', enforce: 'true' } })

    expect(consola.error).toHaveBeenCalledWith(expect.stringContaining('non-negative integer'))
    expect(process.exitCode).toBe(1)
  })

  it('exits 1 for negative daily-credits', async () => {
    const cmd = await getSubCmd('set')
    await cmd.run?.({ args: { handle: 'bot', 'daily-credits': '-5', enforce: 'true' } })

    expect(consola.error).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('calls handleError on API failure', async () => {
    mockCallRest.mockRejectedValueOnce(new Error('network'))

    const cmd = await getSubCmd('set')
    await cmd.run?.({ args: { handle: 'bot', 'daily-credits': '50', enforce: 'true' } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('budget status', () => {
  it('displays budget info for an agent', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'profile-1' }] as any) // profiles
      .mockResolvedValueOnce([{ id: 'agent-1' }] as any) // ai_lensers
      .mockResolvedValueOnce([{ max_daily_credits: 200, budget_enforce: true }] as any) // workspace_settings
      .mockResolvedValueOnce([{ credits_spent: 50, snapshot_date: '2026-05-18' }] as any) // quota_snapshots

    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { handle: 'mybot', json: false } })

    expect(mockCallRest).toHaveBeenCalled()
  })
})
