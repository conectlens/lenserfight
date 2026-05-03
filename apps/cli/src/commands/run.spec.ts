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
jest.mock('../config/project-config', () => ({
  resolveConfig: jest.fn(() => ({ defaultAdapterId: '', authToken: '' })),
}));
jest.mock('@lenserfight/providers', () => ({
  getAdapter: jest.fn(),
  getStreamAdapter: jest.fn(),
  byokKeyResolver: { resolve: jest.fn() },
  OLLAMA_DEFAULT_BASE_URL: 'http://localhost:11434',
}));

import consola from 'consola';
import { callRpc, callRest } from '../utils/api';
import { byokKeyResolver, getAdapter, getStreamAdapter } from '@lenserfight/providers';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>;
const mockResolveKey = byokKeyResolver.resolve as jest.MockedFunction<typeof byokKeyResolver.resolve>;
const mockGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockGetStreamAdapter = getStreamAdapter as jest.MockedFunction<typeof getStreamAdapter>;
const consolaInfo = (consola as unknown as { info: jest.Mock }).info;

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

describe('run full --dry-run', () => {
  it('prints 6 steps and makes no RPC calls', async () => {
    const { default: runCmd } = await import('./run') as { default: AnyCmd };
    const fullCmd = await resolveSubCmd(runCmd, 'full');

    await fullCmd.run?.({
      args: { id: 'battle-uuid', adapter: '', 'dry-run': true },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockCallRpc).not.toHaveBeenCalled();
    expect(consolaInfo).toHaveBeenCalledWith('[dry-run] [step 1/6] Fetch battle and verify status is open');
    expect(consolaInfo).toHaveBeenCalledWith('[dry-run] [step 6/6] Finalize and publish results');
  });
});

describe('run replay --dry-run', () => {
  it('fetches the original run and prints inputs without starting a new run', async () => {
    mockCallRpc.mockResolvedValueOnce({
      workflow_id: 'wf-123',
      context_inputs: { foo: 'bar' },
      status: 'completed',
    });

    const { default: runCmd } = await import('./run') as { default: AnyCmd };
    const replayCmd = await resolveSubCmd(runCmd, 'replay');

    await replayCmd.run?.({
      args: { id: 'run-uuid', adapter: '', 'dry-run': true },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockCallRpc).toHaveBeenCalledWith('fn_get_workflow_run', { p_run_id: 'run-uuid' }, { requireAuth: true });
    expect(consolaInfo).toHaveBeenCalledWith('[dry-run] Would replay run: %s', 'run-uuid');
    expect(consolaInfo).toHaveBeenCalledWith('[dry-run] Workflow:        %s', 'wf-123');
    // Must NOT call fn_start_workflow_run
    expect(mockCallRpc).not.toHaveBeenCalledWith('fn_start_workflow_run', expect.anything(), expect.anything());
  });

  it('exits 1 when the source run is not found', async () => {
    mockCallRpc.mockResolvedValueOnce(null);

    const { default: runCmd } = await import('./run') as { default: AnyCmd };
    const replayCmd = await resolveSubCmd(runCmd, 'replay');

    await replayCmd.run?.({
      args: { id: 'missing-run', adapter: '', 'dry-run': false },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(1);
  });
});

describe('run exec --dry-run', () => {
  it('exits 0 with no AI provider credentials in env', async () => {
    const originalEnv = { ...process.env };
    for (const key of Object.keys(process.env)) {
      if (key.endsWith('_API_KEY')) delete process.env[key];
    }

    try {
      const { default: runCmd } = await import('./run') as { default: AnyCmd };
      const execCmd = await resolveSubCmd(runCmd, 'exec');

      await execCmd.run?.({
        args: {
          prompt: 'hello',
          model: 'gpt-4o-mini',
          ollama: false,
          'base-url': '',
          byok: '',
          key: '',
          system: '',
          stream: false,
          'dry-run': true,
        },
        cmd: {},
        rawArgs: [],
      });

      expect(process.exitCode).toBe(0);
      expect(mockCallRpc).not.toHaveBeenCalled();
      expect(mockCallRest).not.toHaveBeenCalled();
      expect(mockResolveKey).not.toHaveBeenCalled();
      expect(mockGetAdapter).not.toHaveBeenCalled();
      expect(mockGetStreamAdapter).not.toHaveBeenCalled();
      expect(consolaInfo).toHaveBeenCalledWith('[dry-run] mode:   %s', 'cloud');
    } finally {
      for (const [k, v] of Object.entries(originalEnv)) {
        if (v !== undefined) process.env[k] = v;
      }
    }
  });

  it('reports byok mode without resolving any API key', async () => {
    const { default: runCmd } = await import('./run') as { default: AnyCmd };
    const execCmd = await resolveSubCmd(runCmd, 'exec');

    await execCmd.run?.({
      args: {
        prompt: 'hello',
        model: 'claude-sonnet-4-6',
        ollama: false,
        'base-url': '',
        byok: 'anthropic',
        key: '',
        system: '',
        stream: false,
        'dry-run': true,
      },
      cmd: {},
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    expect(mockResolveKey).not.toHaveBeenCalled();
    expect(consolaInfo).toHaveBeenCalledWith('[dry-run] mode:   %s', 'byok/anthropic');
  });
});
