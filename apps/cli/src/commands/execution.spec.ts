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

import { callRpc } from '../utils/api'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./execution')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('execution wait --workflow --any', () => {
  it('exits 0 when the latest terminal run for the workflow is "completed"', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'run-1',
        workflow_id: 'wf-1',
        status: 'completed',
        active_node_id: null,
        created_at: '2026-05-08T00:00:00Z',
        started_at: '2026-05-08T00:00:00Z',
        completed_at: '2026-05-08T00:00:05Z',
        parent_run_id: null,
      },
    ] as unknown as never)

    const cmd = await getSubCmd('wait')
    await cmd.run?.({
      args: {
        run: '',
        workflow: 'wf-1',
        any: true,
        timeout: '5',
        interval: '0',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_list_workflow_runs',
      expect.objectContaining({ p_workflow_id: 'wf-1' }),
      { requireAuth: true },
    )
  })

  it('exits 1 when the latest terminal run is "failed"', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'run-2',
        workflow_id: 'wf-1',
        status: 'failed',
        active_node_id: null,
        created_at: '2026-05-08T00:00:00Z',
        started_at: '2026-05-08T00:00:00Z',
        completed_at: '2026-05-08T00:00:05Z',
        parent_run_id: null,
      },
    ] as unknown as never)

    const cmd = await getSubCmd('wait')
    await cmd.run?.({
      args: {
        run: '',
        workflow: 'wf-1',
        any: true,
        timeout: '5',
        interval: '0',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
  })
})
