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

async function resolveSubCmd(cmd: AnyCmd, key: string): Promise<AnyCmd> {
  const sub = cmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

describe('connectors list', () => {
  it('calls fn_connectors_list with requireAuth', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const listCmd = await resolveSubCmd(cmd, 'list');
    await listCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connectors_list', {}, { requireAuth: true });
  });

  it('uses printJson when --json is set', async () => {
    const data = [{ slug: 'my-svc', name: 'My Svc', scopes: ['lenses:read'], is_active: true, created_at: null }];
    mockCallRpc.mockResolvedValueOnce(data);
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const listCmd = await resolveSubCmd(cmd, 'list');
    await listCmd.run?.({ args: { json: true }, cmd: {}, rawArgs: [] });
    expect(mockPrintJson).toHaveBeenCalledWith(data);
    expect(mockPrintTable).not.toHaveBeenCalled();
  });

  it('delegates RPC failures to handleError', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('rpc error'));
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const listCmd = await resolveSubCmd(cmd, 'list');
    await listCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });
    expect(mockHandleError).toHaveBeenCalled();
  });
});

describe('connectors add', () => {
  it('rejects unknown scopes and sets exitCode 1', async () => {
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const addCmd = await resolveSubCmd(cmd, 'add');
    await addCmd.run?.({ args: { name: 'Test', slug: 'test', description: '', scopes: 'lenses:read,invalid:scope', json: false }, cmd: {}, rawArgs: [] });
    expect(process.exitCode).toBe(1);
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('calls fn_connector_create with parsed scopes array', async () => {
    mockCallRpc.mockResolvedValueOnce({ slug: 'test', service_token: 'tok_abc' });
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const addCmd = await resolveSubCmd(cmd, 'add');
    await addCmd.run?.({ args: { name: 'Test', slug: 'test', description: '', scopes: 'lenses:read,agents:read', json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_connector_create',
      expect.objectContaining({ p_scopes: ['lenses:read', 'agents:read'] }),
      { requireAuth: true }
    );
  });
});

describe('connectors rotate', () => {
  it('calls fn_connector_rotate for the given slug', async () => {
    mockCallRpc.mockResolvedValueOnce({ service_token: 'tok_new' });
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const rotateCmd = await resolveSubCmd(cmd, 'rotate');
    await rotateCmd.run?.({ args: { slug: 'my-svc', json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connector_rotate', { p_slug: 'my-svc' }, { requireAuth: true });
  });
});

describe('connectors remove', () => {
  it('calls fn_connector_remove', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const removeCmd = await resolveSubCmd(cmd, 'remove');
    await removeCmd.run?.({ args: { slug: 'old-svc' }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connector_remove', { p_slug: 'old-svc' }, { requireAuth: true });
  });
});
