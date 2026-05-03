jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }));
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
}));
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}));
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}));

import consola from 'consola';
import { callRpc } from '../utils/api';
import { printTable } from '../utils/output';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn;
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> };

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaa-bbbb-cccc-dddd-eeee',
    workflow_id: 'wf-1',
    workflow_title: 'My Workflow',
    cron_expr: '0 * * * *', // hourly
    timezone: 'UTC',
    is_active: true,
    assignee_type: 'agent',
    assignee_id: null,
    workflow_assignment_id: null,
    next_run_at: new Date(Date.now() + 30 * 60_000).toISOString(), // 30 min in future
    last_run_at: new Date(Date.now() - 30 * 60_000).toISOString(), // 30 min ago
    last_run_id: null,
    last_dispatch_status: 'completed',
    last_error_at: null,
    last_error_message: null,
    last_completed_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    last_result: {},
    approval_policy: {},
    retry_policy: {},
    failure_policy: {},
    queue_policy: {},
    inputs_template: {},
    global_model_id: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString(),
    ...overrides,
  };
}

async function getHealthCmd(): Promise<AnyCmd> {
  const { default: scheduleCmd } = await import('./schedule') as { default: AnyCmd };
  const health = scheduleCmd.subCommands?.['health'];
  return typeof health === 'function' ? health() : (health as AnyCmd);
}

describe('schedule health', () => {
  it('exits 0 and reports OK when all active schedules ran recently', async () => {
    mockCallRpc.mockResolvedValueOnce([makeSchedule()]);
    const healthCmd = await getHealthCmd();

    await healthCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });

    expect(process.exitCode).toBe(0);
    expect(consolaSuccess).toHaveBeenCalledWith('All active schedules are healthy.');
    expect(mockPrintTable).toHaveBeenCalled();
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows[0][6]).toBe('OK');
  });

  it('exits 1 and reports MISSED when last_run_at is older than 2× interval', async () => {
    // Hourly schedule (interval = 60 min), last ran 3 hours ago → MISSED
    const missedSchedule = makeSchedule({
      last_run_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
      next_run_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    });
    mockCallRpc.mockResolvedValueOnce([missedSchedule]);
    const healthCmd = await getHealthCmd();

    await healthCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });

    expect(process.exitCode).toBe(1);
    expect(consolaWarn).toHaveBeenCalledWith(
      'One or more schedules have missed their expected dispatch window.'
    );
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows[0][6]).toBe('MISSED');
  });

  it('reports PAUSED and exits 0 for inactive schedules regardless of timing', async () => {
    const pausedSchedule = makeSchedule({
      is_active: false,
      last_run_at: new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString(), // 10 days ago
    });
    mockCallRpc.mockResolvedValueOnce([pausedSchedule]);
    const healthCmd = await getHealthCmd();

    await healthCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });

    expect(process.exitCode).toBe(0);
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows[0][6]).toBe('PAUSED');
    expect(consolaSuccess).toHaveBeenCalledWith('All active schedules are healthy.');
  });

  it('reports NEVER_RAN for active schedules with no last_run_at', async () => {
    const neverRanSchedule = makeSchedule({
      last_run_at: null,
      next_run_at: new Date(Date.now() + 10 * 60_000).toISOString(), // next run in future
    });
    mockCallRpc.mockResolvedValueOnce([neverRanSchedule]);
    const healthCmd = await getHealthCmd();

    await healthCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });

    expect(process.exitCode).toBe(0);
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows[0][6]).toBe('NEVER_RAN');
  });

  it('calls fn_get_workflow_schedules with requireAuth', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const healthCmd = await getHealthCmd();

    await healthCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_workflow_schedules',
      { p_workflow_id: null },
      { requireAuth: true }
    );
  });
});
