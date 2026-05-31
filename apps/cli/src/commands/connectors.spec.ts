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

// Tests below intentionally set process.exitCode to assert CLI exit behavior.
// Reset it afterwards so a non-zero value doesn't leak into Jest's own process
// exit code and fail the run.
afterEach(() => {
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

  it('delegates non-scope RPC failures to handleError (exit 1)', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('rpc error'));
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const listCmd = await resolveSubCmd(cmd, 'list');
    await listCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });
    expect(mockHandleError).toHaveBeenCalled();
  });

  it('maps SQLSTATE 42501 to friendly scope error and exits with code 2', async () => {
    const scopeErr = Object.assign(new Error('agents:write required'), {
      code: '42501',
      status: 403,
    });
    mockCallRpc.mockRejectedValueOnce(scopeErr);
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const listCmd = await resolveSubCmd(cmd, 'list');
    await listCmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] });
    expect(process.exitCode).toBe(2);
    expect(mockHandleError).not.toHaveBeenCalled();
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

  it('trims whitespace and ignores empty entries in --scopes', async () => {
    mockCallRpc.mockResolvedValueOnce({ slug: 'test', service_token: 'tok_abc' });
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const addCmd = await resolveSubCmd(cmd, 'add');
    await addCmd.run?.({ args: { name: 'Test', slug: 'test', description: '', scopes: ' lenses:read , , agents:read ', json: false }, cmd: {}, rawArgs: [] });
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

describe('connectors test', () => {
  it('reports latency on ok response', async () => {
    mockCallRpc.mockResolvedValueOnce({ ok: true, latency_ms: 42, scopes: ['lenses:read'] });
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const testCmd = await resolveSubCmd(cmd, 'test');
    await testCmd.run?.({ args: { slug: 'demo' }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_connector_test', { p_slug: 'demo' }, { requireAuth: true });
  });

  it('maps scope error (SQLSTATE 42501) to exit code 2', async () => {
    mockCallRpc.mockRejectedValueOnce(Object.assign(new Error('connectors:read required'), { code: '42501' }));
    const { default: cmd } = await import('./connectors') as { default: AnyCmd };
    const testCmd = await resolveSubCmd(cmd, 'test');
    await testCmd.run?.({ args: { slug: 'demo' }, cmd: {}, rawArgs: [] });
    expect(process.exitCode).toBe(2);
    expect(mockHandleError).not.toHaveBeenCalled();
  });
});
