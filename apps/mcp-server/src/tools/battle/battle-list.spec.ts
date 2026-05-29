import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleList } from './battle-list';

jest.mock('../../services/battle.service', () => ({ battleService: { list: jest.fn() } }));

describe('list_battles tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('forwards filters to service', async () => {
    (battleService.list as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerBattleList);
    await tool.handler({ status: 'open', battle_type: 'ai_vs_ai' });
    expect(battleService.list).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: 'open', battle_type: 'ai_vs_ai', limit: 20, offset: 0,
    }));
  });

  it('wraps paginated envelope', async () => {
    (battleService.list as jest.Mock).mockResolvedValue({ items: [{ id: 'b1' }], total: 1 });
    const tool = captureTool(registerBattleList);
    const env = parseEnvelope(await tool.handler({}));
    expect(env.success).toBe(true);
    const data = env.data as { items: unknown[]; total: number };
    expect(data.items).toEqual([{ id: 'b1' }]);
    expect(data.total).toBe(1);
  });
});
