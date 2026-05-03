import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import type { AgentAnalyticsSummary } from '@lenserfight/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseAgentWorkspace = vi.fn()
const mockUseAgentAnalytics = vi.fn()

vi.mock('../../context/AgentWorkspaceContext', () => ({
  useAgentWorkspace: mockUseAgentWorkspace,
}))

vi.mock('../../hooks/useAgentAnalytics', () => ({
  useAgentAnalytics: mockUseAgentAnalytics,
}))

// recharts uses ResizeObserver; stub it in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: () => null,
  LineChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'line-chart' }, children),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_BOOTSTRAP = {
  ai_lenser_id: 'ai-lenser-1',
  profile_id: 'profile-1',
}

const MOCK_SUMMARY: AgentAnalyticsSummary = {
  cost_by_model: [
    {
      model_key: 'gpt-4o',
      provider: 'openai',
      total_credits: 200,
      total_tokens_in: 12000,
      total_tokens_out: 6000,
      run_count: 20,
    },
  ],
  cost_time_series: [
    { period_date: '2026-05-01', total_credits: 100 },
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalyticsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton blocks when isLoading is true', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: MOCK_BOOTSTRAP,
      bootstrapState: { kind: 'loading' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    const { container } = render(React.createElement(AnalyticsSection))

    // Three skeleton pulse blocks
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('shows CostDashboardPanel content when data is loaded', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: MOCK_BOOTSTRAP,
      bootstrapState: { kind: 'ready' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: MOCK_SUMMARY,
      isLoading: false,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(React.createElement(AnalyticsSection))

    // Model key appears in the cost table
    expect(screen.getByText('gpt-4o')).toBeDefined()
    expect(screen.getByText('openai')).toBeDefined()
  })

  it('shows QualityMetricsPanel with line charts when eval data is present', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: MOCK_BOOTSTRAP,
      bootstrapState: { kind: 'ready' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: MOCK_SUMMARY,
      isLoading: false,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(React.createElement(AnalyticsSection))

    // The "Evaluation quality" heading is rendered
    expect(screen.getByText('Evaluation quality')).toBeDefined()
    // No "No evaluation data" fallback message
    expect(screen.queryByText('No evaluation data')).toBeNull()
  })

  it('shows WorkflowTimelinePanel with failure rate pills', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: MOCK_BOOTSTRAP,
      bootstrapState: { kind: 'ready' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: MOCK_SUMMARY,
      isLoading: false,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(React.createElement(AnalyticsSection))

    // Failure rate pill: title is inline text in the pill span, use partial match
    expect(screen.getByText('5.0% failures')).toBeDefined()
    expect(screen.getByText(/Daily sync/)).toBeDefined()
  })

  it('shows EmptyPanel when bootstrap is null and bootstrapState is idle', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: null,
      bootstrapState: { kind: 'idle' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(React.createElement(AnalyticsSection))

    expect(screen.getByText('No analytics data')).toBeDefined()
  })

  it('shows empty fallback messages when data arrays are empty', async () => {
    mockUseAgentWorkspace.mockReturnValue({
      bootstrap: MOCK_BOOTSTRAP,
      bootstrapState: { kind: 'ready' },
    })
    mockUseAgentAnalytics.mockReturnValue({
      data: {
        cost_by_model: [],
        cost_time_series: [],
        eval_quality: [],
        workflow_perf: [],
      } satisfies AgentAnalyticsSummary,
      isLoading: false,
    })

    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(React.createElement(AnalyticsSection))

    expect(screen.getByText('No evaluation data')).toBeDefined()
    expect(screen.getByText('No workflow performance data')).toBeDefined()
  })
})
