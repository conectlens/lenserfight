const mockError = jest.fn()
const mockWarn = jest.fn()
const mockInfo = jest.fn()
const mockSuccess = jest.fn()
const mockLog = jest.fn()

const mockCallRpc = jest.fn()
const mockHandleError = jest.fn()

const mockPrintTable = jest.fn()
const mockPrintJson = jest.fn()

const mockAssertSafe = jest.fn()

jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: mockError,
    warn: mockWarn,
    info: mockInfo,
    success: mockSuccess,
    log: mockLog,
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: mockCallRpc,
  handleError: mockHandleError,
}))
jest.mock('../utils/output', () => ({
  printTable: mockPrintTable,
  printJson: mockPrintJson,
}))
jest.mock('../lib/safety', () => ({
  assertSafe: mockAssertSafe,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

const HEALTHY_STATUS = {
  system_kill_switch_active: false,
  queue_frozen: false,
  frozen_reason: null,
  active_run_count: 0,
  queued_run_count: 0,
  active_battle_job_count: 0,
  queued_battle_job_count: 0,
  active_worker_count: 2,
  stale_worker_count: 0,
  dlq_workflow_count: 0,
  dlq_battle_count: 0,
}

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
  mockAssertSafe.mockResolvedValue(undefined as never)
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  jest.resetModules()
  const { default: cmd } = (await import('./platform')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

describe('platform status', () => {
  it('prints a table with all metrics', async () => {
    mockCallRpc.mockResolvedValueOnce(HEALTHY_STATUS as never)
    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { json: false } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_execution_status',
      {},
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockPrintTable).toHaveBeenCalledWith(
      ['Metric', 'Value'],
      expect.arrayContaining([
        ['System Kill Switch', 'inactive'],
        ['Active Runs', '0'],
        ['Stale Workers', '0'],
      ])
    )
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('warns when system is locked', async () => {
    mockCallRpc.mockResolvedValueOnce({
      ...HEALTHY_STATUS,
      system_kill_switch_active: true,
    } as never)
    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { json: false } })

    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('LOCKED'))
  })

  it('warns when stale workers are detected', async () => {
    mockCallRpc.mockResolvedValue({ ...HEALTHY_STATUS, stale_worker_count: 3 } as never)
    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { json: false } })

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('stale worker'),
      expect.anything()
    )
  })

  it('prints JSON when --json flag is set', async () => {
    mockCallRpc.mockResolvedValueOnce(HEALTHY_STATUS as never)
    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { json: true } })

    expect(mockPrintJson).toHaveBeenCalledWith(HEALTHY_STATUS)
    expect(mockPrintTable).not.toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('rpc_error'))
    const cmd = await getSubCmd('status')
    await cmd.run?.({ args: { json: false } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// emergency-stop
// ---------------------------------------------------------------------------

describe('platform emergency-stop', () => {
  it('calls assertSafe with CRITICAL risk and typed phrase', async () => {
    mockCallRpc.mockResolvedValueOnce({
      switch_id: 'sw-1',
      cancelled_runs: 0,
      cancelled_jobs: 0,
    } as never)
    const cmd = await getSubCmd('emergency-stop')
    await cmd.run?.({ args: { reason: 'runaway scheduler', force: false } })

    expect(mockAssertSafe).toHaveBeenCalledWith(
      expect.objectContaining({ risk: 'CRITICAL', typedPhrase: 'PLATFORM DOWN' })
    )
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_emergency_stop',
      { p_reason: 'runaway scheduler', p_force_mode: false },
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('ACTIVATED'),
      expect.anything()
    )
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('permission denied'))
    const cmd = await getSubCmd('emergency-stop')
    await cmd.run?.({ args: { reason: 'test', force: true } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// kill-all
// ---------------------------------------------------------------------------

describe('platform kill-all', () => {
  it('calls assertSafe with KILL ALL RUNS typed phrase and force_mode=true', async () => {
    mockCallRpc.mockResolvedValueOnce({
      switch_id: 'sw-2',
      cancelled_runs: 5,
      cancelled_jobs: 2,
    } as never)
    const cmd = await getSubCmd('kill-all')
    await cmd.run?.({ args: { reason: 'queue flood', force: true } })

    expect(mockAssertSafe).toHaveBeenCalledWith(
      expect.objectContaining({ risk: 'CRITICAL', typedPhrase: 'KILL ALL RUNS' })
    )
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_emergency_stop',
      { p_reason: 'queue flood', p_force_mode: true },
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('Cancelled'), 5, 2)
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('boom'))
    const cmd = await getSubCmd('kill-all')
    await cmd.run?.({ args: { reason: 'test', force: true } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// resume
// ---------------------------------------------------------------------------

describe('platform resume', () => {
  it('lifts the kill switch by id', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('resume')
    await cmd.run?.({ args: { id: 'sw-abc' } })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_kill_switch_lift',
      { p_switch_id: 'sw-abc' },
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockSuccess).toHaveBeenCalled()
  })

  it('does not call assertSafe', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('resume')
    await cmd.run?.({ args: { id: 'sw-abc' } })

    expect(mockAssertSafe).not.toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('not found'))
    const cmd = await getSubCmd('resume')
    await cmd.run?.({ args: { id: 'bad-id' } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// queue-freeze
// ---------------------------------------------------------------------------

describe('platform queue-freeze', () => {
  it('calls assertSafe with HIGH risk and calls fn_queue_freeze', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('queue-freeze')
    await cmd.run?.({ args: { reason: 'deploy window', force: true } })

    expect(mockAssertSafe).toHaveBeenCalledWith(expect.objectContaining({ risk: 'HIGH' }))
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_queue_freeze',
      { p_reason: 'deploy window' },
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockWarn).toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('forbidden'))
    const cmd = await getSubCmd('queue-freeze')
    await cmd.run?.({ args: { reason: 'test', force: true } })

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// queue-unfreeze
// ---------------------------------------------------------------------------

describe('platform queue-unfreeze', () => {
  it('calls fn_queue_unfreeze and does not call assertSafe', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('queue-unfreeze')
    await cmd.run?.({})

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_queue_unfreeze',
      {},
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockAssertSafe).not.toHaveBeenCalled()
    expect(mockSuccess).toHaveBeenCalled()
  })

  it('calls handleError on API failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('err'))
    const cmd = await getSubCmd('queue-unfreeze')
    await cmd.run?.({})

    expect(mockHandleError).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// scheduler-disable / scheduler-enable
// ---------------------------------------------------------------------------

describe('platform scheduler-disable', () => {
  it('calls assertSafe with HIGH risk and fn_queue_freeze', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('scheduler-disable')
    await cmd.run?.({ args: { reason: 'maintenance', force: true } })

    expect(mockAssertSafe).toHaveBeenCalledWith(expect.objectContaining({ risk: 'HIGH' }))
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_queue_freeze',
      { p_reason: 'maintenance' },
      expect.objectContaining({ requireAuth: true })
    )
  })
})

describe('platform scheduler-enable', () => {
  it('calls fn_queue_unfreeze and does not call assertSafe', async () => {
    mockCallRpc.mockResolvedValueOnce(null as never)
    const cmd = await getSubCmd('scheduler-enable')
    await cmd.run?.({})

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_queue_unfreeze',
      {},
      expect.objectContaining({ requireAuth: true })
    )
    expect(mockAssertSafe).not.toHaveBeenCalled()
    expect(mockSuccess).toHaveBeenCalled()
  })
})
