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
import { callRpc, callRest } from '../utils/api'
import { printTable } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.resetAllMocks()
  process.exitCode = 0
})

async function getSub(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./approval')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('approval grant-standing', () => {
  it('returns the standing approval id from fn_grant_standing_approval', async () => {
    mockCallRpc.mockResolvedValueOnce('std-uuid' as unknown as never)
    const cmd = await getSub('grant-standing')

    await cmd.run?.({
      args: { workflow: 'wf-1', gate: 'spending', hours: '12' },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_grant_standing_approval',
      { p_workflow_id: 'wf-1', p_gate_kind: 'spending', p_hours: 12 },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Standing approval granted: %s', 'std-uuid')
  })
})

describe('approval revoke-standing', () => {
  it('calls fn_revoke_standing_approval with the supplied id', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as unknown as never)
    const cmd = await getSub('revoke-standing')

    await cmd.run?.({
      args: { 'standing-id': 'std-uuid' },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_revoke_standing_approval',
      { p_id: 'std-uuid' },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Standing approval %s revoked.', 'std-uuid')
  })
})

describe('approval list-standing', () => {
  it('filters by workflow when --workflow is supplied', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'aaaa-bbbb-cccc-dddd-eeee',
        workflow_id: 'wf-1',
        gate_kind: 'tool',
        granted_at: '2026-05-01T10:00:00Z',
        expires_at: '2026-05-02T10:00:00Z',
        revoked_at: null,
        granted_by: null,
      },
    ] as unknown as never)
    const cmd = await getSub('list-standing')

    await cmd.run?.({
      args: { workflow: 'wf-1', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_standing_approvals',
      expect.objectContaining({ p_workflow_id: 'wf-1' }),
      { requireAuth: true },
    )
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('passes null workflow_id when --workflow is empty', async () => {
    mockCallRpc.mockResolvedValueOnce([] as unknown as never)
    const cmd = await getSub('list-standing')

    await cmd.run?.({
      args: { workflow: '', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_standing_approvals',
      expect.objectContaining({ p_workflow_id: null }),
      { requireAuth: true },
    )
  })
})

describe('approval bulk-approve', () => {
  it('skips the RPC and reports "Aborted" when the operator declines the prompt', async () => {
    // Preview count fetch returns one row.
    mockCallRest.mockResolvedValueOnce([{ id: 'r1' }] as unknown as never)

    // Simulate stdin "n" answer.
    const consolaInfo = (consola as unknown as { info: jest.Mock }).info
    const stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stdinResume = jest.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin)
    const stdinPause = jest.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin)
    let dataHandler: ((b: Buffer) => void) | null = null
    const stdinOnce = jest
      .spyOn(process.stdin, 'once')
      .mockImplementation((event: string | symbol, listener: (...args: unknown[]) => void) => {
        if (event === 'data') dataHandler = listener as (b: Buffer) => void
        return process.stdin
      })

    const cmd = await getSub('bulk-approve')
    const promise = cmd.run?.({
      args: { filter: 'status=pending', since: '', workflow: '', force: false },
      cmd: {},
      rawArgs: [],
    })

    // Drive the prompt: respond with "n".
    await new Promise((r) => setImmediate(r))
    dataHandler?.(Buffer.from('n\n'))
    await promise

    expect(mockCallRpc).not.toHaveBeenCalled()
    expect(consolaInfo).toHaveBeenCalledWith('Aborted. No approvals were granted.')

    stdoutWrite.mockRestore()
    stdinResume.mockRestore()
    stdinPause.mockRestore()
    stdinOnce.mockRestore()
  })

  it('skips the prompt and calls fn_bulk_approve when --force is set', async () => {
    mockCallRest.mockResolvedValueOnce([] as unknown as never) // preview
    mockCallRpc.mockResolvedValueOnce(7 as unknown as never)

    const cmd = await getSub('bulk-approve')
    await cmd.run?.({
      args: { filter: 'status=pending', since: '', workflow: 'wf-1', force: true },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_bulk_approve',
      { p_filters: expect.objectContaining({ status: 'pending', workflow_id: 'wf-1' }) },
      { requireAuth: true },
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Bulk-approved %d run(s).', 7)
  })
})
