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
jest.mock('../lib/safety', () => ({
  assertSafe: jest.fn(),
}))

import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'
import { printTable } from '../utils/output'
import { assertSafe } from '../lib/safety'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockAssertSafe = assertSafe as jest.MockedFunction<typeof assertSafe>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockAssertSafe.mockResolvedValue(undefined as any)
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./kill-switch')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('kill-switch on', () => {
  it('activates kill switch for resolved agent', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'profile-1' }] as any)
      .mockResolvedValueOnce([{ id: 'agent-1' }] as any)
    mockCallRpc.mockResolvedValueOnce(null as any)

    const cmd = await getSubCmd('on')
    await cmd.run?.({ args: { handle: 'badbot', confirm: true } })

    expect(mockAssertSafe).toHaveBeenCalledWith(expect.objectContaining({ risk: 'HIGH' }))
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_toggle_kill_switch',
      { p_ai_lenser_id: 'agent-1', p_enabled: true },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('Kill switch ACTIVATED'), expect.anything())
  })

  it('calls handleError on API failure', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'p1' }] as any)
      .mockResolvedValueOnce([{ id: 'a1' }] as any)
    mockCallRpc.mockRejectedValueOnce(new Error('rpc_error'))

    const cmd = await getSubCmd('on')
    await cmd.run?.({ args: { handle: 'bot', confirm: true } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

describe('kill-switch off', () => {
  it('deactivates kill switch for resolved agent', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'profile-1' }] as any)
      .mockResolvedValueOnce([{ id: 'agent-1' }] as any)
    mockCallRpc.mockResolvedValueOnce(null as any)

    const cmd = await getSubCmd('off')
    await cmd.run?.({ args: { handle: 'bot' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_toggle_kill_switch',
      { p_ai_lenser_id: 'agent-1', p_enabled: false },
      expect.objectContaining({ requireAuth: true }),
    )
    expect(consola.success).toHaveBeenCalled()
  })
})

describe('kill-switch status', () => {
  it('displays kill switch and pause state', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'profile-1' }] as any) // profiles
      .mockResolvedValueOnce([{ id: 'agent-1' }] as any) // ai_lensers
      .mockResolvedValueOnce([{ global_kill_switch: true, runner_paused: false }] as any) // settings

    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { handle: 'mybot' } })

    expect(printTable).toHaveBeenCalledWith(
      ['Setting', 'Value'],
      expect.arrayContaining([
        ['global_kill_switch', 'true'],
      ]),
    )
  })

  it('reports no settings when none found', async () => {
    mockCallRest
      .mockResolvedValueOnce([{ id: 'p1' }] as any)
      .mockResolvedValueOnce([{ id: 'a1' }] as any)
      .mockResolvedValueOnce([] as any)

    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { handle: 'newbot' } })

    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('No workspace settings'), expect.anything())
  })
})
