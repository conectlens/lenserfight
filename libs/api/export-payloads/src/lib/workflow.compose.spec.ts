import { describe, expect, it, vi } from 'vitest'

import { composeWorkflowPayload } from './workflow.compose'

import type { RpcCaller } from './rpc-caller'

describe('composeWorkflowPayload', () => {
  it('maps fn_get_workflow_bootstrap into a WorkflowExportPayload', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue([
      {
        workflow: {
          id: 'wf-1',
          title: 'Research pipeline',
          description: 'Two-step research flow',
          visibility: 'private',
          battle_count: 3,
          fork_count: 1,
          parent_workflow_id: null,
          parent_workflow_title: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
        nodes: [
          { id: 'n1', lens_id: 'lens-a', version_id: 'v1', label: 'Research', ordinal: 0, config: {} },
          { id: 'n2', lens_id: 'lens-b', version_id: 'v2', label: 'Summarize', ordinal: 1, config: { model_id: 'gpt-4o-mini' } },
        ],
        edges: [
          { source_node_id: 'n1', target_node_id: 'n2', source_output_key: 'output', target_param_label: 'input' },
        ],
      },
    ])

    const payload = await composeWorkflowPayload(rpc, 'wf-1')

    expect(rpc).toHaveBeenCalledWith('fn_get_workflow_bootstrap', { p_workflow_id: 'wf-1' })
    expect(payload.id).toBe('wf-1')
    expect(payload.title).toBe('Research pipeline')
    expect(payload.node_count).toBe(2)
    expect(payload.nodes).toHaveLength(2)
    expect(payload.edges).toEqual([
      { source_node_id: 'n1', target_node_id: 'n2', source_output_key: 'output', target_param_label: 'input' },
    ])
  })

  it('throws when the workflow does not exist', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue([{ workflow: null, nodes: [], edges: [] }])
    await expect(composeWorkflowPayload(rpc, 'missing')).rejects.toThrow('Workflow not found: missing')
  })

  it('throws when the RPC returns no rows', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue([])
    await expect(composeWorkflowPayload(rpc, 'missing')).rejects.toThrow('Workflow not found: missing')
  })
})
