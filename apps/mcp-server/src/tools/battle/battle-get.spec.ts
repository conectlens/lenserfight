import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleGet } from './battle-get';

jest.mock('../../services/battle.service', () => ({ battleService: { get: jest.fn() } }));

describe('get_battle tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when service returns null', async () => {
    (battleService.get as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerBattleGet);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(env.error?.message).toContain('b1');
  });

  it('wraps battle data in ok envelope', async () => {
    (battleService.get as jest.Mock).mockResolvedValue({ id: 'b1', title: 'T' });
    const tool = captureTool(registerBattleGet);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1' }));
    expect(env.data).toEqual({ id: 'b1', title: 'T' });
  });
});
