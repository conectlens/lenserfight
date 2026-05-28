import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { SupabaseToolsRepository } from './toolsRepository'

const AI_LENSER_ID = 'agent-uuid-1'
const INVOCATION_ID = 'invocation-uuid-1'
const TOOL_ID = 'tool-uuid-1'
const TEAM_RUN_ID = 'run-uuid-1'
const LOG_ID = 'log-uuid-1'

const rawInvocation = {
  id: INVOCATION_ID,
  tool_id: TOOL_ID,
  ai_lenser_id: AI_LENSER_ID,
  team_run_id: TEAM_RUN_ID,
  status: 'pending',
  approval_status: 'pending',
  input: {},
  output: null,
  error: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('SupabaseToolsRepository', () => {
  let repo: SupabaseToolsRepository

  beforeEach(() => {
    repo = new SupabaseToolsRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // listInvocations
  // ---------------------------------------------------------------------------
  describe('listInvocations', () => {
    it('calls fn_list_agent_tools with default limit 100', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_tools', {
        p_ai_lenser_id: AI_LENSER_ID,
        p_limit: 100,
        p_cursor: null,
      })
    })

    it('falls back to limit 100 when limit is 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID, limit: 0 })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_tools', expect.objectContaining({ p_limit: 100 }))
    })

    it('uses provided limit', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID, limit: 20 })
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_tools', expect.objectContaining({ p_limit: 20 }))
    })

    it('filters by team_run_id client-side', async () => {
      const rows = [
        { ...rawInvocation, team_run_id: TEAM_RUN_ID },
        { ...rawInvocation, id: 'inv-2', team_run_id: 'other-run' },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID, team_run_id: TEAM_RUN_ID })
      expect(result).toHaveLength(1)
      expect((result[0] as any).team_run_id).toBe(TEAM_RUN_ID)
    })

    it('filters by status client-side', async () => {
      const rows = [
        { ...rawInvocation, status: 'pending' },
        { ...rawInvocation, id: 'inv-2', status: 'completed' },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID, status: 'pending' as any })
      expect(result).toHaveLength(1)
      expect((result[0] as any).status).toBe('pending')
    })

    it('filters by approval_status client-side', async () => {
      const rows = [
        { ...rawInvocation, approval_status: 'pending' },
        { ...rawInvocation, id: 'inv-2', approval_status: 'approved' },
      ]
      mockRpc.mockResolvedValue({ data: rows, error: null })
      const result = await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID, approval_status: 'pending' as any })
      expect(result).toHaveLength(1)
    })

    it('returns all rows when no filters applied', async () => {
      mockRpc.mockResolvedValue({ data: [rawInvocation], error: null })
      const result = await repo.listInvocations({ ai_lenser_id: AI_LENSER_ID })
      expect(result).toEqual([rawInvocation])
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.listInvocations()).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('list error') })
      await expect(repo.listInvocations({ ai_lenser_id: AI_LENSER_ID })).rejects.toThrow('list error')
    })
  })

  // ---------------------------------------------------------------------------
  // listPendingApprovals
  // ---------------------------------------------------------------------------
  describe('listPendingApprovals', () => {
    it('delegates to listInvocations with approval_status=pending and limit 100', async () => {
      const pendingRow = { ...rawInvocation, approval_status: 'pending' }
      mockRpc.mockResolvedValue({ data: [pendingRow], error: null })
      const result = await repo.listPendingApprovals(AI_LENSER_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_list_agent_tools', {
        p_ai_lenser_id: AI_LENSER_ID,
        p_limit: 100,
        p_cursor: null,
      })
      expect(result).toHaveLength(1)
    })

    it('returns empty array when no pending approvals', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.listPendingApprovals(AI_LENSER_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // invokeTool
  // ---------------------------------------------------------------------------
  describe('invokeTool', () => {
    it('calls fn_invoke_tool with all fields and returns invocation id', async () => {
      mockRpc.mockResolvedValue({ data: INVOCATION_ID, error: null })
      const result = await repo.invokeTool({
        team_run_id: TEAM_RUN_ID,
        tool_id: TOOL_ID,
        ai_lenser_id: AI_LENSER_ID,
        input: { prompt: 'search' },
        agent_run_step_id: 'step-1',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_invoke_tool', {
        p_team_run_id: TEAM_RUN_ID,
        p_tool_id: TOOL_ID,
        p_ai_lenser_id: AI_LENSER_ID,
        p_input: { prompt: 'search' },
        p_agent_run_step_id: 'step-1',
      })
      expect(result).toBe(INVOCATION_ID)
    })

    it('defaults input to {} and agent_run_step_id to null when absent', async () => {
      mockRpc.mockResolvedValue({ data: INVOCATION_ID, error: null })
      await repo.invokeTool({ team_run_id: TEAM_RUN_ID, tool_id: TOOL_ID, ai_lenser_id: AI_LENSER_ID })
      expect(mockRpc).toHaveBeenCalledWith('fn_invoke_tool', expect.objectContaining({
        p_input: {},
        p_agent_run_step_id: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('invoke error') })
      await expect(repo.invokeTool({ team_run_id: TEAM_RUN_ID, tool_id: TOOL_ID, ai_lenser_id: AI_LENSER_ID })).rejects.toThrow('invoke error')
    })
  })

  // ---------------------------------------------------------------------------
  // completeInvocation
  // ---------------------------------------------------------------------------
  describe('completeInvocation', () => {
    it('calls fn_complete_tool_invocation with all fields', async () => {
      await repo.completeInvocation({
        invocation_id: INVOCATION_ID,
        status: 'completed',
        output: { result: 'ok' },
        error: null,
        cost_estimate: 0.002,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_complete_tool_invocation', {
        p_invocation_id: INVOCATION_ID,
        p_status: 'completed',
        p_output: { result: 'ok' },
        p_error: null,
        p_cost: 0.002,
      })
    })

    it('defaults output, error, and cost to null when absent', async () => {
      await repo.completeInvocation({ invocation_id: INVOCATION_ID, status: 'failed' as any })
      expect(mockRpc).toHaveBeenCalledWith('fn_complete_tool_invocation', expect.objectContaining({
        p_output: null,
        p_error: null,
        p_cost: null,
      }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('complete error') })
      await expect(repo.completeInvocation({ invocation_id: INVOCATION_ID, status: 'failed' as any })).rejects.toThrow('complete error')
    })
  })

  // ---------------------------------------------------------------------------
  // approveInvocation
  // ---------------------------------------------------------------------------
  describe('approveInvocation', () => {
    it('calls fn_approve_tool_invocation with p_invocation_id', async () => {
      await repo.approveInvocation(INVOCATION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_approve_tool_invocation', { p_invocation_id: INVOCATION_ID })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('approve error') })
      await expect(repo.approveInvocation(INVOCATION_ID)).rejects.toThrow('approve error')
    })
  })

  // ---------------------------------------------------------------------------
  // rejectInvocation
  // ---------------------------------------------------------------------------
  describe('rejectInvocation', () => {
    it('calls fn_reject_tool_invocation with p_invocation_id', async () => {
      await repo.rejectInvocation(INVOCATION_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_reject_tool_invocation', {
        p_invocation_id: INVOCATION_ID,
        p_reason: null,
      })
    })

    it('passes reason when provided', async () => {
      await repo.rejectInvocation(INVOCATION_ID, 'policy violation')
      expect(mockRpc).toHaveBeenCalledWith('fn_reject_tool_invocation', {
        p_invocation_id: INVOCATION_ID,
        p_reason: 'policy violation',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('reject error') })
      await expect(repo.rejectInvocation(INVOCATION_ID)).rejects.toThrow('reject error')
    })
  })

  // ---------------------------------------------------------------------------
  // recordToolDecision — distinct from approveInvocation: operates on audit log row, not invocation
  // ---------------------------------------------------------------------------
  describe('recordToolDecision', () => {
    it('calls fn_decide_tool_invocation (not fn_approve_tool_invocation) with log_id', async () => {
      await repo.recordToolDecision(LOG_ID, 'approved')
      expect(mockRpc).toHaveBeenCalledWith('fn_decide_tool_invocation', {
        p_log_id: LOG_ID,
        p_decision: 'approved',
        p_reason: null,
      })
    })

    it('does NOT call fn_approve_tool_invocation', async () => {
      await repo.recordToolDecision(LOG_ID, 'approved')
      const calledRpc = mockRpc.mock.calls[0][0]
      expect(calledRpc).not.toBe('fn_approve_tool_invocation')
    })

    it('supports rejected decision with reason', async () => {
      await repo.recordToolDecision(LOG_ID, 'rejected', 'safety review failed')
      expect(mockRpc).toHaveBeenCalledWith('fn_decide_tool_invocation', {
        p_log_id: LOG_ID,
        p_decision: 'rejected',
        p_reason: 'safety review failed',
      })
    })

    it('defaults reason to null when absent', async () => {
      await repo.recordToolDecision(LOG_ID, 'approved')
      expect(mockRpc).toHaveBeenCalledWith('fn_decide_tool_invocation', expect.objectContaining({ p_reason: null }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('decide error') })
      await expect(repo.recordToolDecision(LOG_ID, 'approved')).rejects.toThrow('decide error')
    })
  })
})
