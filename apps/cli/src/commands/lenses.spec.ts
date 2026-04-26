// citty and consola are ESM-only; mock with factory so ts-jest never loads the real ESM files
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
import { printTable, printJson } from '../utils/output';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; args?: unknown; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> };

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

async function resolveSubCmd(cmd: AnyCmd, key: string): Promise<AnyCmd> {
  const sub = cmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

describe('lenses browse (default run)', () => {
  it('rejects invalid --sort values', async () => {
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    await lensesCmd.run?.({ args: { sort: 'invalid', tag: '', author: '', community: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(process.exitCode).toBe(1);
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('accepts valid sort values and calls fn_lenses_browse', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    await lensesCmd.run?.({ args: { sort: 'date', tag: '', author: '', community: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lenses_browse', expect.objectContaining({ p_sort: 'date' }), {});
  });

  it('uses printJson when --json flag is set', async () => {
    const mockData = [{ slug: 'my-lens', title: 'My Lens', author_username: 'alice', star_count: 3, published_at: null }];
    mockCallRpc.mockResolvedValueOnce(mockData);
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    await lensesCmd.run?.({ args: { sort: 'date', tag: '', author: '', community: '', limit: '20', offset: '0', json: true }, cmd: {}, rawArgs: [] });
    expect(mockPrintJson).toHaveBeenCalledWith(mockData);
    expect(mockPrintTable).not.toHaveBeenCalled();
  });

  it('calls handleError on RPC failure', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('network'));
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    await lensesCmd.run?.({ args: { sort: 'date', tag: '', author: '', community: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(mockHandleError).toHaveBeenCalled();
  });
});

describe('lenses star', () => {
  it('calls fn_lens_star with unstar=false by default', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    const starCmd = await resolveSubCmd(lensesCmd, 'star');
    await starCmd.run?.({ args: { slug: 'cool-lens', unstar: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lens_star', { p_slug: 'cool-lens', p_unstar: false }, { requireAuth: true });
  });

  it('calls fn_lens_star with unstar=true when --unstar flag is set', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    const starCmd = await resolveSubCmd(lensesCmd, 'star');
    await starCmd.run?.({ args: { slug: 'cool-lens', unstar: true }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lens_star', { p_slug: 'cool-lens', p_unstar: true }, { requireAuth: true });
  });
});

describe('lenses search', () => {
  it('calls fn_lenses_search with the query', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const { default: lensesCmd } = await import('./lenses') as { default: AnyCmd };
    const searchCmd = await resolveSubCmd(lensesCmd, 'search');
    await searchCmd.run?.({ args: { query: 'summarize', tag: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_lenses_search', expect.objectContaining({ p_query: 'summarize' }), {});
  });
});
