import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleSubmitRun } from './battle-submit-run';

jest.mock('../../services/battle.service', () => ({ battleService: { submitRun: jest.fn() } }));

describe('submit_battle_run tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns service result in ok envelope', async () => {
    (battleService.submitRun as jest.Mock).mockResolvedValue({ submitted: true, submission_id: 'sub1' });
    const tool = captureTool(registerBattleSubmitRun);
    const env = parseEnvelope(await tool.handler({ battle_id: 'b', contender_id: 'c', content_text: 'hi' }));
    expect(env.data).toEqual({ submitted: true, submission_id: 'sub1' });
  });
});
