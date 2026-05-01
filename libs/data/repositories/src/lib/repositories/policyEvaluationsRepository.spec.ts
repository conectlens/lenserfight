import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc, mockSchema, mockFrom, mockSelect, mockEq, mockOrder, mockLimit, chainMethods } =
  vi.hoisted(() => {
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockOrder = vi.fn()
    const mockLimit = vi.fn()
    const chainMethods = { select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit }
    Object.values(chainMethods).forEach((m) => m.mockReturnValue(chainMethods))
    return {
      mockRpc: vi.fn(),
      mockSchema: vi.fn(),
      mockFrom: vi.fn(),
      mockSelect,
      mockEq,
      mockOrder,
      mockLimit,
      chainMethods,
    }
  })

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    schema: mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) }),
    rpc: mockRpc,
  },
}))

import { SupabasePolicyEvaluationsRepository } from './policyEvaluationsRepository'

describe('SupabasePolicyEvaluationsRepository', () => {
  let repo: SupabasePolicyEvaluationsRepository

  beforeEach(() => {
    repo = new SupabasePolicyEvaluationsRepository()
    vi.clearAllMocks()
    mockSchema.mockReturnValue({ from: mockFrom.mockReturnValue(chainMethods) })
    Object.values(chainMethods).forEach((mock) => mock.mockReturnValue(chainMethods))
  })

  describe('listPolicyLog', () => {
    it('queries policy_evaluations by ai_lenser_id', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listPolicyLog('agent-1', { limit: 10 })
      expect(mockSchema).toHaveBeenCalledWith('agents')
      expect(mockFrom).toHaveBeenCalledWith('policy_evaluations')
      expect(mockEq).toHaveBeenCalledWith('ai_lenser_id', 'agent-1')
      expect(mockOrder).toHaveBeenCalledWith('evaluated_at', { ascending: false })
    })

    it('filters by verdict when provided', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })
      await repo.listPolicyLog('agent-1', { verdict: 'deny', limit: 5 })
      expect(mockEq).toHaveBeenCalledWith('verdict', 'deny')
      expect(mockLimit).toHaveBeenCalledWith(5)
    })
  })

  describe('evaluatePreRunPolicy', () => {
    it('calls fn_evaluate_pre_run_policy with correct params', async () => {
      mockRpc.mockResolvedValue({
        data: [{ verdict: 'allow', reason: null }],
        error: null,
      })
      const result = await repo.evaluatePreRunPolicy('agent-1', 'workflow-1')
      expect(mockRpc).toHaveBeenCalledWith('fn_evaluate_pre_run_policy', {
        p_ai_lenser_id: 'agent-1',
        p_workflow_id: 'workflow-1',
        p_context: {},
      })
      expect(result.verdict).toBe('allow')
      expect(result.reason).toBeNull()
    })

    it('returns deny verdict when kill switch active', async () => {
      mockRpc.mockResolvedValue({
        data: [{ verdict: 'deny', reason: 'global kill switch active' }],
        error: null,
      })
      const result = await repo.evaluatePreRunPolicy('agent-1', null)
      expect(result.verdict).toBe('deny')
      expect(result.reason).toBe('global kill switch active')
    })

    it('defaults to allow when empty rows returned', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      const result = await repo.evaluatePreRunPolicy('agent-1', null)
      expect(result.verdict).toBe('allow')
    })

    it('throws when RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('policy rpc error') })
      await expect(repo.evaluatePreRunPolicy('agent-1', null)).rejects.toThrow('policy rpc error')
    })
  })
})
