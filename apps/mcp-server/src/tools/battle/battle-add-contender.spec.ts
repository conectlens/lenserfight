import { battleService } from '../../services/battle.service';
import { McpError } from '../../services/mcp-error';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleAddContender } from './battle-add-contender';

jest.mock('../../services/battle.service', () => ({ battleService: { addContender: jest.fn() } }));

describe('add_battle_contender tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('passes slot=null when omitted', async () => {
    (battleService.addContender as jest.Mock).mockResolvedValue({ contender_id: 'c1' });
    const tool = captureTool(registerBattleAddContender);
    await tool.handler({
      battle_id: 'b', display_name: 'n', contender_type: 'human', contender_ref_id: 'r',
    });
    expect(battleService.addContender).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ slot: null }));
  });

  it('surfaces SLOTS_FULL error', async () => {
    (battleService.addContender as jest.Mock).mockRejectedValue(new McpError('SLOTS_FULL', 'full'));
    const tool = captureTool(registerBattleAddContender);
    const env = parseEnvelope(await tool.handler({
      battle_id: 'b', display_name: 'n', contender_type: 'human', contender_ref_id: 'r',
    }));
    expect(env.error?.code).toBe('SLOTS_FULL');
  });
});
