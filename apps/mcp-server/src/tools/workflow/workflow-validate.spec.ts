import { captureTool, parseEnvelope } from '../../__tests__/tool-harness'
import { McpError } from '../../services/mcp-error'
import { workflowService, type WorkflowGraph } from '../../services/workflow.service'

import { registerWorkflowValidate, validateWorkflowGraph } from './workflow-validate'

jest.mock('../../services/workflow.service', () => ({
  workflowService: { getGraph: jest.fn() },
}))

const graph: WorkflowGraph = {
  workflow: { id: 'workflow-1', title: 'Research digest' },
  nodes: [
    {
      id: 'trigger-1',
      label: 'Start manually',
      config: { node_type: 'manual_trigger' },
    },
    {
      id: 'lens-1',
      label: 'Research Lens',
      lens_id: 'internal-lens-id',
      config: { param_overrides: { topic: 'Robotics' } },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source_node_id: 'trigger-1',
      target_node_id: 'lens-1',
      target_param_label: 'context',
    },
  ],
}

describe('validate_workflow tool', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns an agent-readable execution plan and parameter sources', () => {
    const result = validateWorkflowGraph(graph)

    expect(result).toMatchObject({
      valid: true,
      run_ready: true,
      errors: [],
      warnings: [],
      execution_order: [
        { id: 'trigger-1', name: 'Start manually', kind: 'trigger' },
        {
          id: 'lens-1',
          name: 'Research Lens',
          kind: 'lens',
          configured_parameters: ['topic'],
          wired_parameters: ['context'],
        },
      ],
      root_nodes: [{ id: 'trigger-1', name: 'Start manually', kind: 'trigger' }],
    })
  })

  it('reports broken connections and cycles with actionable codes', () => {
    const result = validateWorkflowGraph({
      workflow: {},
      nodes: [
        { id: 'a', label: 'A', lens_id: 'lens-a', config: {} },
        { id: 'b', label: 'B', lens_id: 'lens-b', config: {} },
      ],
      edges: [
        {
          id: 'a-to-b',
          source_node_id: 'a',
          target_node_id: 'b',
          target_param_label: 'input',
        },
        {
          id: 'b-to-a',
          source_node_id: 'b',
          target_node_id: 'a',
          target_param_label: 'input',
        },
        {
          id: 'broken',
          source_node_id: 'missing',
          target_node_id: 'a',
          target_param_label: '',
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['EDGE_SOURCE_MISSING', 'EDGE_PARAMETER_MISSING', 'WORKFLOW_CYCLE'])
    )
    expect(result.warnings.map((issue) => issue.code)).toContain('TRIGGER_MISSING')
  })

  it('returns NOT_FOUND when the graph is unavailable', async () => {
    ;(workflowService.getGraph as jest.Mock).mockResolvedValue(null)
    const tool = captureTool(registerWorkflowValidate)
    const envelope = parseEnvelope(await tool.handler({ workflow_id: 'workflow-1' }))

    expect(tool.name).toBe('validate_workflow')
    expect(tool.title).toBe('Validate Workflow')
    expect(envelope.error?.code).toBe('NOT_FOUND')
  })

  it('preserves service authorization errors', async () => {
    ;(workflowService.getGraph as jest.Mock).mockRejectedValue(
      new McpError('FORBIDDEN', 'You do not have access')
    )
    const tool = captureTool(registerWorkflowValidate)
    const envelope = parseEnvelope(await tool.handler({ workflow_id: 'workflow-1' }))

    expect(envelope.error?.code).toBe('FORBIDDEN')
  })
})
