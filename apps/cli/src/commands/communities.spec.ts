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
jest.mock('../config/project-config', () => ({
  loadUserConfig: jest.fn(() => ({})),
  saveUserConfig: jest.fn(),
  resolveConfig: jest.fn(() => ({ mode: 'local', supabaseUrl: 'http://127.0.0.1:54321', supabaseAnonKey: 'anon' })),
}));
jest.mock('../lib/safety', () => ({
  assertSafe: jest.fn(async (opts: { hasForce?: boolean }) => {
    if (!opts.hasForce) {
      process.exitCode = 1
      throw new Error('aborted by safety gate')
    }
  }),
}));

import { callRpc, handleError } from '../utils/api';
import { printJson } from '../utils/output';
import { saveUserConfig } from '../config/project-config';
import { assertSafe } from '../lib/safety';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockSaveUserConfig = saveUserConfig as jest.MockedFunction<typeof saveUserConfig>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;
const mockAssertSafe = assertSafe as jest.MockedFunction<typeof assertSafe>;

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

describe('communities list (default run)', () => {
  it('calls fn_communities_list', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    await cmd.run?.({ args: { query: '', sort: 'date', tag: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_communities_list', expect.objectContaining({ p_sort: 'date' }), {});
  });

  it('outputs JSON when --json is set', async () => {
    const data = [{ slug: 'test', name: 'Test', member_count: 1, is_private: false, created_at: null }];
    mockCallRpc.mockResolvedValueOnce(data);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    await cmd.run?.({ args: { query: '', sort: 'date', tag: '', limit: '20', offset: '0', json: true }, cmd: {}, rawArgs: [] });
    expect(mockPrintJson).toHaveBeenCalledWith(data);
  });

  it('delegates RPC failures to handleError', async () => {
    mockCallRpc.mockRejectedValueOnce(new Error('rpc error'));
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    await cmd.run?.({ args: { query: '', sort: 'date', tag: '', limit: '20', offset: '0', json: false }, cmd: {}, rawArgs: [] });
    expect(mockHandleError).toHaveBeenCalled();
  });
});

describe('communities delete', () => {
  it('aborts without --confirm', async () => {
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const delCmd = await resolveSubCmd(cmd, 'delete');
    await expect(delCmd.run?.({ args: { slug: 'my-community', confirm: false }, cmd: {}, rawArgs: [] }))
      .rejects.toThrow('aborted by safety gate');
    expect(mockAssertSafe).toHaveBeenCalledWith(expect.objectContaining({ hasForce: false }));
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('calls fn_community_delete with --confirm', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const delCmd = await resolveSubCmd(cmd, 'delete');
    await delCmd.run?.({ args: { slug: 'my-community', confirm: true }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_community_delete', { p_slug: 'my-community' }, { requireAuth: true });
  });
});

describe('communities switch', () => {
  it('saves communitySlug to user config on success', async () => {
    mockCallRpc.mockResolvedValueOnce({ slug: 'acme', name: 'Acme' });
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const switchCmd = await resolveSubCmd(cmd, 'switch');
    await switchCmd.run?.({ args: { slug: 'acme' }, cmd: {}, rawArgs: [] });
    expect(mockSaveUserConfig).toHaveBeenCalledWith(expect.objectContaining({ communitySlug: 'acme' }));
  });

  it('sets exitCode 1 when community not found', async () => {
    mockCallRpc.mockResolvedValueOnce(null);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const switchCmd = await resolveSubCmd(cmd, 'switch');
    await switchCmd.run?.({ args: { slug: 'ghost' }, cmd: {}, rawArgs: [] });
    expect(process.exitCode).toBe(1);
    expect(mockSaveUserConfig).not.toHaveBeenCalled();
  });
});

describe('communities join / leave', () => {
  it('calls fn_community_join', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const joinCmd = await resolveSubCmd(cmd, 'join');
    await joinCmd.run?.({ args: { slug: 'test-community' }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_community_join', { p_slug: 'test-community' }, { requireAuth: true });
  });

  it('calls fn_community_leave', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined);
    const { default: cmd } = await import('./communities') as { default: AnyCmd };
    const leaveCmd = await resolveSubCmd(cmd, 'leave');
    await leaveCmd.run?.({ args: { slug: 'test-community' }, cmd: {}, rawArgs: [] });
    expect(mockCallRpc).toHaveBeenCalledWith('fn_community_leave', { p_slug: 'test-community' }, { requireAuth: true });
  });
});
