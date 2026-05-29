import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockSelect, mockEq, mockOrder, mockLimit, chainMethods } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const chainMethods = { select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit }
  Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  return {
    mockRpc: vi.fn(),
    mockFrom: vi.fn().mockReturnValue(chainMethods),
    mockSelect,
    mockEq,
    mockOrder,
    mockLimit,
    chainMethods,
  }
})

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

vi.mock('./debugLogger', () => ({ debugRepositoryEvent: vi.fn() }))

import { SupabaseWorkflowsRepository } from './workflowsRepository'

const WF_ID = 'workflow-uuid-1'
const RUN_ID = 'run-uuid-1'
const LENSER_ID = 'lenser-uuid-1'

const fakeWorkflow = {
  id: WF_ID,
  lenser_id: LENSER_ID,
  title: 'My Workflow',
  description: null,
  visibility: 'public',
  battle_count: 0,
  node_count: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const fakeRun = {
  id: RUN_ID,
  workflow_id: WF_ID,
  status: 'running',
  context_inputs: {},
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseWorkflowsRepository', () => {
  let repo: SupabaseWorkflowsRepository

  beforeEach(() => {
    repo = new SupabaseWorkflowsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chainMethods)
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
  })

  // ---------------------------------------------------------------------------
  // listByLenser — chain builder path
  // ---------------------------------------------------------------------------
  describe('listByLenser', () => {
    it('queries vw_workflows with eq(lenser_id) and default limit 100', async () => {
      mockLimit.mockResolvedValue({ data: [fakeWorkflow], error: null })
      const result = await repo.listByLenser(LENSER_ID)
      expect(mockFrom).toHaveBeenCalledWith('vw_workflows')
      expect(mockEq).toHaveBeenCalledWith('lenser_id', LENSER_ID)
      expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(100)
      expect(result).toEqual([fakeWorkflow])
    })

    it('respects custom limit', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listByLenser(LENSER_ID, 10)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('returns empty array when no workflows', async () => {
      mockLimit.mockResolvedValue({ data: null, error: null })
      expect(await repo.listByLenser(LENSER_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockLimit.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.listByLenser(LENSER_ID)).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // listByLenserPaginated
  // ---------------------------------------------------------------------------
  describe('listByLenserPaginated', () => {
    it('calls fn_get_my_workflows with correct params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const result = await repo.listByLenserPaginated(LENSER_ID, 0, 10)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_my_workflows', {
        p_lenser_id: LENSER_ID,
        p_offset: 0,
        p_limit: 10,
        p_visibility: null,
        p_sort: 'updated_at',
        p_search: null,
      })
      expect(result.data).toEqual([])
    })

    it('passes filter params', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listByLenserPaginated(LENSER_ID, 20, 10, { visibility: 'private', sort: 'battle_count', search: 'test' })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_my_workflows', expect.objectContaining({
        p_visibility: 'private',
        p_sort: 'battle_count',
        p_search: 'test',
      }))
    })

    it('sets hasNextPage true when rows.length === limit', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({ ...fakeWorkflow, id: `wf-${i}` }))
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.listByLenserPaginated(LENSER_ID, 0, 10)
      expect(result.meta?.hasNextPage).toBe(true)
    })

    it('sets hasNextPage false when rows.length < limit', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      const result = await repo.listByLenserPaginated(LENSER_ID, 0, 10)
      expect(result.meta?.hasNextPage).toBe(false)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('paginated error') })
      await expect(repo.listByLenserPaginated(LENSER_ID, 0, 10)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getPopular
  // ---------------------------------------------------------------------------
  describe('getPopular', () => {
    it('calls fn_workflows_get_popular with offset, limit, search', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPopular(0, 12, 'test')
      expect(mockRpc).toHaveBeenCalledWith('fn_workflows_get_popular', {
        p_offset: 0,
        p_limit: 12,
        p_search: 'test',
      })
    })

    it('passes null for search when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getPopular(0, 12)
      expect(mockRpc).toHaveBeenCalledWith('fn_workflows_get_popular', expect.objectContaining({ p_search: null }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('popular error') })
      await expect(repo.getPopular(0, 10)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // listTemplates
  // ---------------------------------------------------------------------------
  describe('listTemplates', () => {
    it('calls fn_list_template_workflows with default limit 12', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTemplates()
      expect(mockRpc).toHaveBeenCalledWith('fn_list_template_workflows', { p_limit: 12, p_offset: 0 })
    })

    it('enforces limit and offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTemplates(24, 12)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_template_workflows', { p_limit: 24, p_offset: 12 })
    })

    it('returns empty array when no templates', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listTemplates()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('templates error') })
      await expect(repo.listTemplates()).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('calls fn_get_workflow_detail with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      const result = await repo.getById(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_detail', { p_workflow_id: WF_ID })
      expect(result).toEqual(fakeWorkflow)
    })

    it('returns null when workflow not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getById('missing')).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('get error') })
      await expect(repo.getById(WF_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getBootstrap
  // ---------------------------------------------------------------------------
  describe('getBootstrap', () => {
    it('calls fn_get_workflow_bootstrap and shapes response', async () => {
      const bootstrapRow = { workflow: fakeWorkflow, nodes: [{ id: 'n1' }], edges: [{ id: 'e1' }] }
      mockRpc.mockResolvedValue({ data: [bootstrapRow], error: null })
      const result = await repo.getBootstrap(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_bootstrap', { p_workflow_id: WF_ID })
      expect(result?.workflow).toEqual(fakeWorkflow)
      expect(result?.nodes).toEqual([{ id: 'n1' }])
      expect(result?.edges).toEqual([{ id: 'e1' }])
    })

    it('returns null when no bootstrap row', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getBootstrap(WF_ID)).toBeNull()
    })

    it('defaults nodes and edges to empty arrays when absent', async () => {
      mockRpc.mockResolvedValue({ data: [{ workflow: fakeWorkflow }], error: null })
      const result = await repo.getBootstrap(WF_ID)
      expect(result?.nodes).toEqual([])
      expect(result?.edges).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('bootstrap error') })
      await expect(repo.getBootstrap(WF_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getNodes / getEdges
  // ---------------------------------------------------------------------------
  describe('getNodes', () => {
    it('calls fn_get_workflow_nodes with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'n1' }], error: null })
      await repo.getNodes(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_nodes', { p_workflow_id: WF_ID })
    })

    it('returns empty array when no nodes', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getNodes(WF_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('nodes error') })
      await expect(repo.getNodes(WF_ID)).rejects.toThrow()
    })
  })

  describe('getEdges', () => {
    it('calls fn_get_workflow_edges with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getEdges(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_edges', { p_workflow_id: WF_ID })
    })

    it('returns empty array when no edges', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getEdges(WF_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // createWorkflow / updateWorkflow / forkWorkflow
  // ---------------------------------------------------------------------------
  describe('createWorkflow', () => {
    it('calls fn_create_workflow with title, description, visibility', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      const result = await repo.createWorkflow({ title: 'My Workflow', description: 'desc', visibility: 'public' })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow', {
        p_title: 'My Workflow',
        p_description: 'desc',
        p_visibility: 'public',
      })
      expect(result).toEqual(fakeWorkflow)
    })

    it('defaults visibility to public and description to null', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      await repo.createWorkflow({ title: 'T' })
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow', expect.objectContaining({
        p_description: null,
        p_visibility: 'public',
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create error') })
      await expect(repo.createWorkflow({ title: 'T' })).rejects.toThrow()
    })
  })

  describe('updateWorkflow', () => {
    it('calls fn_update_workflow with all fields', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      await repo.updateWorkflow(WF_ID, { title: 'Updated', description: 'new desc', visibility: 'private' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_workflow', {
        p_workflow_id: WF_ID,
        p_title: 'Updated',
        p_description: 'new desc',
        p_visibility: 'private',
      })
    })

    it('passes null for description when not provided', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      await repo.updateWorkflow(WF_ID, { title: 'T', visibility: 'public' })
      expect(mockRpc).toHaveBeenCalledWith('fn_update_workflow', expect.objectContaining({ p_description: null }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('update error') })
      await expect(repo.updateWorkflow(WF_ID, { title: 'T', visibility: 'public' })).rejects.toThrow()
    })
  })

  describe('forkWorkflow', () => {
    it('calls fn_clone_workflow with p_source_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWorkflow], error: null })
      const result = await repo.forkWorkflow(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_clone_workflow', { p_source_workflow_id: WF_ID })
      expect(result).toEqual(fakeWorkflow)
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('fork error') })
      await expect(repo.forkWorkflow(WF_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // upsertNodes / upsertEdges / deleteNode / deleteEdge
  // ---------------------------------------------------------------------------
  describe('upsertNodes', () => {
    it('calls fn_upsert_workflow_nodes with p_workflow_id and p_nodes', async () => {
      const nodes = [{ lens_id: 'lens-1', position_x: 0, position_y: 0 }]
      mockRpc.mockResolvedValue({ data: [{ id: 'n1' }], error: null })
      await repo.upsertNodes(WF_ID, nodes)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_workflow_nodes', {
        p_workflow_id: WF_ID,
        p_nodes: nodes,
      })
    })

    it('returns empty array when no nodes returned', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.upsertNodes(WF_ID, [])).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('nodes error') })
      await expect(repo.upsertNodes(WF_ID, [])).rejects.toThrow()
    })
  })

  describe('upsertEdges', () => {
    it('calls fn_upsert_workflow_edges with p_workflow_id and p_edges', async () => {
      const edges = [{ source_node_id: 'n1', target_node_id: 'n2', target_param_label: 'input' }]
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.upsertEdges(WF_ID, edges)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_workflow_edges', {
        p_workflow_id: WF_ID,
        p_edges: edges,
      })
    })
  })

  describe('deleteNode', () => {
    it('calls fn_delete_workflow_node with p_node_id', async () => {
      await repo.deleteNode('n-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_workflow_node', { p_node_id: 'n-1' })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('delete error') })
      await expect(repo.deleteNode('n-1')).rejects.toThrow()
    })
  })

  describe('deleteEdge', () => {
    it('calls fn_delete_workflow_edge with p_edge_id', async () => {
      await repo.deleteEdge('e-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_workflow_edge', { p_edge_id: 'e-1' })
    })
  })

  // ---------------------------------------------------------------------------
  // startRun — calls fn_start_workflow_run then getRun
  // ---------------------------------------------------------------------------
  describe('startRun', () => {
    it('calls fn_start_workflow_run then fn_get_workflow_run and returns run', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: RUN_ID, error: null })        // fn_start_workflow_run
        .mockResolvedValueOnce({ data: [fakeRun], error: null })     // fn_get_workflow_run
      const result = await repo.startRun(WF_ID)
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_start_workflow_run', expect.objectContaining({
        p_workflow_id: WF_ID,
        p_inputs: {},
        p_global_model_id: null,
      }))
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'fn_get_workflow_run', { p_run_id: RUN_ID })
      expect(result).toEqual(fakeRun)
    })

    it('includes idempotency_key when provided', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: RUN_ID, error: null })
        .mockResolvedValueOnce({ data: [fakeRun], error: null })
      await repo.startRun(WF_ID, {}, undefined, 'idem-key')
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_start_workflow_run', expect.objectContaining({
        p_idempotency_key: 'idem-key',
      }))
    })

    it('throws "Workflow run not found" if getRun returns null', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: RUN_ID, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
      await expect(repo.startRun(WF_ID)).rejects.toThrow('Workflow run not found after creation')
    })

    it('throws when fn_start_workflow_run fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('start error') })
      await expect(repo.startRun(WF_ID)).rejects.toThrow('start error')
    })
  })

  // ---------------------------------------------------------------------------
  // getRun
  // ---------------------------------------------------------------------------
  describe('getRun', () => {
    it('calls fn_get_workflow_run with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeRun], error: null })
      const result = await repo.getRun(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_run', { p_run_id: RUN_ID })
      expect(result).toEqual(fakeRun)
    })

    it('returns null when run not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getRun(RUN_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('run error') })
      await expect(repo.getRun(RUN_ID)).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // getNodeResults
  // ---------------------------------------------------------------------------
  describe('getNodeResults', () => {
    it('calls fn_get_workflow_node_results with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getNodeResults(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_node_results', { p_run_id: RUN_ID })
    })

    it('returns empty array when no results', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getNodeResults(RUN_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // updateNodeResult
  // ---------------------------------------------------------------------------
  describe('updateNodeResult', () => {
    it('calls fn_update_workflow_node_result with required fields', async () => {
      await repo.updateNodeResult(RUN_ID, 'n-1', 'completed', { output: 'x' }, undefined)
      expect(mockRpc).toHaveBeenCalledWith('fn_update_workflow_node_result', {
        p_run_id: RUN_ID,
        p_node_id: 'n-1',
        p_status: 'completed',
        p_output_data: { output: 'x' },
        p_error_message: null,
      })
    })

    it('includes optional observability fields when provided', async () => {
      await repo.updateNodeResult(RUN_ID, 'n-1', 'failed', undefined, 'oops', {
        retryCount: 2,
        durationMs: 500,
        ttfbMs: 100,
        waitingReason: 'retry_backoff',
      })
      const call = mockRpc.mock.calls[0][1]
      expect(call.p_retry_count).toBe(2)
      expect(call.p_duration_ms).toBe(500)
      expect(call.p_ttfb_ms).toBe(100)
      expect(call.p_waiting_reason).toBe('retry_backoff')
    })

    it('omits optional fields when not provided', async () => {
      await repo.updateNodeResult(RUN_ID, 'n-1', 'completed')
      const call = mockRpc.mock.calls[0][1]
      expect(call).not.toHaveProperty('p_retry_count')
      expect(call).not.toHaveProperty('p_duration_ms')
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('update error') })
      await expect(repo.updateNodeResult(RUN_ID, 'n-1', 'completed')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // updateRunStatus
  // ---------------------------------------------------------------------------
  describe('updateRunStatus', () => {
    it('calls fn_update_workflow_run_status with p_run_id and p_status', async () => {
      await repo.updateRunStatus(RUN_ID, 'completed')
      expect(mockRpc).toHaveBeenCalledWith('fn_update_workflow_run_status', {
        p_run_id: RUN_ID,
        p_status: 'completed',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('status error') })
      await expect(repo.updateRunStatus(RUN_ID, 'failed')).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // appendRunEvent
  // ---------------------------------------------------------------------------
  describe('appendRunEvent', () => {
    it('calls fn_append_workflow_run_event and maps response', async () => {
      mockRpc.mockResolvedValue({ data: [{ event_id: '42', created_at: '2026-01-01T00:00:00Z' }], error: null })
      const result = await repo.appendRunEvent(RUN_ID, 'node_started', { node_id: 'n-1' })
      expect(mockRpc).toHaveBeenCalledWith('fn_append_workflow_run_event', {
        p_run_id: RUN_ID,
        p_type: 'node_started',
        p_payload: { node_id: 'n-1' },
      })
      expect(result?.event_id).toBe(42)
      expect(result?.type).toBe('node_started')
      expect(result?.timestamp).toBe('2026-01-01T00:00:00Z')
    })

    it('returns null when no row returned', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.appendRunEvent(RUN_ID, 'test')).toBeNull()
    })

    it('defaults payload to empty object', async () => {
      mockRpc.mockResolvedValue({ data: [{ event_id: '1', created_at: '2026-01-01T00:00:00Z' }], error: null })
      await repo.appendRunEvent(RUN_ID, 'test')
      expect(mockRpc).toHaveBeenCalledWith('fn_append_workflow_run_event', expect.objectContaining({ p_payload: {} }))
    })
  })

  // ---------------------------------------------------------------------------
  // listRunEvents
  // ---------------------------------------------------------------------------
  describe('listRunEvents', () => {
    it('calls fn_list_workflow_run_events with defaults', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listRunEvents(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_run_events', {
        p_run_id: RUN_ID,
        p_after_event_id: 0,
        p_limit: 200,
      })
    })

    it('enforces default limit of 200', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listRunEvents(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_run_events', expect.objectContaining({ p_limit: 200 }))
    })

    it('maps occurred_at to timestamp', async () => {
      const rawRow = { event_id: '5', type: 'test', run_id: RUN_ID, occurred_at: '2026-01-01T00:00:00Z', payload: {} }
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.listRunEvents(RUN_ID)
      expect(result[0].timestamp).toBe('2026-01-01T00:00:00Z')
    })

    it('falls back to timestamp field when occurred_at absent', async () => {
      const rawRow = { event_id: '5', type: 'test', run_id: RUN_ID, timestamp: '2026-02-01T00:00:00Z', payload: {} }
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const result = await repo.listRunEvents(RUN_ID)
      expect(result[0].timestamp).toBe('2026-02-01T00:00:00Z')
    })

    it('returns empty array when no events', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listRunEvents(RUN_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getRunState
  // ---------------------------------------------------------------------------
  describe('getRunState', () => {
    it('calls fn_get_workflow_run_state with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [{ active_node: 'n1' }], error: null })
      await repo.getRunState(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_run_state', { p_run_id: RUN_ID })
    })

    it('returns null when no state', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getRunState(RUN_ID)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // getRunProvenance / recordRunProvenance
  // ---------------------------------------------------------------------------
  describe('getRunProvenance', () => {
    it('calls fn_get_run_provenance with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getRunProvenance(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_run_provenance', { p_run_id: RUN_ID })
    })

    it('returns empty array when no provenance', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getRunProvenance(RUN_ID)).toEqual([])
    })
  })

  describe('recordRunProvenance', () => {
    it('calls fn_record_run_provenance with all fields', async () => {
      mockRpc.mockResolvedValue({ data: 'prov-uuid', error: null })
      const result = await repo.recordRunProvenance({
        sourceRunId: 'r1', sourceNodeId: 'n1', sourceOutputPath: 'out',
        targetRunId: 'r2', targetNodeId: 'n2', targetInputPath: 'in',
        transform: { key: 'val' },
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_record_run_provenance', {
        p_source_run_id: 'r1', p_source_node_id: 'n1', p_source_output_path: 'out',
        p_target_run_id: 'r2', p_target_node_id: 'n2', p_target_input_path: 'in',
        p_transform: { key: 'val' },
      })
      expect(result).toBe('prov-uuid')
    })

    it('passes null for transform when not provided', async () => {
      mockRpc.mockResolvedValue({ data: 'prov-uuid', error: null })
      await repo.recordRunProvenance({
        sourceRunId: 'r1', sourceNodeId: 'n1', sourceOutputPath: 'out',
        targetRunId: 'r2', targetNodeId: 'n2', targetInputPath: 'in',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_record_run_provenance', expect.objectContaining({ p_transform: null }))
    })
  })

  // ---------------------------------------------------------------------------
  // getSchedules / upsertSchedule / deleteSchedule / getScheduleHistory
  // ---------------------------------------------------------------------------
  describe('getSchedules', () => {
    it('calls fn_get_workflow_schedules with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSchedules(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_schedules', { p_workflow_id: WF_ID, p_limit: 50 })
    })

    it('calls fn_get_workflow_schedules with empty object when no workflowId', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getSchedules()
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_schedules', { p_limit: 50 })
    })

    it('maps nullable schedule fields to defaults', async () => {
      const rawSchedule = { id: 's-1', workflow_id: WF_ID, cron_expr: '0 * * * *', is_active: true }
      mockRpc.mockResolvedValue({ data: [rawSchedule], error: null })
      const [schedule] = await repo.getSchedules(WF_ID)
      expect(schedule.timezone).toBe('UTC')
      expect(schedule.inputs_template).toEqual({})
      expect(schedule.assignee_type).toBe('agent')
    })
  })

  describe('upsertSchedule', () => {
    it('calls fn_upsert_workflow_schedule with defaults', async () => {
      const rawSchedule = { id: 's-1', workflow_id: WF_ID, cron_expr: '0 * * * *', is_active: true }
      mockRpc.mockResolvedValue({ data: [rawSchedule], error: null })
      await repo.upsertSchedule({ workflow_id: WF_ID, cron_expr: '0 * * * *', is_active: true })
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_workflow_schedule', expect.objectContaining({
        p_workflow_id: WF_ID,
        p_cron_expr: '0 * * * *',
        p_timezone: 'UTC',
        p_is_active: true,
      }))
    })

    it('returns null when no row returned', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.upsertSchedule({ workflow_id: WF_ID, cron_expr: '0 * * * *', is_active: true })).toBeNull()
    })
  })

  describe('deleteSchedule', () => {
    it('calls fn_delete_workflow_schedule with p_schedule_id', async () => {
      await repo.deleteSchedule('sched-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_workflow_schedule', { p_schedule_id: 'sched-1' })
    })
  })

  describe('getScheduleHistory', () => {
    it('calls fn_get_workflow_schedule_history with p_schedule_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getScheduleHistory('sched-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_schedule_history', { p_schedule_id: 'sched-1' })
    })

    it('returns empty array when no history', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getScheduleHistory('sched-1')).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // Versioning
  // ---------------------------------------------------------------------------
  describe('getVersions', () => {
    it('calls fn_get_workflow_versions with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getVersions(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_versions', { p_workflow_id: WF_ID })
    })
  })

  describe('createVersion', () => {
    it('calls fn_create_workflow_version and returns version id', async () => {
      mockRpc.mockResolvedValue({ data: 'v-uuid', error: null })
      const result = await repo.createVersion(WF_ID, 'added node')
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow_version', {
        p_workflow_id: WF_ID,
        p_changelog: 'added node',
      })
      expect(result).toBe('v-uuid')
    })

    it('passes null changelog when not provided', async () => {
      mockRpc.mockResolvedValue({ data: 'v-uuid', error: null })
      await repo.createVersion(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow_version', expect.objectContaining({ p_changelog: null }))
    })
  })

  describe('publishVersion', () => {
    it('calls fn_publish_workflow_version with p_version_id', async () => {
      await repo.publishVersion('v-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_publish_workflow_version', { p_version_id: 'v-1' })
    })
  })

  describe('restoreVersion', () => {
    it('calls fn_restore_workflow_version with p_version_id', async () => {
      await repo.restoreVersion('v-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_restore_workflow_version', { p_version_id: 'v-1' })
    })
  })

  // ---------------------------------------------------------------------------
  // listRuns
  // ---------------------------------------------------------------------------
  describe('listRuns', () => {
    it('calls fn_list_workflow_runs with default limit 20', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listRuns(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_runs', {
        p_workflow_id: WF_ID,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('enforces custom limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listRuns(WF_ID, 50, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_runs', { p_workflow_id: WF_ID, p_limit: 50, p_offset: 20 })
    })

    it('returns empty array when no runs', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listRuns(WF_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------
  describe('listPhases', () => {
    it('calls fn_list_workflow_phases with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listPhases(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_phases', { p_workflow_id: WF_ID })
    })

    it('returns empty array when no phases', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listPhases(WF_ID)).toEqual([])
    })
  })

  describe('upsertPhase', () => {
    it('calls fn_upsert_workflow_phase with defaults for missing fields', async () => {
      const phase = { workflow_id: WF_ID, title: 'Phase 1' }
      mockRpc.mockResolvedValue({ data: { id: 'ph-1', ...phase }, error: null })
      await repo.upsertPhase(phase)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_workflow_phase', {
        p_workflow_id: WF_ID,
        p_title: 'Phase 1',
        p_description: null,
        p_ordinal: 0,
        p_id: null,
      })
    })
  })

  describe('deletePhase', () => {
    it('calls fn_delete_workflow_phase with p_phase_id', async () => {
      await repo.deletePhase('ph-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_workflow_phase', { p_phase_id: 'ph-1' })
    })
  })

  describe('reorderPhases', () => {
    it('calls fn_reorder_workflow_phases with ordered ids', async () => {
      await repo.reorderPhases(WF_ID, ['ph-2', 'ph-1'])
      expect(mockRpc).toHaveBeenCalledWith('fn_reorder_workflow_phases', {
        p_workflow_id: WF_ID,
        p_ordered_ids: ['ph-2', 'ph-1'],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------
  describe('listTasks', () => {
    it('calls fn_list_workflow_tasks with p_phase_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTasks('ph-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_tasks', { p_phase_id: 'ph-1' })
    })

    it('returns empty array when no tasks', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listTasks('ph-1')).toEqual([])
    })
  })

  describe('listTasksByWorkflow', () => {
    it('calls fn_list_workflow_tasks_by_workflow with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listTasksByWorkflow(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_workflow_tasks_by_workflow', { p_workflow_id: WF_ID })
    })
  })

  describe('upsertTask', () => {
    it('calls fn_upsert_workflow_task with defaults for missing fields', async () => {
      const task = { phase_id: 'ph-1', workflow_id: WF_ID, title: 'Task 1' }
      mockRpc.mockResolvedValue({ data: { id: 't-1', ...task }, error: null })
      await repo.upsertTask(task)
      expect(mockRpc).toHaveBeenCalledWith('fn_upsert_workflow_task', {
        p_phase_id: 'ph-1',
        p_workflow_id: WF_ID,
        p_title: 'Task 1',
        p_prompt_text: null,
        p_output_type: 'text',
        p_model_hint: null,
        p_ordinal: 0,
        p_id: null,
      })
    })
  })

  describe('deleteTask', () => {
    it('calls fn_delete_workflow_task with p_task_id', async () => {
      await repo.deleteTask('t-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_delete_workflow_task', { p_task_id: 't-1' })
    })
  })

  describe('reorderTasks', () => {
    it('calls fn_reorder_workflow_tasks with phase_id and ordered ids', async () => {
      await repo.reorderTasks('ph-1', ['t-2', 't-1'])
      expect(mockRpc).toHaveBeenCalledWith('fn_reorder_workflow_tasks', {
        p_phase_id: 'ph-1',
        p_ordered_ids: ['t-2', 't-1'],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Versioning
  // ---------------------------------------------------------------------------

  const VERSION_ID = 'version-uuid-1'

  const fakeVersion = {
    id: VERSION_ID,
    workflow_id: WF_ID,
    version_number: 1,
    changelog: 'Initial version',
    status: 'draft',
    published_at: null,
    created_by: LENSER_ID,
    created_at: '2026-01-01T00:00:00Z',
    node_count: 2,
    edge_count: 1,
  }

  describe('getVersions', () => {
    it('calls fn_get_workflow_versions with p_workflow_id', async () => {
      mockRpc.mockResolvedValue({ data: [fakeVersion], error: null })
      const result = await repo.getVersions(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_workflow_versions', { p_workflow_id: WF_ID })
      expect(result).toEqual([fakeVersion])
    })

    it('returns empty array when no versions exist', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getVersions(WF_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('rpc error') })
      await expect(repo.getVersions(WF_ID)).rejects.toThrow('rpc error')
    })
  })

  describe('createVersion', () => {
    it('calls fn_create_workflow_version with workflow_id and changelog', async () => {
      mockRpc.mockResolvedValue({ data: VERSION_ID, error: null })
      const result = await repo.createVersion(WF_ID, 'v1 release')
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow_version', {
        p_workflow_id: WF_ID,
        p_changelog: 'v1 release',
      })
      expect(result).toBe(VERSION_ID)
    })

    it('passes null changelog when omitted', async () => {
      mockRpc.mockResolvedValue({ data: VERSION_ID, error: null })
      await repo.createVersion(WF_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_create_workflow_version', {
        p_workflow_id: WF_ID,
        p_changelog: null,
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('create version error') })
      await expect(repo.createVersion(WF_ID)).rejects.toThrow('create version error')
    })
  })

  describe('publishVersion', () => {
    it('calls fn_publish_workflow_version with p_version_id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.publishVersion(VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_publish_workflow_version', { p_version_id: VERSION_ID })
    })

    it('rethrows errors on failure', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('already published') })
      await expect(repo.publishVersion(VERSION_ID)).rejects.toThrow('already published')
    })
  })

  describe('restoreVersion', () => {
    it('calls fn_restore_workflow_version with p_version_id', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await repo.restoreVersion(VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_restore_workflow_version', { p_version_id: VERSION_ID })
    })

    it('rethrows errors on failure', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('not found') })
      await expect(repo.restoreVersion(VERSION_ID)).rejects.toThrow('not found')
    })
  })

  describe('startRun — version binding', () => {
    const fakeRunWithVersion = {
      ...fakeRun,
      workflow_version_id: VERSION_ID,
    }

    beforeEach(() => {
      // First rpc call starts the run, second fetches the run record
      mockRpc
        .mockResolvedValueOnce({ data: RUN_ID, error: null })           // fn_start_workflow_run
        .mockResolvedValueOnce({ data: [fakeRunWithVersion], error: null }) // fn_get_workflow_run
    })

    it('passes p_version_id when versionId is provided', async () => {
      await repo.startRun(WF_ID, {}, undefined, undefined, VERSION_ID)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_start_workflow_run',
        expect.objectContaining({ p_version_id: VERSION_ID }),
      )
    })

    it('does NOT include p_version_id when versionId is omitted', async () => {
      await repo.startRun(WF_ID, {})
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_start_workflow_run',
        expect.not.objectContaining({ p_version_id: expect.anything() }),
      )
    })

    it('does NOT include p_version_id when versionId is null', async () => {
      await repo.startRun(WF_ID, {}, undefined, undefined, null)
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_start_workflow_run',
        expect.not.objectContaining({ p_version_id: expect.anything() }),
      )
    })

    it('returned run record exposes workflow_version_id', async () => {
      const result = await repo.startRun(WF_ID, {}, undefined, undefined, VERSION_ID)
      expect(result.workflow_version_id).toBe(VERSION_ID)
    })
  })
})
