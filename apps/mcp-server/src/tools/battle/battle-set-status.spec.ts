import { battleService } from '../../services/battle.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleSetStatus } from './battle-set-status';

jest.mock('../../services/battle.service', () => ({ battleService: { setStatus: jest.fn() } }));

describe('set_battle_status tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('requires confirm=true for closed/archived', async () => {
    const tool = captureTool(registerBattleSetStatus);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', status: 'archived' }));
    expect(env.error?.code).toBe('CONFIRMATION_REQUIRED');
    expect(battleService.setStatus).not.toHaveBeenCalled();
  });

  it('allows non-destructive transitions without confirm', async () => {
    (battleService.setStatus as jest.Mock).mockResolvedValue({ status: 'open' });
    const tool = captureTool(registerBattleSetStatus);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', status: 'open' }));
    expect(env.success).toBe(true);
  });

  it('maps INVALID_TRANSITION McpError', async () => {
    (battleService.setStatus as jest.Mock).mockRejectedValue(new McpError('INVALID_TRANSITION', 'illegal'));
    const tool = captureTool(registerBattleSetStatus);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', status: 'open' }));
    expect(env.error?.code).toBe('INVALID_TRANSITION');
  });

  it('rewrites NOT_FOUND with the battle_id', async () => {
    (battleService.setStatus as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'gone'));
    const tool = captureTool(registerBattleSetStatus);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', status: 'open' }));
    expect(env.error?.message).toContain('b1');
  });
});
