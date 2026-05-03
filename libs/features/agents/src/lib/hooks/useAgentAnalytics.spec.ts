import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { AgentAnalyticsSummary } from '@lenserfight/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetAgentAnalyticsSummary = vi.fn()

vi.mock('@lenserfight/data/repositories', () => ({
  // Must use a regular function (not arrow) so vitest can use it as a constructor with `new`
  SupabaseAgentAnalyticsRepository: vi.fn().mockImplementation(function () {
    return { getAgentAnalyticsSummary: mockGetAgentAnalyticsSummary }
  }),
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    agents: {
      analyticsSummary: (aiLenserId: string, options: object = {}) =>
        ['agents', 'analyticsSummary', aiLenserId, options],
    },
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SUMMARY: AgentAnalyticsSummary = {
  cost_by_model: [
    {
      model_key: 'gpt-4o',
      provider: 'openai',
      total_credits: 120,
      total_tokens_in: 8000,
      total_tokens_out: 4000,
      run_count: 10,
    },
  ],
  cost_time_series: [
    { period_date: '2026-05-01', total_credits: 60 },
    { period_date: '2026-05-02', total_credits: 60 },
  ],
  eval_quality: [
    {
      period_date: '2026-05-01',
      evaluation_name: 'Suite A',
      pass_rate: 0.9,
      mean_score: 0.88,
    },
  ],
  workflow_perf: [
    {
      period_date: '2026-05-01',
      workflow_title: 'Daily sync',
      p50_duration_ms: 1000,
      p95_duration_ms: 3000,
      failure_rate: 0.02,
    },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgentAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is in loading state initially when aiLenserId is provided', async () => {
    mockGetAgentAnalyticsSummary.mockResolvedValue(MOCK_SUMMARY)

    const { useAgentAnalytics } = await import('./useAgentAnalytics')
    const { result } = renderHook(() => useAgentAnalytics('agent-1'), {
      wrapper: makeWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns data on successful resolve', async () => {
    mockGetAgentAnalyticsSummary.mockResolvedValue(MOCK_SUMMARY)

    const { useAgentAnalytics } = await import('./useAgentAnalytics')
    const { result } = renderHook(() => useAgentAnalytics('agent-1'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(MOCK_SUMMARY)
    expect(result.current.data?.cost_by_model).toHaveLength(1)
    expect(result.current.data?.eval_quality[0].pass_rate).toBe(0.9)
  })

  it('is disabled when aiLenserId is undefined', async () => {
    mockGetAgentAnalyticsSummary.mockResolvedValue(MOCK_SUMMARY)

    const { useAgentAnalytics } = await import('./useAgentAnalytics')
    const { result } = renderHook(() => useAgentAnalytics(undefined), {
      wrapper: makeWrapper(),
    })

    // enabled: false means it will never fire
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetAgentAnalyticsSummary).not.toHaveBeenCalled()
  })

  it('is disabled when aiLenserId is an empty string', async () => {
    mockGetAgentAnalyticsSummary.mockResolvedValue(MOCK_SUMMARY)

    const { useAgentAnalytics } = await import('./useAgentAnalytics')
    const { result } = renderHook(() => useAgentAnalytics(''), {
      wrapper: makeWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetAgentAnalyticsSummary).not.toHaveBeenCalled()
  })

  it('different options produce different query keys (stale isolation)', async () => {
    mockGetAgentAnalyticsSummary.mockResolvedValue(MOCK_SUMMARY)

    const { useAgentAnalytics } = await import('./useAgentAnalytics')

    const wrapper = makeWrapper()
    const { result: result7 } = renderHook(
      () => useAgentAnalytics('agent-1', { days: 7 }),
      { wrapper }
    )
    const { result: result30 } = renderHook(
      () => useAgentAnalytics('agent-1', { days: 30 }),
      { wrapper }
    )

    await waitFor(() => expect(result7.current.isSuccess).toBe(true))
    await waitFor(() => expect(result30.current.isSuccess).toBe(true))

    // Both queries should have fired independently
    expect(mockGetAgentAnalyticsSummary).toHaveBeenCalledTimes(2)
  })
})
