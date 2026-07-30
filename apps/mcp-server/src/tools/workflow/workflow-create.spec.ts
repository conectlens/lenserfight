import { captureTool, parseEnvelope } from '../../__tests__/tool-harness'
import { McpError } from '../../services/mcp-error'
import { workflowService } from '../../services/workflow.service'

import { registerWorkflowCreate } from './workflow-create'

jest.mock('../../services/workflow.service', () => ({ workflowService: { create: jest.fn() } }))
jest.mock('../../config', () => ({ getConfig: () => ({ lenserId: null }) }))

const VALID_UUID = 'aaaaaaaa-0000-0000-0000-000000000001'

describe('create_workflow tool', () => {
  const originalEnv = process.env.LENSERFIGHT_LENSER_ID
  beforeEach(() => jest.resetAllMocks())
  afterEach(() => {
    if (originalEnv) process.env.LENSERFIGHT_LENSER_ID = originalEnv
    else delete process.env.LENSERFIGHT_LENSER_ID
  })

  it('MISSING_LENSER when neither arg nor env is set', async () => {
    delete process.env.LENSERFIGHT_LENSER_ID
    const tool = captureTool(registerWorkflowCreate)
    const env = parseEnvelope(await tool.handler({ title: 'T' }))
    expect(env.error?.code).toBe('MISSING_LENSER')
    expect(workflowService.create).not.toHaveBeenCalled()
  })

  it('forwards explicit lenser_id and defaults visibility=private', async () => {
    ;(workflowService.create as jest.Mock).mockResolvedValue({ id: 'w1' })
    const tool = captureTool(registerWorkflowCreate)
    await tool.handler({ title: 'T', lenser_id: VALID_UUID })
    expect(workflowService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lenser_id: VALID_UUID,
        visibility: 'private',
        description: null,
      })
    )
  })

  it('creates a complete trigger, Lens, tool, and connector graph from readable step keys', async () => {
    ;(workflowService.create as jest.Mock).mockResolvedValue({ id: 'workflow-1' })
    const tool = captureTool(registerWorkflowCreate)
    const envelope = parseEnvelope(
      await tool.handler({
        title: 'Publish research',
        lenser_id: VALID_UUID,
        steps: [
          {
            key: 'start',
            kind: 'trigger',
            name: 'Every Monday',
            node_type: 'schedule_trigger',
            config: { cronExpression: '0 9 * * 1', timezone: 'Europe/Istanbul' },
          },
          {
            key: 'research',
            kind: 'lens',
            name: 'Research Lens',
            lens_id: 'aaaaaaaa-0000-0000-0000-000000000002',
            parameters: { topic: 'AI robotics' },
          },
          {
            key: 'publish',
            kind: 'tool',
            name: 'Publish to Notion',
            node_type: 'notion_write',
            connector: {
              provider: 'notion',
              connection_ref: 'notion-workspace',
              capability: 'database',
            },
          },
        ],
        connections: [
          { from_step: 'start', to_step: 'research', input_parameter: 'context' },
          {
            from_step: 'research',
            output_key: 'result',
            to_step: 'publish',
            input_parameter: 'content',
          },
        ],
      })
    )

    expect(workflowService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            label: 'Every Monday',
            config: expect.objectContaining({ node_type: 'schedule_trigger' }),
          }),
          expect.objectContaining({
            label: 'Research Lens',
            lens_id: 'aaaaaaaa-0000-0000-0000-000000000002',
            config: expect.objectContaining({ param_overrides: { topic: 'AI robotics' } }),
          }),
          expect.objectContaining({
            label: 'Publish to Notion',
            config: expect.objectContaining({
              node_type: 'notion_write',
              connectorRef: 'notion-workspace',
              connectorProvider: 'notion',
            }),
          }),
        ]),
        edges: [
          expect.objectContaining({ source_output_key: 'output', target_param_label: 'context' }),
          expect.objectContaining({ source_output_key: 'result', target_param_label: 'content' }),
        ],
      })
    )
    expect(envelope.data).toEqual(
      expect.objectContaining({
        id: 'workflow-1',
        creation_summary: { step_count: 3, connection_count: 2, steps: expect.any(Array) },
        next_steps: expect.arrayContaining([expect.stringContaining('validate_workflow')]),
      })
    )
  })

  it('rejects Lens steps without a Lens id and explains how to recover', async () => {
    const tool = captureTool(registerWorkflowCreate)
    const envelope = parseEnvelope(
      await tool.handler({
        title: 'Research',
        lenser_id: VALID_UUID,
        steps: [{ key: 'research', kind: 'lens', name: 'Research Lens' }],
      })
    )

    expect(envelope.error?.code).toBe('INVALID_ARGUMENT')
    expect(envelope.error?.message).toContain('Call create_lens first')
    expect(workflowService.create).not.toHaveBeenCalled()
  })

  it('rejects secrets and directs callers to connector references', async () => {
    const tool = captureTool(registerWorkflowCreate)
    const envelope = parseEnvelope(
      await tool.handler({
        title: 'Notify',
        lenser_id: VALID_UUID,
        steps: [
          {
            key: 'notify',
            kind: 'tool',
            name: 'Notify',
            node_type: 'slack_send',
            config: { api_key: 'must-not-be-stored' },
          },
        ],
      })
    )

    expect(envelope.error?.code).toBe('INVALID_ARGUMENT')
    expect(envelope.error?.message).toContain('connector.connection_ref')
    expect(workflowService.create).not.toHaveBeenCalled()
  })

  it('rejects disconnected steps before calling the API', async () => {
    const tool = captureTool(registerWorkflowCreate)
    const envelope = parseEnvelope(
      await tool.handler({
        title: 'Disconnected',
        lenser_id: VALID_UUID,
        steps: [
          {
            key: 'start',
            kind: 'trigger',
            name: 'Start',
            node_type: 'manual_trigger',
          },
          {
            key: 'notify',
            kind: 'tool',
            name: 'Notify',
            node_type: 'slack_send',
          },
        ],
      })
    )

    expect(envelope.error?.code).toBe('INVALID_ARGUMENT')
    expect(envelope.error?.message).toContain('Unreachable: notify')
    expect(workflowService.create).not.toHaveBeenCalled()
  })

  it('maps MISSING_LENSER McpError from service', async () => {
    ;(workflowService.create as jest.Mock).mockRejectedValue(new McpError('MISSING_LENSER', 'no'))
    const tool = captureTool(registerWorkflowCreate)
    const env = parseEnvelope(await tool.handler({ title: 'T', lenser_id: VALID_UUID }))
    expect(env.error?.code).toBe('MISSING_LENSER')
  })
})
