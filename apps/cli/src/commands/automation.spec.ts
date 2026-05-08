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
import { readFile } from 'node:fs/promises';
import { callRest, handleError } from '../utils/api';
import { printJson, printTable } from '../utils/output';

const mockCallRest = callRest as jest.MockedFunction<typeof callRest>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;
const consolaInfo = (consola as unknown as { info: jest.Mock }).info;
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> };

beforeEach(() => {
  jest.resetAllMocks();
  process.exitCode = 0;
});

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: automationCmd } = await import('./automation') as { default: AnyCmd };
  const sub = automationCmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

// ─── list ─────────────────────────────────────────────────────────────────

describe('automation list', () => {
  it('renders a table of rules and calls callRest with the expected query', async () => {
    mockCallRest.mockResolvedValueOnce([
      {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'Notify on battle complete',
        match_event_type: 'battle.completed',
        action_kind: 'notify',
        is_active: true,
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        name: 'Webhook ping',
        match_event_type: 'battle.created',
        action_kind: 'webhook',
        is_active: false,
        created_at: '2026-04-01T00:00:00Z',
      },
    ]);

    const cmd = await getSubCmd('list');
    await cmd.run?.({ args: { 'active-only': false, json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'GET',
      undefined,
      expect.objectContaining({
        requireAuth: true,
        query: expect.objectContaining({
          select: 'id,name,match_event_type,action_kind,is_active,created_at',
          order: 'created_at.desc',
        }),
      }),
    );
    expect(mockPrintTable).toHaveBeenCalled();
    const [headers, rows] = mockPrintTable.mock.calls[0];
    expect(headers).toEqual(['Rule ID', 'Name', 'Event', 'Action', 'Active', 'Created']);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('11111111');
    expect(rows[0][3]).toBe('notify');
    expect(rows[1][4]).toBe('no');
  });

  it('appends is_active=eq.true when --active-only is passed', async () => {
    mockCallRest.mockResolvedValueOnce([]);
    const cmd = await getSubCmd('list');
    await cmd.run?.({ args: { 'active-only': true, json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'GET',
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({ is_active: 'eq.true' }),
      }),
    );
  });
});

// ─── create ───────────────────────────────────────────────────────────────

describe('automation create', () => {
  it('parses a valid JSON file and POSTs to automation.trigger_rules', async () => {
    const validRule = {
      name: 'Notify on win',
      match_event_type: 'battle.completed',
      match_filter: { '/payload/winner_id': { eq: 'lenser-1' } },
      action_kind: 'notify',
      action_config: { channel: 'inbox' },
      is_active: true,
    };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(validRule));
    mockCallRest.mockResolvedValueOnce([
      { id: '99999999-0000-0000-0000-000000000000', name: 'Notify on win' },
    ]);

    const cmd = await getSubCmd('create');
    await cmd.run?.({ args: { file: '/tmp/rule.json' }, cmd: {}, rawArgs: [] });

    expect(mockReadFile).toHaveBeenCalledWith('/tmp/rule.json', 'utf-8');
    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'POST',
      expect.objectContaining({
        name: 'Notify on win',
        match_event_type: 'battle.completed',
        action_kind: 'notify',
        is_active: true,
      }),
      expect.objectContaining({ requireAuth: true, prefer: 'return=representation' }),
    );
    expect(mockPrintJson).toHaveBeenCalledWith({
      rule_id: '99999999-0000-0000-0000-000000000000',
      name: 'Notify on win',
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects a rule with an invalid action_kind via handleError', async () => {
    const invalidRule = {
      name: 'bad',
      match_event_type: 'battle.completed',
      action_kind: 'send_email', // not in the allowed list
      action_config: {},
    };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidRule));

    const cmd = await getSubCmd('create');
    await cmd.run?.({ args: { file: '/tmp/rule.json' }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalled();
    const errArg = mockHandleError.mock.calls[0][0] as Error;
    expect(errArg.message).toMatch(/action_kind/);
  });

  it('rejects a YAML file (no yaml lib bundled)', async () => {
    const cmd = await getSubCmd('create');
    await cmd.run?.({ args: { file: '/tmp/rule.yaml' }, cmd: {}, rawArgs: [] });

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalled();
    const errArg = mockHandleError.mock.calls[0][0] as Error;
    expect(errArg.message).toMatch(/YAML/i);
  });
});

// ─── history ──────────────────────────────────────────────────────────────

describe('automation history', () => {
  it('clamps --limit to 100 when given 999', async () => {
    mockCallRest.mockResolvedValueOnce([
      {
        event_id: 'evt-1',
        status: 'dispatched',
        attempted_at: '2026-05-01T00:00:00Z',
        error: null,
      },
    ]);

    const cmd = await getSubCmd('history');
    await cmd.run?.({ args: { id: 'rule-1', limit: '999', json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'event_dispatches',
      'GET',
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({
          rule_id: 'eq.rule-1',
          order: 'attempted_at.desc',
          limit: 100,
        }),
      }),
    );
  });

  it('uses default 25 when --limit is missing/invalid', async () => {
    mockCallRest.mockResolvedValueOnce([]);
    const cmd = await getSubCmd('history');
    await cmd.run?.({ args: { id: 'rule-1', limit: 'not-a-number', json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'event_dispatches',
      'GET',
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({ limit: 25 }),
      }),
    );
  });
});

// ─── test (dry-run) ───────────────────────────────────────────────────────

describe('automation test', () => {
  it('returns WOULD FIRE for a matching rule + event', async () => {
    const rule = {
      name: 'Notify on lenser-1 win',
      match_event_type: 'battle.completed',
      match_filter: { '/payload/winner_id': { eq: 'lenser-1' } },
      action_kind: 'notify',
      action_config: { channel: 'inbox' },
    };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(rule));

    const event = JSON.stringify({
      event_type: 'battle.completed',
      payload: { winner_id: 'lenser-1', score: 42 },
    });

    const cmd = await getSubCmd('test');
    await cmd.run?.({ args: { file: '/tmp/rule.json', event }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).not.toHaveBeenCalled();
    expect(consolaSuccess).toHaveBeenCalledWith(
      expect.stringContaining('WOULD FIRE'),
      'notify',
      'Notify on lenser-1 win',
    );
  });

  it('returns NO MATCH with the failing clause when filter does not match', async () => {
    const rule = {
      name: 'Notify on lenser-1 win',
      match_event_type: 'battle.completed',
      match_filter: { '/payload/winner_id': { eq: 'lenser-1' } },
      action_kind: 'notify',
      action_config: { channel: 'inbox' },
    };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(rule));

    const event = JSON.stringify({
      event_type: 'battle.completed',
      payload: { winner_id: 'lenser-2' },
    });

    const cmd = await getSubCmd('test');
    await cmd.run?.({ args: { file: '/tmp/rule.json', event }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).not.toHaveBeenCalled();
    expect(consolaInfo).toHaveBeenCalledWith(
      expect.stringContaining('NO MATCH'),
      '/payload/winner_id',
      'eq',
      JSON.stringify('lenser-1'),
      JSON.stringify('lenser-2'),
    );
  });

  it('returns NO MATCH on event_type mismatch without evaluating filter', async () => {
    const rule = {
      name: 'rule',
      match_event_type: 'battle.completed',
      action_kind: 'notify',
      action_config: {},
    };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(rule));

    const event = JSON.stringify({ event_type: 'battle.created', payload: {} });

    const cmd = await getSubCmd('test');
    await cmd.run?.({ args: { file: '/tmp/rule.json', event }, cmd: {}, rawArgs: [] });

    expect(consolaInfo).toHaveBeenCalledWith(
      expect.stringContaining('NO MATCH'),
      'battle.created',
      'battle.completed',
    );
  });
});

// ─── enable / disable / delete ────────────────────────────────────────────

describe('automation enable/disable/delete', () => {
  it('enable PATCHes is_active=true', async () => {
    mockCallRest.mockResolvedValueOnce(undefined);
    const cmd = await getSubCmd('enable');
    await cmd.run?.({ args: { id: 'rule-1' }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'PATCH',
      { is_active: true },
      expect.objectContaining({ query: { id: 'eq.rule-1' } }),
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });

  it('disable PATCHes is_active=false', async () => {
    mockCallRest.mockResolvedValueOnce(undefined);
    const cmd = await getSubCmd('disable');
    await cmd.run?.({ args: { id: 'rule-1' }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'PATCH',
      { is_active: false },
      expect.objectContaining({ query: { id: 'eq.rule-1' } }),
    );
  });

  it('delete refuses without --force and does not call REST', async () => {
    const cmd = await getSubCmd('delete');
    await cmd.run?.({ args: { id: 'rule-1', force: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('delete with --force issues DELETE', async () => {
    mockCallRest.mockResolvedValueOnce(undefined);
    const cmd = await getSubCmd('delete');
    await cmd.run?.({ args: { id: 'rule-1', force: true }, cmd: {}, rawArgs: [] });

    expect(mockCallRest).toHaveBeenCalledWith(
      'automation',
      'trigger_rules',
      'DELETE',
      undefined,
      expect.objectContaining({ query: { id: 'eq.rule-1' } }),
    );
  });
});
