import { lensService } from '../../services/lens.service';
import { captureTool, parseEnvelope } from '../../__tests__/tool-harness';
import { registerLensFindAndRun } from './lens-find-and-run';

jest.mock('../../services/lens.service', () => ({
  lensService: { search: jest.fn(), resolveTemplate: jest.fn() },
}));

const PARAM_A = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('find_and_run_lens tool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('status=no_match when search returns empty', async () => {
    (lensService.search as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    const tool = captureTool(registerLensFindAndRun);
    const env = parseEnvelope(await tool.handler({ query: 'unknown' }));
    expect(env.success).toBe(true);
    const data = env.data as { status: string };
    expect(data.status).toBe('no_match');
    expect(lensService.resolveTemplate).not.toHaveBeenCalled();
  });

  it('status=needs_params when top hit has missing required params', async () => {
    (lensService.search as jest.Mock).mockResolvedValue({
      items: [{ id: 'l1', title: 'T', description: 'd', author_handle: 'a', head_version_id: 'v' }],
      total: 1,
    });
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v', template_body: `[[:${PARAM_A}]]`,
      parameters: [{ id: PARAM_A, label: 'Name', optional: false }],
      title: 'T', description: 'd',
    });
    const tool = captureTool(registerLensFindAndRun);
    const env = parseEnvelope(await tool.handler({ query: 'x' }));
    const data = env.data as { status: string; missing: string[] };
    expect(data.status).toBe('needs_params');
    expect(data.missing).toEqual(['Name']);
  });

  it('status=ready when all params supplied', async () => {
    (lensService.search as jest.Mock).mockResolvedValue({
      items: [{ id: 'l1', title: 'T', description: 'd', author_handle: 'a', head_version_id: 'v' }],
      total: 1,
    });
    (lensService.resolveTemplate as jest.Mock).mockResolvedValue({
      version_id: 'v', template_body: `Hi [[:${PARAM_A}]]`,
      parameters: [{ id: PARAM_A, label: 'Name', optional: false }],
      title: 'T', description: 'd',
    });
    const tool = captureTool(registerLensFindAndRun);
    const env = parseEnvelope(await tool.handler({ query: 'x', param_values: { Name: 'Sky' } }));
    const data = env.data as { status: string; resolved_prompt: string };
    expect(data.status).toBe('ready');
    expect(data.resolved_prompt).toBe('Hi Sky');
  });
});
