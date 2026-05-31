import { battleService } from '../../services/battle.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleFinalize } from './battle-finalize';

jest.mock('../../services/battle.service', () => ({ battleService: { finalize: jest.fn() } }));

describe('finalize_battle tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('requires confirm=true', async () => {
    const tool = captureTool(registerBattleFinalize);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1' }));
    expect(env.error?.code).toBe('CONFIRMATION_REQUIRED');
    expect(battleService.finalize).not.toHaveBeenCalled();
  });

  it('succeeds with confirm=true', async () => {
    (battleService.finalize as jest.Mock).mockResolvedValue({ status: 'closed', winner_contender_id: 'c1' });
    const tool = captureTool(registerBattleFinalize);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', confirm: true }));
    expect(env.success).toBe(true);
    expect(battleService.finalize).toHaveBeenCalledWith({}, 'b1');
  });

  it('maps INVALID_TRANSITION McpError', async () => {
    (battleService.finalize as jest.Mock).mockRejectedValue(new McpError('INVALID_TRANSITION', 'illegal'));
    const tool = captureTool(registerBattleFinalize);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', confirm: true }));
    expect(env.error?.code).toBe('INVALID_TRANSITION');
  });

  it('rewrites NOT_FOUND with the battle_id', async () => {
    (battleService.finalize as jest.Mock).mockRejectedValue(new McpError('NOT_FOUND', 'gone'));
    const tool = captureTool(registerBattleFinalize);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1', confirm: true }));
    expect(env.error?.message).toContain('b1');
  });
});
