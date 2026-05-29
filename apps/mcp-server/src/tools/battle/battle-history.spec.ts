import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleHistory } from './battle-history';

jest.mock('../../services/battle.service', () => ({ battleService: { history: jest.fn() } }));

describe('get_battle_history tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('uses default limit=20 offset=0', async () => {
    (battleService.history as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerBattleHistory);
    await tool.handler({ lenser_id: 'L' });
    expect(battleService.history).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      lenser_id: 'L', limit: 20, offset: 0,
    }));
  });

  it('paginated envelope with has_more', async () => {
    (battleService.history as jest.Mock).mockResolvedValue({ items: [{ id: 'h1' }], total: 100 });
    const tool = captureTool(registerBattleHistory);
    const env = parseEnvelope(await tool.handler({ lenser_id: 'L', limit: 1 }));
    const data = env.data as { has_more: boolean; total: number };
    expect(data.has_more).toBe(true);
    expect(data.total).toBe(100);
  });
});
