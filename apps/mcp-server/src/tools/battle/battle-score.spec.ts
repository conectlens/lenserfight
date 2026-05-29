import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleScore } from './battle-score';

jest.mock('../../services/battle.service', () => ({ battleService: { score: jest.fn() } }));

describe('get_battle_score tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('wraps score payload in ok envelope', async () => {
    (battleService.score as jest.Mock).mockResolvedValue({ vote_aggregates: [{ contender_id: 'c1', vote_count: 3 }] });
    const tool = captureTool(registerBattleScore);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b1' }));
    expect(env.success).toBe(true);
    const data = env.data as { vote_aggregates: { contender_id: string }[] };
    expect(data.vote_aggregates[0].contender_id).toBe('c1');
  });
});
