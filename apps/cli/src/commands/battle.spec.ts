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

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success;
const consolaInfo = (consola as unknown as { info: jest.Mock }).info;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)> };

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = 0;
});

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: battleCmd } = await import('./battle') as { default: AnyCmd };
  const sub = battleCmd.subCommands?.[key];
  return typeof sub === 'function' ? sub() : (sub as AnyCmd);
}

describe('battle create', () => {
  it('calls fn_battles_create and succeeds', async () => {
    const battle = { id: 'battle-uuid', title: 'My Battle', status: 'draft', slug: 'my-battle' };
    mockCallRpc.mockResolvedValueOnce(battle);

    const createCmd = await getSubCmd('create');
    await createCmd.run?.({
      args: { title: 'My Battle', slug: 'my-battle', task: 'Write a poem', 'rubric-id': '', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_create',
      expect.objectContaining({ p_title: 'My Battle', p_slug: 'my-battle' }),
      { requireAuth: true }
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });
});

describe('battle join', () => {
  it('calls fn_battles_join and prints submission tip', async () => {
    mockCallRpc.mockResolvedValueOnce({ battle_id: 'battle-uuid', joined: true });

    const joinCmd = await getSubCmd('join');
    await joinCmd.run?.({
      args: { id: 'battle-uuid', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_join',
      { p_battle_id: 'battle-uuid' },
      { requireAuth: true }
    );
    expect(consolaSuccess).toHaveBeenCalledWith('Joined battle %s.', 'battle-uuid');
    expect(consolaInfo).toHaveBeenCalledWith(expect.stringContaining('lf battle submit'));
  });

  it('calls handleError when join fails', async () => {
    const err = new Error('Battle not found');
    mockCallRpc.mockRejectedValueOnce(err);

    const joinCmd = await getSubCmd('join');
    await joinCmd.run?.({
      args: { id: 'missing-uuid', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockHandleError).toHaveBeenCalledWith(err);
  });
});

describe('battle submit', () => {
  it('calls fn_battle_submit_contender with text submission', async () => {
    mockCallRpc.mockResolvedValueOnce({ submission_id: 'sub-uuid' });

    const submitCmd = await getSubCmd('submit');
    await submitCmd.run?.({
      args: { id: 'battle-uuid', text: 'My response', url: '', 'run-id': '', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battle_submit_contender',
      expect.objectContaining({
        p_battle_id: 'battle-uuid',
        p_text: 'My response',
        p_source_type: 'text',
      }),
      { requireAuth: true }
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });

  it('uses execution_run source type when --run-id is provided', async () => {
    mockCallRpc.mockResolvedValueOnce({ submission_id: 'sub-uuid' });

    const submitCmd = await getSubCmd('submit');
    await submitCmd.run?.({
      args: { id: 'battle-uuid', text: '', url: '', 'run-id': 'run-xyz', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battle_submit_contender',
      expect.objectContaining({
        p_execution_run_id: 'run-xyz',
        p_source_type: 'execution_run',
      }),
      { requireAuth: true }
    );
  });
});

describe('battle rematch', () => {
  it('resolves slug→id, calls fn_battles_create_rematch, then prints new slug', async () => {
    // 1) parent lookup by slug
    mockCallRest.mockResolvedValueOnce([
      { id: 'parent-uuid', slug: 'my-battle', creator_lenser_id: 'lenser-1' },
    ]);
    // 2) RPC returns new id
    mockCallRpc.mockResolvedValueOnce('child-uuid');
    // 3) child lookup by id → slug
    mockCallRest.mockResolvedValueOnce([{ id: 'child-uuid', slug: 'my-battle-rematch' }]);

    const rematchCmd = await getSubCmd('rematch');
    await rematchCmd.run?.({
      args: { slug: 'my-battle', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);

    // First REST call: lookup parent battle by slug
    expect(mockCallRest).toHaveBeenNthCalledWith(
      1,
      'battles',
      'battles',
      'GET',
      undefined,
      expect.objectContaining({
        requireAuth: true,
        query: expect.objectContaining({
          select: 'id,slug,creator_lenser_id',
          slug: 'eq.my-battle',
          limit: 1,
        }),
      })
    );

    // RPC call uses parent id
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_create_rematch',
      { p_parent_id: 'parent-uuid' },
      { requireAuth: true }
    );

    // Second REST call: resolve new id → new slug
    expect(mockCallRest).toHaveBeenNthCalledWith(
      2,
      'battles',
      'battles',
      'GET',
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({
          id: 'eq.child-uuid',
        }),
      })
    );

    expect(consolaSuccess).toHaveBeenCalledWith('Created rematch: %s', 'my-battle-rematch');
    expect(mockHandleError).not.toHaveBeenCalled();
  });

  it('errors when slug does not resolve to a battle', async () => {
    mockCallRest.mockResolvedValueOnce([]);

    const rematchCmd = await getSubCmd('rematch');
    await rematchCmd.run?.({
      args: { slug: 'missing-slug', json: false },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('missing-slug') })
    );
  });
});

describe('battle open', () => {
  it('calls fn_battles_open', async () => {
    mockCallRpc.mockResolvedValueOnce(null);

    const openCmd = await getSubCmd('open');
    await openCmd.run?.({
      args: { id: 'battle-uuid' },
      cmd: {},
      rawArgs: [],
    });

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_open',
      { p_battle_id: 'battle-uuid' },
      { requireAuth: true }
    );
    expect(consolaSuccess).toHaveBeenCalled();
  });
});
