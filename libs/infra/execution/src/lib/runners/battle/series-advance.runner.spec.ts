// SeriesAdvanceRunner — Phase CU tests
// Mocks globalThis.fetch via vi.stubGlobal so no real HTTP calls fire.

import { vi, afterEach, beforeAll, describe, it, expect } from 'vitest'

import { SeriesAdvanceRunner } from './series-advance.runner'
import type { NodeRunnerContext } from '../node-runner.interface'

beforeAll(() => {
  process.env['SUPABASE_URL']              = 'https://test.supabase.co'
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key'
})

function makeCtx(
  nodeConfig: Record<string, unknown> = { seriesId: 'series-123' },
  resolvedParams: Record<string, unknown> = {},
): NodeRunnerContext {
  return {
    nodeId:          'series-advance-node',
    upstreamOutputs: new Map(),
    resolvedParams,
    nodeConfig,
  }
}

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok:         status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json:       () => Promise.resolve(body),
    text:       () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }))
}

describe('SeriesAdvanceRunner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('has nodeType = series_advance', () => {
    expect(new SeriesAdvanceRunner().nodeType).toBe('series_advance')
  })

  it('returns error output when seriesId is missing from both nodeConfig and resolvedParams', async () => {
    mockFetch(200, {})
    const ctx = makeCtx({}, {})
    const result = await new SeriesAdvanceRunner().execute(ctx)
    expect(result.output.data?.['error']).toMatch(/seriesId is required/)
  })

  it('falls back to resolvedParams.seriesId when nodeConfig has none', async () => {
    mockFetch(200, { id: 'series-123', status: 'active', current_round: 2, round_count: 3 })
    const ctx = makeCtx({}, { seriesId: 'series-from-params' })
    const result = await new SeriesAdvanceRunner().execute(ctx)
    expect(result.output.data?.['seriesId']).toBe('series-from-params')
  })

  it('returns seriesComplete=true when fn_advance_series flips status to complete', async () => {
    mockFetch(200, { id: 'series-123', status: 'complete', current_round: 3, round_count: 3 })
    const result = await new SeriesAdvanceRunner().execute(makeCtx())
    expect(result.output.data?.['seriesComplete']).toBe(true)
    expect(result.output.data?.['currentRound']).toBe(3)
  })

  it('returns seriesComplete=false when round advances mid-series', async () => {
    mockFetch(200, { id: 'series-123', status: 'active', current_round: 2, round_count: 3 })
    const result = await new SeriesAdvanceRunner().execute(makeCtx())
    expect(result.output.data?.['seriesComplete']).toBe(false)
  })

  it('returns retry envelope when fn_advance_series raises current_round_has_no_winner', async () => {
    mockFetch(400, 'PostgrestError: current_round_has_no_winner')
    const result = await new SeriesAdvanceRunner().execute(makeCtx())
    expect(result.output.data?.['retry']).toBe(true)
    expect(result.output.data?.['retryAfterSeconds']).toBe(60)
    expect(result.output.data?.['reason']).toBe('current_round_unfinished')
  })

  it('throws on non-retry-able errors', async () => {
    mockFetch(500, 'internal error')
    await expect(new SeriesAdvanceRunner().execute(makeCtx())).rejects.toThrow(/returned 500/)
  })
})
