// citty and consola are ESM-only; mock with factory so ts-jest never loads the real ESM files
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
import { callRpc, callRest, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;
const mockConsola = consola as unknown as { info: jest.Mock; error: jest.Mock };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; args?: unknown; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> };

async function resolveSubCmd(cmd: AnyCmd, key: string): Promise<AnyCmd> {
  const sub = cmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

const FAKE_PROFILE_ID = 'profile-uuid-111';
const FAKE_AI_LENSER_ID = 'ai-lenser-uuid-222';

const FAKE_SUMMARY = {
  cost_by_model: [
    { model_key: 'gpt-4o', provider: 'openai', total_credits: 42, total_tokens_in: 100, total_tokens_out: 200, run_count: 5 },
  ],
  cost_time_series: [
    { period_date: '2026-04-01', total_credits: 42 },
  ],
  eval_quality: [
    { period_date: '2026-04-01', evaluation_name: 'tone', pass_rate: 0.9, mean_score: 0.85 },
  ],
  workflow_perf: [
    { period_date: '2026-04-01', workflow_title: 'Main Flow', p50_duration_ms: 300, p95_duration_ms: 900, failure_rate: 0.02 },
  ],
};

/** Set up callRest to resolve profile → ai_lenser successfully. */
function mockHandleResolution() {
  mockCallRest
    .mockResolvedValueOnce([{ id: FAKE_PROFILE_ID }])   // profiles lookup
    .mockResolvedValueOnce([{ id: FAKE_AI_LENSER_ID }]) // ai_lensers lookup
}

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

describe('analytics summary', () => {
  it('calls fn_get_agent_analytics_summary with correct param names and p_days as a number', async () => {
    mockHandleResolution();
    mockCallRpc.mockResolvedValueOnce(FAKE_SUMMARY);

    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'myagent', days: '30', json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_agent_analytics_summary',
      {
        p_ai_lenser_id: FAKE_AI_LENSER_ID,
        p_days: 30,
        p_model_key: null,
        p_workflow_id: null,
      },
      { requireAuth: true }
    );
  });

  it('parses --days 7 as integer 7 in the RPC call', async () => {
    mockHandleResolution();
    mockCallRpc.mockResolvedValueOnce(FAKE_SUMMARY);

    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'myagent', days: '7', json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_agent_analytics_summary',
      expect.objectContaining({ p_days: 7 }),
      { requireAuth: true }
    );
    expect(typeof (mockCallRpc.mock.calls[0][1] as Record<string, unknown>)['p_days']).toBe('number');
  });

  it('rejects a non-numeric --days without resolving the handle or calling the RPC', async () => {
    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'myagent', days: 'abc', json: false }, cmd: {}, rawArgs: [] });

    expect(process.exitCode).toBe(1);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(mockCallRest).not.toHaveBeenCalled();
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('calls printJson and does NOT call printTable when --json is set', async () => {
    mockHandleResolution();
    mockCallRpc.mockResolvedValueOnce(FAKE_SUMMARY);

    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'myagent', days: '30', json: true }, cmd: {}, rawArgs: [] });

    expect(mockPrintJson).toHaveBeenCalledWith(FAKE_SUMMARY);
    expect(mockPrintTable).not.toHaveBeenCalled();
  });

  it('calls handleError when callRpc throws', async () => {
    mockHandleResolution();
    const rpcError = new Error('RPC failed');
    mockCallRpc.mockRejectedValueOnce(rpcError);

    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'myagent', days: '30', json: false }, cmd: {}, rawArgs: [] });

    expect(mockHandleError).toHaveBeenCalledWith(rpcError);
  });

  it('calls handleError when handle resolves to no AI agent', async () => {
    // Profile found, but no ai_lensers row
    mockCallRest
      .mockResolvedValueOnce([{ id: FAKE_PROFILE_ID }]) // profiles lookup succeeds
      .mockResolvedValueOnce([])                         // ai_lensers — empty → throws

    const { default: cmd } = await import('./analytics') as { default: AnyCmd };
    const summaryCmd = await resolveSubCmd(cmd, 'summary');
    await summaryCmd.run?.({ args: { handle: 'ghostagent', days: '30', json: false }, cmd: {}, rawArgs: [] });

    expect(mockCallRpc).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('No AI agent found for @ghostagent') })
    );
  });
});
