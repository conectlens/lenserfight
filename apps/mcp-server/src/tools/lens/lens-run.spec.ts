import { lensService } from '../../services/lens.service';
import { workflowService } from '../../services/workflow.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensRun } from './lens-run';

jest.mock('../../services/lens.service', () => ({
  lensService: { resolveTemplate: jest.fn() },
}));
jest.mock('../../services/workflow.service', () => ({
  workflowService: { startRun: jest.fn() },
}));

const PARAM_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const PARAM_B = 'aaaaaaaa-0000-0000-0000-000000000002';

describe('run_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('NOT_FOUND when service returns null', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue(null);
    const tool = captureTool(registerLensRun);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1' }));
    expect(env.error?.code).toBe('NOT_FOUND');
    expect(workflowService.startRun).not.toHaveBeenCalled();
  });

  it('MISSING_PARAMS when required token has no value', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v1',
      template_body: `Hello [[:${PARAM_A}]]`,
      parameters: [{ id: PARAM_A, label: 'Name', optional: false }],
      title: 'Greeter',
    });
    const tool = captureTool(registerLensRun);
    const env = parseEnvelope(await tool.handler({ lens_id: 'l1', param_values: {} }));
    expect(env.error?.code).toBe('MISSING_PARAMS');
    const details = env.error?.details as { missing: string[] };
    expect(details.missing).toEqual(['Name']);
  });

  it('returns resolved_prompt with persisted=false when no workflow_id', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v1',
      template_body: `Hi [[:${PARAM_A}]] in [[:${PARAM_B}]]`,
      parameters: [
        { id: PARAM_A, label: 'Name', optional: false },
        { id: PARAM_B, label: 'Lang', optional: false },
      ],
    });
    const tool = captureTool(registerLensRun);
    const env = parseEnvelope(
      await tool.handler({ lens_id: 'l1', param_values: { Name: 'Sky', Lang: 'EN' } })
    );
    const data = env.data as { resolved_prompt: string; persisted: boolean; run_id: string | null };
    expect(data.resolved_prompt).toBe('Hi Sky in EN');
    expect(data.persisted).toBe(false);
    expect(data.run_id).toBeNull();
  });

  it('persists workflow run when workflow_id is supplied', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v1', template_body: 'x', parameters: [],
    });
    (workflowService.startRun as jest.Mock).mockResolvedValue({ id: 'run-1' });
    const tool = captureTool(registerLensRun);
    const env = parseEnvelope(
      await tool.handler({ lens_id: 'l1', workflow_id: 'w1', param_values: {} })
    );
    const data = env.data as { persisted: boolean; run_id: string };
    expect(data.persisted).toBe(true);
    expect(data.run_id).toBe('run-1');
  });

  it('swallows workflow.startRun errors so resolution still returns', async () => {
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v1', template_body: 'x', parameters: [],
    });
    (workflowService.startRun as jest.Mock).mockRejectedValue(new Error('rpc fail'));
    const tool = captureTool(registerLensRun);
    const env = parseEnvelope(
      await tool.handler({ lens_id: 'l1', workflow_id: 'w1', param_values: {} })
    );
    expect(env.success).toBe(true);
    const data = env.data as { persisted: boolean };
    expect(data.persisted).toBe(false);
  });
});
