import { battleService } from '../../services/battle.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerBattleCreate } from './battle-create';

jest.mock('../../services/battle.service', () => ({
  battleService: { create: jest.fn(), updateConfig: jest.fn() },
}));

describe('create_battle tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('creates battle and applies config when defaults exist', async () => {
    (battleService.create as jest.Mock).mockResolvedValue('b1');
    (battleService.updateConfig as jest.Mock).mockResolvedValue(undefined);
    const tool = captureTool(registerBattleCreate);
    const env = parseEnvelope(await tool.handler({ title: 'My Battle', task_prompt: 'Write a poem' }));
    expect(env.success).toBe(true);
    const data = env.data as { id: string; title: string };
    expect(data).toEqual({ id: 'b1', title: 'My Battle' });
    expect(battleService.updateConfig).toHaveBeenCalled();
  });

  it('passes a slug derived from the title', async () => {
    (battleService.create as jest.Mock).mockResolvedValue('b1');
    const tool = captureTool(registerBattleCreate);
    await tool.handler({ title: 'My Cool Battle!', task_prompt: 'p' });
    const slug = (battleService.create as jest.Mock).mock.calls[0][1].slug;
    expect(slug.startsWith('my-cool-battle-')).toBe(true);
  });
});
