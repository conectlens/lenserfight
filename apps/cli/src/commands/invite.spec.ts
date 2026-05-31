jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), success: jest.fn(), log: jest.fn() },
}))
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }))
jest.mock('../utils/output', () => ({ printTable: jest.fn(), printJson: jest.fn(), truncate: (s: string) => s }))
jest.mock('../lib/onboarding/journey', () => ({ markJourneyStep: jest.fn() }))

import consola from 'consola'
import { callRpc } from '../utils/api'
import { printJson } from '../utils/output'

const consolaError = (consola as unknown as { error: jest.Mock }).error
const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)>; run?: (ctx: any) => Promise<void> }

async function resolveSubCmd(cmd: AnyCmd, key: string): Promise<AnyCmd> {
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

let inviteCmd: AnyCmd

beforeAll(async () => {
  inviteCmd = (await import('./invite')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('lf invite create', () => {
  it('rejects an invalid invite --type without calling the RPC', async () => {
    const create = await resolveSubCmd(inviteCmd, 'create')
    await create.run?.({ args: { battle: 'b-1', type: 'broadcast', target: '', json: false }, cmd: {}, rawArgs: [] })
    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid --type'), 'broadcast', expect.any(String))
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('outputs JSON and skips QR render when --json is set', async () => {
    mockCallRpc.mockResolvedValueOnce({ invite_url: 'https://x', token: 't' } as never)
    const create = await resolveSubCmd(inviteCmd, 'create')
    await create.run?.({ args: { battle: 'b-1', type: 'public', target: '', json: true }, cmd: {}, rawArgs: [] })
    expect(mockPrintJson).toHaveBeenCalled()
  })
})

describe('lf invite send', () => {
  it('rejects an invalid --role without calling the RPC', async () => {
    const send = await resolveSubCmd(inviteCmd, 'send')
    await send.run?.({ args: { target: 'alice', role: 'superuser', message: '', community: '', json: false }, cmd: {}, rawArgs: [] })
    expect(consolaError).toHaveBeenCalledWith(expect.stringContaining('Invalid --role'), 'superuser', expect.any(String))
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('calls fn_invite_send with role and target', async () => {
    mockCallRpc.mockResolvedValueOnce({ id: 'inv-1' } as never)
    const send = await resolveSubCmd(inviteCmd, 'send')
    await send.run?.({ args: { target: 'alice', role: 'member', message: '', community: '', json: false }, cmd: {}, rawArgs: [] })
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_invite_send',
      expect.objectContaining({ p_target: 'alice', p_role: 'member' }),
      { requireAuth: true },
    )
  })
})
