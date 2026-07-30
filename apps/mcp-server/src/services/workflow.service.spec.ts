import { SupabaseClient } from '@supabase/supabase-js'

import { workflowService } from './workflow.service'

function makeSb(result: { data?: unknown; error?: { message: string } | null }) {
  const rpc = jest.fn(() =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null })
  )
  return { rpc, sb: { rpc } as unknown as SupabaseClient }
}

describe('workflowService', () => {
  describe('list / get / create', () => {
    it('list unpacks data.data + count', async () => {
      const { sb } = makeSb({ data: { data: [{ id: 'w1' }], count: 2 } })
      const r = await workflowService.list(sb, { limit: 10, offset: 0 })
      expect(r).toEqual({ items: [{ id: 'w1' }], total: 2 })
    })

    it('list forwards visibility filter', async () => {
      const { sb, rpc } = makeSb({ data: { data: [], count: 0 } })
      await workflowService.list(sb, { limit: 10, offset: 0, visibility: 'public' })
      expect(rpc).toHaveBeenCalledWith(
        'fn_mcp_workflow_list',
        expect.objectContaining({ p_visibility: 'public' })
      )
    })

    it('get returns null when data is null', async () => {
      const { sb } = makeSb({ data: null })
      expect(await workflowService.get(sb, 'w1')).toBeNull()
    })

    it('getGraph uses the bootstrap API and redacts credentials without removing parameters', async () => {
      const { sb, rpc } = makeSb({
        data: [
          {
            workflow: { id: 'w1' },
            nodes: [
              {
                id: 'n1',
                config: {
                  key_ref_id: 'secret-ref',
                  local_key_id: 'local-secret',
                  param_overrides: { topic: 'Robotics' },
                },
              },
            ],
            edges: [],
          },
        ],
      })

      const graph = await workflowService.getGraph(sb, 'w1')

      expect(rpc).toHaveBeenCalledWith('fn_get_workflow_bootstrap', { p_workflow_id: 'w1' })
      expect(graph).toEqual({
        workflow: { id: 'w1' },
        nodes: [
          {
            id: 'n1',
            config: {
              key_ref_id: '[redacted]',
              local_key_id: '[redacted]',
              param_overrides: { topic: 'Robotics' },
            },
          },
        ],
        edges: [],
      })
    })

    it('getGraph maps visibility failures to FORBIDDEN', async () => {
      const { sb } = makeSb({ error: { message: 'access_denied' } })
      await expect(workflowService.getGraph(sb, 'w1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('create maps missing_lenser_id to MISSING_LENSER', async () => {
      const { sb } = makeSb({ error: { message: 'missing_lenser_id' } })
      await expect(
        workflowService.create(sb, {
          lenser_id: '',
          title: 'T',
          description: null,
          visibility: 'private',
        })
      ).rejects.toMatchObject({ code: 'MISSING_LENSER' })
    })

    it('create uses the atomic graph API when nodes are supplied', async () => {
      const { sb, rpc } = makeSb({ data: { id: 'w1', node_count: 1, edge_count: 0 } })
      await workflowService.create(sb, {
        lenser_id: 'owner',
        title: 'T',
        description: null,
        visibility: 'private',
        nodes: [
          {
            id: 'node-1',
            lens_id: null,
            version_id: null,
            position_x: 0,
            position_y: 0,
            label: 'Start',
            ordinal: 0,
            config: { node_type: 'manual_trigger' },
          },
        ],
        edges: [],
      })

      expect(rpc).toHaveBeenCalledWith(
        'fn_mcp_workflow_create_graph',
        expect.objectContaining({
          p_title: 'T',
          p_nodes: [expect.objectContaining({ label: 'Start' })],
          p_edges: [],
        })
      )
    })
  })

  describe('startRun / runStatus / runLogs / retry / summarize', () => {
    it('startRun forwards all five params', async () => {
      const { sb, rpc } = makeSb({ data: { id: 'run1' } })
      await workflowService.startRun(sb, {
        workflow_id: 'w1',
        inputs: { k: 'v' },
        global_model_id: 'm1',
        idempotency_key: 'k1',
        metadata: { mcp_tool: 'run_workflow' },
      })
      expect(rpc).toHaveBeenCalledWith(
        'fn_mcp_workflow_run_start',
        expect.objectContaining({
          p_workflow_id: 'w1',
          p_inputs: { k: 'v' },
          p_global_model_id: 'm1',
          p_idempotency_key: 'k1',
        })
      )
    })

    it('runLogs falls back to empty shape when null', async () => {
      const { sb } = makeSb({ data: null })
      const r = await workflowService.runLogs(sb, 'run1')
      expect(r).toEqual({ run: null, node_results: [] })
    })

    it('retry throws McpError on run_not_found', async () => {
      const { sb } = makeSb({ error: { message: 'run_not_found' } })
      await expect(workflowService.retry(sb, 'run1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('summarize returns null when data is null', async () => {
      const { sb } = makeSb({ data: null })
      expect(await workflowService.summarize(sb, 'run1')).toBeNull()
    })

    it('runStatus throws DB_ERROR fallback on unmapped errors', async () => {
      const { sb } = makeSb({ error: { message: 'something_unknown' } })
      await expect(workflowService.runStatus(sb, 'run1')).rejects.toMatchObject({
        code: 'DB_ERROR',
      })
    })
  })
})
