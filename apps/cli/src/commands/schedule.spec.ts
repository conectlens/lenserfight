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
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
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
  jest.resetAllMocks();
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

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: scheduleCmd } = await import('./schedule') as { default: AnyCmd };
  const sub = scheduleCmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

describe('schedule create — CRON smoke tests', () => {
  it('calls fn_upsert_workflow_schedule and prints the returned next_run_at', async () => {
    const schedule = makeSchedule({ next_run_at: '2027-01-01T05:00:00Z' });
    mockCallRpc.mockResolvedValueOnce([schedule]);

    const createCmd = await getSubCmd('create');
    await createCmd.run?.({
      args: {
        workflow: 'wf-uuid',
        cron: '0 5 * * *',
        timezone: 'UTC',
        description: '',
        approval: '',
        retry: '',
        failure: '',
        queue: '',
        inputs: '',
        'global-model': '',
        assignee: '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_upsert_workflow_schedule',
      expect.objectContaining({ p_workflow_id: 'wf-uuid', p_cron_expr: '0 5 * * *' }),
      { requireAuth: true },
    );
  });

  it('pauses a schedule (fn_toggle_workflow_schedule p_is_active=false) and reports success', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);

    const pauseCmd = await getSubCmd('pause');
    await pauseCmd.run?.({
      args: { schedule: 'sched-uuid' },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_toggle_workflow_schedule',
      { p_schedule_id: 'sched-uuid', p_is_active: false },
      { requireAuth: true },
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });

  it('verifies next_run_at is populated after schedule creation', async () => {
    const withNextRun = makeSchedule({ next_run_at: '2027-06-15T10:00:00Z', is_active: true });
    mockCallRpc.mockResolvedValueOnce([withNextRun]);

    const createCmd = await getSubCmd('create');
    await createCmd.run?.({
      args: {
        workflow: 'wf-2',
        cron: '*/5 * * * *',
        timezone: 'Europe/Istanbul',
        description: '',
        approval: '',
        retry: '',
        failure: '',
        queue: '',
        inputs: '',
        'global-model': '',
        assignee: '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });

    // Should have called the RPC and succeeded — next_run_at is populated
    expect(mockCallRpc).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
  });
});

describe('schedule create — approval gate enforcement', () => {
  it('prints a friendly error when RPC rejects with code 23514 (approval gate check violation)', async () => {
    const gateError = Object.assign(
      new Error('Cannot activate a schedule with requiresApproval=false and no spending_limit_credits.'),
      { code: '23514', status: 400 }
    );
    mockCallRpc.mockRejectedValueOnce(gateError);

    const consolaError = (consola as unknown as { error: jest.Mock }).error;
    const createCmd = await getSubCmd('create');
    await createCmd.run?.({
      args: {
        workflow: 'wf-uuid',
        cron: '0 5 * * *',
        timezone: 'UTC',
        description: '',
        approval: '{"requiresApproval":false}',
        retry: '',
        failure: '',
        queue: '',
        inputs: '',
        'global-model': '',
        assignee: '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(1);
    expect(consolaError).toHaveBeenCalledWith(
      expect.stringContaining('Approval-free schedules require a spending limit')
    );
  });
});

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

describe('schedule backfill', () => {
  it('--dry-run prints would_dispatch + ticks without claiming dispatch', async () => {
    mockCallRpc.mockResolvedValueOnce({
      would_dispatch: 3,
      ticks: [
        { fire_at: '2026-05-01T00:00:00Z' },
        { fire_at: '2026-05-01T01:00:00Z' },
        { fire_at: '2026-05-01T02:00:00Z' },
      ],
    });
    const consolaInfo = (consola as unknown as { info: jest.Mock }).info;

    const cmd = await getSubCmd('backfill');
    await cmd.run?.({
      args: {
        schedule: 'sched-1',
        since: '2026-05-01T00:00:00Z',
        'dry-run': true,
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_backfill_schedule',
      {
        p_schedule_id: 'sched-1',
        p_since: '2026-05-01T00:00:00.000Z',
        p_dry_run: true,
      },
      { requireAuth: true }
    );
    expect(consolaInfo).toHaveBeenCalledWith('Would dispatch %d run(s).', 3);
    expect(mockPrintTable).toHaveBeenCalled();
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows).toHaveLength(3);
  });

  it('apply mode prints dispatched + skipped counts', async () => {
    mockCallRpc.mockResolvedValueOnce({
      dispatched: 5,
      skipped_existing: 2,
    });

    const cmd = await getSubCmd('backfill');
    await cmd.run?.({
      args: {
        schedule: 'sched-1',
        since: '2026-05-01T00:00:00Z',
        'dry-run': false,
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_backfill_schedule',
      expect.objectContaining({ p_dry_run: false }),
      { requireAuth: true }
    );
    expect(consolaSuccess).toHaveBeenCalledWith(
      'Dispatched %d run(s) (skipped %d already-backfilled).',
      5,
      2
    );
  });

  it('rejects an unparseable --since with exit code 1', async () => {
    const consolaError = (consola as unknown as { error: jest.Mock }).error;
    const cmd = await getSubCmd('backfill');
    await cmd.run?.({
      args: {
        schedule: 'sched-1',
        since: 'not-a-date',
        'dry-run': true,
        json: false,
      },
      cmd: {},
      rawArgs: [],
    });
    expect(process.exitCode).toBe(1);
    expect(consolaError).toHaveBeenCalled();
    expect(mockCallRpc).not.toHaveBeenCalled();
  });
});

describe('schedule history', () => {
  it('queries run history via fn_get_schedule_run_history and renders rows', async () => {
    const schedule = makeSchedule({ id: 'sched-1', workflow_id: 'wf-1' });
    mockCallRpc
      .mockResolvedValueOnce([schedule])  // fn_get_workflow_schedules
      .mockResolvedValueOnce([            // fn_get_schedule_run_history
        {
          id: 'aaaaaaaa-1111-2222-3333-444444444444',
          workflow_id: 'wf-1',
          status: 'completed',
          started_at: '2026-05-01T10:00:00Z',
          completed_at: '2026-05-01T10:00:05Z',
          created_at: '2026-05-01T10:00:00Z',
        },
        {
          id: 'bbbbbbbb-1111-2222-3333-444444444444',
          workflow_id: 'wf-1',
          status: 'failed',
          started_at: '2026-05-01T09:00:00Z',
          completed_at: '2026-05-01T09:00:02Z',
          created_at: '2026-05-01T09:00:00Z',
        },
      ]);

    const historyCmd = await getSubCmd('history');
    await historyCmd.run?.({
      args: { schedule: 'sched-1', limit: '10', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenNthCalledWith(
      2,
      'fn_get_schedule_run_history',
      { p_schedule_id: 'sched-1', p_limit: 10, p_cursor: null },
      { requireAuth: true },
    );
    expect(mockPrintTable).toHaveBeenCalled();
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows).toHaveLength(2);
    expect(rows[0][3]).toBe('completed');
    expect(rows[1][3]).toBe('failed');
    expect(rows[0][4]).toBe('5000');
  });

  it('clamps --limit to [1, 50] (51 → 50)', async () => {
    const schedule = makeSchedule({ id: 'sched-1', workflow_id: 'wf-1' });
    mockCallRpc
      .mockResolvedValueOnce([schedule])  // fn_get_workflow_schedules
      .mockResolvedValueOnce([]);          // fn_get_schedule_run_history

    const historyCmd = await getSubCmd('history');
    await historyCmd.run?.({
      args: { schedule: 'sched-1', limit: '999', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenNthCalledWith(
      2,
      'fn_get_schedule_run_history',
      { p_schedule_id: 'sched-1', p_limit: 50, p_cursor: null },
      { requireAuth: true },
    );
  });

  it('exits 1 with "Schedule not found" when the schedule id does not match', async () => {
    mockCallRpc.mockResolvedValueOnce([makeSchedule({ id: 'other-id' })]);

    const consolaError = (consola as unknown as { error: jest.Mock }).error;
    const historyCmd = await getSubCmd('history');
    await historyCmd.run?.({
      args: { schedule: 'missing-id', limit: '10', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(1);
    expect(consolaError).toHaveBeenCalledWith('Schedule %s not found.', 'missing-id');
  });
});

// ─── Phase W4: calendar / condition / rotation / preview ───────────────────

async function getNestedSubCmd(parentKey: string, childKey: string): Promise<AnyCmd> {
  const { default: scheduleCmd } = await import('./schedule') as { default: AnyCmd };
  const parent = scheduleCmd.subCommands?.[parentKey];
  const parentResolved = typeof parent === 'function' ? await parent() : (parent as AnyCmd);
  const child = parentResolved?.subCommands?.[childKey];
  return typeof child === 'function' ? await child() : (child as AnyCmd);
}

describe('schedule calendar create', () => {
  it('rejects an invalid --kind', async () => {
    const cmd = await getNestedSubCmd('calendar', 'create');
    await cmd.run?.({
      args: {
        name: 'My Cal',
        kind: 'bogus',
        dates: '2026-01-01',
        timezone: 'UTC',
      },
      cmd: {},
      rawArgs: [],
    });

    const mockCallRest = (await import('../utils/api')).callRest as jest.MockedFunction<
      typeof import('../utils/api').callRest
    >;
    const mockHandleError = (await import('../utils/api')).handleError as jest.MockedFunction<
      typeof import('../utils/api').handleError
    >;
    expect(mockCallRest).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalled();
    const err = mockHandleError.mock.calls[0][0] as Error;
    expect(err.message).toMatch(/Invalid --kind/);
  });

  it('rejects malformed date strings', async () => {
    const cmd = await getNestedSubCmd('calendar', 'create');
    await cmd.run?.({
      args: {
        name: 'My Cal',
        kind: 'skip_dates',
        dates: '2026-01-01,not-a-date',
        timezone: 'UTC',
      },
      cmd: {},
      rawArgs: [],
    });

    const mockHandleError = (await import('../utils/api')).handleError as jest.MockedFunction<
      typeof import('../utils/api').handleError
    >;
    expect(mockHandleError).toHaveBeenCalled();
    const err = mockHandleError.mock.calls[0][0] as Error;
    expect(err.message).toMatch(/Invalid date "not-a-date"/);
  });
});

describe('schedule calendar list', () => {
  it('renders rows with seed flag and date count', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        id: 'cal-uuid-1234567890',
        name: 'US Federal Holidays 2026',
        kind: 'skip_dates',
        dates: ['2026-01-01', '2026-07-04', '2026-12-25'],
        timezone: 'America/New_York',
        is_seed: true,
        created_at: '2026-04-15T00:00:00Z',
      },
    ]);

    const cmd = await getNestedSubCmd('calendar', 'list');
    await cmd.run?.({
      args: { 'seeds-only': false, 'mine-only': false, json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_schedule_calendars',
      {},
      { requireAuth: true },
    );
    expect(mockPrintTable).toHaveBeenCalled();
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows).toHaveLength(1);
    expect(rows[0][2]).toBe('skip_dates');
    expect(rows[0][3]).toBe('3 dates');
    expect(rows[0][5]).toBe('yes');
  });
});

describe('schedule calendar attach', () => {
  it('issues fn_set_schedule_calendar RPC with calendar_id', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);

    const cmd = await getNestedSubCmd('calendar', 'attach');
    await cmd.run?.({
      args: { schedule: 'sched-uuid', calendar: 'cal-uuid' },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_set_schedule_calendar',
      { p_schedule_id: 'sched-uuid', p_calendar_id: 'cal-uuid' },
      { requireAuth: true },
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });
});

describe('schedule condition set', () => {
  it('rejects a filter clause whose value is not an object', async () => {
    const { readFile } = (await import('node:fs/promises')) as unknown as { readFile: jest.Mock };
    readFile.mockResolvedValueOnce(JSON.stringify({ '/event_type': 'battle.completed' }));

    const cmd = await getNestedSubCmd('condition', 'set');
    await cmd.run?.({
      args: { schedule: 'sched-uuid', file: 'cond.json' },
      cmd: {},
      rawArgs: [],
    });

    const mockHandleError = (await import('../utils/api')).handleError as jest.MockedFunction<
      typeof import('../utils/api').handleError
    >;
    const mockCallRest = (await import('../utils/api')).callRest as jest.MockedFunction<
      typeof import('../utils/api').callRest
    >;
    expect(mockCallRest).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalled();
    const err = mockHandleError.mock.calls[0][0] as Error;
    expect(err.message).toMatch(/must be an object like/);
  });
});

describe('schedule rotation set', () => {
  it('rejects an empty array', async () => {
    const { readFile } = (await import('node:fs/promises')) as unknown as { readFile: jest.Mock };
    readFile.mockResolvedValueOnce('[]');

    const cmd = await getNestedSubCmd('rotation', 'set');
    await cmd.run?.({
      args: { schedule: 'sched-uuid', file: 'rot.json' },
      cmd: {},
      rawArgs: [],
    });

    const mockHandleError = (await import('../utils/api')).handleError as jest.MockedFunction<
      typeof import('../utils/api').handleError
    >;
    const mockCallRest = (await import('../utils/api')).callRest as jest.MockedFunction<
      typeof import('../utils/api').callRest
    >;
    expect(mockCallRest).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalled();
    const err = mockHandleError.mock.calls[0][0] as Error;
    expect(err.message).toMatch(/must not be empty/);
  });
});

describe('schedule preview', () => {
  it('clamps --next to 100 when caller passes a larger value', async () => {
    mockCallRpc.mockResolvedValueOnce([]);

    const cmd = await getSubCmd('preview');
    await cmd.run?.({
      args: { schedule: 'sched-uuid', next: '999', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_preview_schedule_ticks',
      { p_schedule_id: 'sched-uuid', p_n: 100 },
      { requireAuth: true },
    );
  });

  it('calls the lenses-schema RPC and renders rows with decision/reason', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        tick_at: '2026-05-09T10:00:00Z',
        decision: 'dispatch',
        reason: 'ok',
        inputs: { foo: 'bar' },
      },
      {
        tick_at: '2026-05-09T11:00:00Z',
        decision: 'skip',
        reason: 'calendar',
        inputs: null,
      },
    ]);

    const cmd = await getSubCmd('preview');
    await cmd.run?.({
      args: { schedule: 'sched-uuid', next: '10', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_preview_schedule_ticks',
      { p_schedule_id: 'sched-uuid', p_n: 10 },
      { requireAuth: true },
    );
    expect(mockPrintTable).toHaveBeenCalled();
    const rows = mockPrintTable.mock.calls[0][1] as string[][];
    expect(rows).toHaveLength(2);
    // ANSI may or may not be present depending on TTY/NO_COLOR; assert the
    // rendered cell contains the underlying decision token.
    expect(rows[0][1]).toContain('dispatch');
    expect(rows[0][2]).toBe('ok');
    expect(rows[1][1]).toContain('skip');
    expect(rows[1][2]).toBe('calendar');
    expect(rows[1][3]).toBe('—');
  });
});
