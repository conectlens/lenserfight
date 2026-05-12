// Phase BB — gateway daemons subcommand group tests.
//
// citty and consola are ESM-only; mock with factory so ts-jest never loads the
// real ESM files. We also mock the heavyweight modules (keychain, signing,
// infra/gateway) that gateway.ts pulls in but the daemons group does not use.

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
    box: jest.fn(),
    prompt: jest.fn(),
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
jest.mock('@lenserfight/utils/keychain', () => ({ keychain: { getSecret: jest.fn(), setSecret: jest.fn(), deleteSecret: jest.fn() } }));
jest.mock('@lenserfight/utils/signing', () => ({ generateEd25519Keypair: jest.fn(() => ({ publicKey: 'pk', privateKey: 'sk' })) }));
jest.mock('@lenserfight/infra/gateway', () => ({ detectTailscaleInterfaces: jest.fn(() => []) }));

import consola from 'consola';
import { callRpc } from '../utils/api';
import { printJson, printTable } from '../utils/output';
import gatewayCmd from './gateway';

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>;
const mockConsola = consola as unknown as {
  info: jest.Mock;
  warn: jest.Mock;
  success: jest.Mock;
  prompt: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, AnyCmd> };

function sub(parent: AnyCmd, key: string): AnyCmd {
  const s = parent.subCommands?.[key];
  if (!s) throw new Error(`missing subcommand ${key}`);
  return s as AnyCmd;
}

const DEV = 'cccccccc-bb01-cccc-cccc-cccccccccccc';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('gateway daemons list', () => {
  it('prints empty-state when no daemons', async () => {
    mockCallRpc.mockResolvedValueOnce([]);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'list');
    await cmd.run!({ args: { limit: '50', json: false } });
    expect(mockConsola.info).toHaveBeenCalledWith(expect.stringContaining('No gateway daemons'));
    expect(mockPrintTable).not.toHaveBeenCalled();
  });

  it('renders a table for daemons', async () => {
    mockCallRpc.mockResolvedValueOnce([
      {
        device_id: DEV,
        hostname: 'host-a',
        daemon_version: '0.1.0',
        last_seen_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        revoked_at: null,
        kill_switch: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'list');
    await cmd.run!({ args: { limit: '50', json: false } });
    expect(mockPrintTable).toHaveBeenCalledTimes(1);
    const [headers, rows] = mockPrintTable.mock.calls[0];
    expect(headers).toEqual(['Device', 'Host', 'Version', 'Last Seen', 'Approved', 'Kill']);
    expect(rows[0][0]).toBe(DEV.substring(0, 8));
    expect(rows[0][4]).toBe('yes');
  });

  it('outputs JSON when --json', async () => {
    const row = {
      device_id: DEV,
      hostname: 'host-a',
      daemon_version: '0.1.0',
      last_seen_at: null,
      approved_at: null,
      revoked_at: null,
      kill_switch: false,
      created_at: new Date().toISOString(),
    };
    mockCallRpc.mockResolvedValueOnce([row]);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'list');
    await cmd.run!({ args: { limit: '50', json: true } });
    expect(mockPrintJson).toHaveBeenCalledWith([row]);
    expect(mockPrintTable).not.toHaveBeenCalled();
  });
});

describe('gateway daemons approve', () => {
  it('calls fn_gateway_approve_device with the device id', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as unknown as void);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'approve');
    await cmd.run!({ args: { id: DEV } });
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_gateway_approve_device',
      { p_device_id: DEV },
      { requireAuth: true }
    );
    expect(mockConsola.success).toHaveBeenCalled();
  });
});

describe('gateway daemons revoke', () => {
  it('prompts unless --force', async () => {
    mockConsola.prompt.mockResolvedValueOnce(false);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'revoke');
    await cmd.run!({ args: { id: DEV, force: false } });
    expect(mockConsola.prompt).toHaveBeenCalled();
    expect(mockCallRpc).not.toHaveBeenCalled();
  });

  it('skips prompt and revokes with --force', async () => {
    mockCallRpc.mockResolvedValueOnce(undefined as unknown as void);
    const cmd = sub(sub(gatewayCmd as unknown as AnyCmd, 'daemons'), 'revoke');
    await cmd.run!({ args: { id: DEV, force: true } });
    expect(mockConsola.prompt).not.toHaveBeenCalled();
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_gateway_revoke_device',
      { p_device_id: DEV },
      { requireAuth: true }
    );
    expect(mockConsola.success).toHaveBeenCalled();
  });
});
