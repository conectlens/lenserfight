jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }));
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), start: jest.fn(), success: jest.fn() },
}));
jest.mock('../utils/api', () => ({ callRpc: jest.fn(), handleError: jest.fn() }));
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}));

import { callRpc, handleError } from '../utils/api';
import { printJson, printTable } from '../utils/output';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> };

let connectCmd: AnyCmd;

const baseArgs = {
  target: undefined as string | undefined,
  disconnect: '',
  list: false,
  sync: false,
  json: false,
};

beforeAll(async () => {
  connectCmd = (await import('./connect')).default as AnyCmd;
});

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

afterEach(() => {
  process.exitCode = 0;
});

describe('connect --list', () => {
  it('outputs JSON when --json is set', async () => {
    const rows = [{ slug: 'a', resource_type: 'lens', version: '1', connected_at: null }];
    mockCallRpc.mockResolvedValueOnce(rows);
    await connectCmd.run?.({ args: { ...baseArgs, list: true, json: true } });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connections_list', {}, { requireAuth: true });
    expect(mockPrintJson).toHaveBeenCalledWith(rows);
    expect(mockPrintTable).not.toHaveBeenCalled();
  });

  it('renders a table for human output', async () => {
    mockCallRpc.mockResolvedValueOnce([
      { slug: 'a', resource_type: 'lens', version: '1', connected_at: null },
    ]);
    await connectCmd.run?.({ args: { ...baseArgs, list: true, json: false } });
    expect(mockPrintTable).toHaveBeenCalledTimes(1);
  });
});

describe('connect --sync', () => {
  it('calls fn_connections_sync', async () => {
    mockCallRpc.mockResolvedValueOnce({ synced: 3 });
    await connectCmd.run?.({ args: { ...baseArgs, sync: true } });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connections_sync', {}, { requireAuth: true });
  });
});

describe('connect --disconnect', () => {
  it('calls fn_lens_disconnect with the slug', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    await connectCmd.run?.({ args: { ...baseArgs, disconnect: 'old-lens' } });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lens_disconnect', { p_slug: 'old-lens' }, { requireAuth: true });
  });
});

describe('connect <target>', () => {
  it('calls fn_lens_connect with the slug', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    await connectCmd.run?.({ args: { ...baseArgs, target: 'new-lens' } });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lens_connect', { p_slug: 'new-lens' }, { requireAuth: true });
  });

  it('sets exit code 1 and skips RPC when no target/flag is given', async () => {
    await connectCmd.run?.({ args: { ...baseArgs } });
    expect(process.exitCode).toBe(1);
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('routes RPC failures to handleError', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('boom'));
    await connectCmd.run?.({ args: { ...baseArgs, target: 'new-lens' } });
    expect(mockHandleError).toHaveBeenCalled();
  });
});
