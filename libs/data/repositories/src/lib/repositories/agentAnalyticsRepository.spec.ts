import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

import { SupabaseAgentAnalyticsRepository } from './agentAnalyticsRepository'
import type { AgentAnalyticsSummary } from '@lenserfight/types'

const MOCK_SUMMARY: AgentAnalyticsSummary = {
  cost_by_model: [
    {
      model_key: 'gpt-4o',
      provider: 'openai',
      total_credits: 150,
      total_tokens_in: 10000,
      total_tokens_out: 5000,
      run_count: 12,
    },
  ],
  cost_time_series: [
    { period_date: '2026-05-01', total_credits: 50 },
    { period_date: '2026-05-02', total_credits: 100 },
  ],
  eval_quality: [
    {
      period_date: '2026-05-01',
      evaluation_name: 'Suite A',
      pass_rate: 0.85,
      mean_score: 0.9,
    },
  ],
  workflow_perf: [
    {
      period_date: '2026-05-01',
      workflow_title: 'Daily sync',
      p50_duration_ms: 1200,
      p95_duration_ms: 3500,
      failure_rate: 0.05,
    },
  ],
}

describe('SupabaseAgentAnalyticsRepository', () => {
  let repo: SupabaseAgentAnalyticsRepository

  beforeEach(() => {
    repo = new SupabaseAgentAnalyticsRepository()
    vi.clearAllMocks()
  })

  describe('getAgentAnalyticsSummary', () => {
    it('calls the correct RPC name', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_SUMMARY, error: null })
      await repo.getAgentAnalyticsSummary('agent-1')
      expect(mockRpc).toHaveBeenCalledWith(
        'fn_get_agent_analytics_summary',
        expect.any(Object)
      )
    })

    it('passes the correct param names', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_SUMMARY, error: null })
      await repo.getAgentAnalyticsSummary('agent-1', {
        days: 14,
        modelKey: 'gpt-4o',
        workflowId: 'wf-xyz',
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_analytics_summary', {
        p_ai_lenser_id: 'agent-1',
        p_days: 14,
        p_model_key: 'gpt-4o',
        p_workflow_id: 'wf-xyz',
      })
    })

    it('defaults days to 30 and optional filters to null when not provided', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_SUMMARY, error: null })
      await repo.getAgentAnalyticsSummary('agent-2')
      expect(mockRpc).toHaveBeenCalledWith('fn_get_agent_analytics_summary', {
        p_ai_lenser_id: 'agent-2',
        p_days: 30,
        p_model_key: null,
        p_workflow_id: null,
      })
    })

    it('rethrows error when RPC returns an error', async () => {
      const rpcError = new Error('rpc failed')
      mockRpc.mockResolvedValue({ data: null, error: rpcError })
      await expect(repo.getAgentAnalyticsSummary('agent-1')).rejects.toThrow('rpc failed')
    })

    it('returns data typed as AgentAnalyticsSummary', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_SUMMARY, error: null })
      const result = await repo.getAgentAnalyticsSummary('agent-1')
      expect(result).toEqual(MOCK_SUMMARY)
      expect(result.cost_by_model).toHaveLength(1)
      expect(result.cost_time_series).toHaveLength(2)
      expect(result.eval_quality).toHaveLength(1)
      expect(result.workflow_perf).toHaveLength(1)
    })
  })
})
