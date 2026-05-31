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
import { printJson } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const consolaLog = (consola as unknown as { log: jest.Mock }).log
const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaInfo = (consola as unknown as { info: jest.Mock }).info

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.resetAllMocks()
  process.exitCode = 0
})

async function getSubCmd(name: string): Promise<AnyCmd> {
  const { default: teamCmd } = (await import('./team')) as { default: AnyCmd }
  const sub = teamCmd.subCommands?.[name]
  if (!sub) throw new Error(`subcommand ${name} missing`)
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('lf team conversation', () => {
  it('prints a tree-style conversation with indentation by depth', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'msg-1',
        team_run_id: 'run-uuid',
        from_agent_id: 'agent-aaaaaaaa-1111',
        to_agent_id: null,
        kind: 'plan',
        payload: { goal: 'do the thing' },
        parent_message_id: null,
        occurred_at: '2026-05-08T10:00:00Z',
        depth: 0,
      },
      {
        id: 'msg-2',
        team_run_id: 'run-uuid',
        from_agent_id: 'agent-bbbbbbbb-2222',
        to_agent_id: 'agent-aaaaaaaa-1111',
        kind: 'reply',
        payload: 'ack',
        parent_message_id: 'msg-1',
        occurred_at: '2026-05-08T10:00:01Z',
        depth: 1,
      },
    ] as never)

    const cmd = await getSubCmd('conversation')
    await cmd.run?.({
      args: { 'run-id': 'run-uuid', limit: '100', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_team_run_conversation',
      { p_run_id: 'run-uuid', p_limit: 100 },
      { requireAuth: true },
    )

    const logLines = consolaLog.mock.calls.map((c) => String(c[0]))
    expect(logLines).toHaveLength(2)
    expect(logLines[0]).toMatch(/agent-aa→all: plan/)
    expect(logLines[1].startsWith('  ')).toBe(true)
    expect(logLines[1]).toMatch(/agent-bb→agent-aa: reply/)
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('reports info when there are no messages', async () => {
    mockCallRpc.mockResolvedValueOnce([] as never)
    const cmd = await getSubCmd('conversation')
    await cmd.run?.({
      args: { 'run-id': 'run-uuid', limit: '100', json: false },
      cmd: {},
      rawArgs: [],
    })
    expect(consolaInfo).toHaveBeenCalled()
    expect(consolaLog).not.toHaveBeenCalled()
  })
})

describe('lf team scratchpad', () => {
  it('prints the version and JSON body of the shared scratchpad', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        shared_scratchpad: { notes: 'hello', items: [1, 2] },
        shared_scratchpad_version: 7,
      },
    ] as never)

    const cmd = await getSubCmd('scratchpad')
    await cmd.run?.({
      args: { 'run-id': 'run-uuid', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_team_run_scratchpad',
      { p_run_id: 'run-uuid' },
      { requireAuth: true },
    )
    expect(consolaInfo).toHaveBeenCalledWith('Version: %d', 7)
    expect(mockPrintJson).toHaveBeenCalledWith({ notes: 'hello', items: [1, 2] })
  })

  it('--json prints only the raw scratchpad payload', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { shared_scratchpad: { a: 1 }, shared_scratchpad_version: 2 },
    ] as never)

    const cmd = await getSubCmd('scratchpad')
    await cmd.run?.({
      args: { 'run-id': 'run-uuid', json: true },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintJson).toHaveBeenCalledWith({ a: 1 })
    expect(consolaInfo).not.toHaveBeenCalled()
  })

  it('errors out when the team run is not found', async () => {
    mockCallRpc.mockResolvedValueOnce([] as never)
    const cmd = await getSubCmd('scratchpad')
    await cmd.run?.({
      args: { 'run-id': 'missing', json: false },
      cmd: {},
      rawArgs: [],
    })
    expect(consolaError).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})

describe('lf team set-role', () => {
  it('rejects an invalid role without calling the API', async () => {
    const cmd = await getSubCmd('set-role')
    await cmd.run?.({
      args: { 'member-id': 'm-1', role: 'bogus', team: 'team-uuid' },
      cmd: {},
      rawArgs: [],
    })
    expect(consolaError).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('calls fn_update_team_member_role for a valid role', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as never)
    const cmd = await getSubCmd('set-role')
    await cmd.run?.({
      args: { 'member-id': 'm-1', role: 'reviewer', team: 'team-uuid' },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_update_team_member_role',
      { p_team_id: 'team-uuid', p_member_id: 'm-1', p_role: 'reviewer' },
      { requireAuth: true },
    )
    expect(consolaSuccess).toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
  })

  it.each(['leader', 'executor', 'reviewer', 'observer', 'operator'])(
    'accepts role %s',
    async (role) => {
      mockCallRpc.mockResolvedValueOnce(undefined as never)
      const cmd = await getSubCmd('set-role')
      await cmd.run?.({
        args: { 'member-id': 'm-1', role, team: 'team-uuid' },
        cmd: {},
        rawArgs: [],
      })
      expect(mockCallRpc).toHaveBeenCalled()
      expect(process.exitCode).toBe(0)
    }
  )
})
