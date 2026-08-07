// useWorkflowRun — executor routing, client liveness, and rehydration.
//
// The bug this covers: a run started from the builder was created with
// trigger_mode='manual', which no server-side claimer would touch, and executed
// only by the tab that started it. Closing the tab abandoned the run at
// status='pending' forever. Runs now default to worker execution, and the runs
// that genuinely must stay in the browser (BYOK, whose key never leaves the tab)
// prove they are alive with a heartbeat so an abandoned one gets reaped.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockStartRun,
  mockGetNodeResults,
  mockGetRun,
  mockHeartbeat,
  mockUpdateRunStatus,
  mockRemoveChannel,
} = vi.hoisted(() => ({
  mockStartRun: vi.fn(),
  mockGetNodeResults: vi.fn(),
  mockGetRun: vi.fn(),
  mockHeartbeat: vi.fn(),
  mockUpdateRunStatus: vi.fn(),
  mockRemoveChannel: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  workflowsService: {
    startRun: (...args: unknown[]) => mockStartRun(...args),
    getNodeResults: (...args: unknown[]) => mockGetNodeResults(...args),
    getRun: (...args: unknown[]) => mockGetRun(...args),
    heartbeatClientRun: (...args: unknown[]) => mockHeartbeat(...args),
    updateRunStatus: (...args: unknown[]) => mockUpdateRunStatus(...args),
  },
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    channel: () => ({
      on() {
        return this
      },
      subscribe() {
        return this
      },
    }),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

import { useWorkflowRun } from './useWorkflowRun'

const RUN_ID = 'run-uuid-1'
const WF_ID = 'workflow-uuid-1'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockStartRun.mockResolvedValue({ id: RUN_ID })
  mockGetNodeResults.mockResolvedValue([])
  mockGetRun.mockResolvedValue({ id: RUN_ID, executor: 'worker' })
  mockHeartbeat.mockResolvedValue(undefined)
  mockUpdateRunStatus.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Executor routing ──────────────────────────────────────────────────────────

describe('startRun executor routing', () => {
  it('defaults to worker execution so a closed tab does not abandon the run', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {} })
    })

    expect(mockStartRun).toHaveBeenCalledWith(WF_ID, {}, undefined, expect.anything(), null, 'worker')
  })

  it('forwards an explicit client executor for browser-held credentials', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })

    expect(mockStartRun).toHaveBeenCalledWith(WF_ID, {}, undefined, expect.anything(), null, 'client')
  })

  it('exposes the executor of the run it started', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })

    expect(result.current.executor).toBe('client')
  })

  it('passes the derived idempotency key through', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: { a: 1 } })
    })

    const key = mockStartRun.mock.calls[0][3]
    expect(typeof key).toBe('string')
    expect((key as string).length).toBeGreaterThan(0)
  })

  it('opts out of idempotency when the key is explicitly null', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, idempotencyKey: null })
    })

    expect(mockStartRun.mock.calls[0][3]).toBeUndefined()
  })
})

// ── Client liveness ───────────────────────────────────────────────────────────

describe('client heartbeat', () => {
  it('beats immediately when a client-executed run starts', async () => {
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })

    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalledWith(RUN_ID))
  })

  it('does not beat for a worker-executed run', async () => {
    // A tab merely watching a server-driven run must not keep it alive; the
    // worker's own heartbeat is the authority there.
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'worker' })
    })

    expect(mockHeartbeat).not.toHaveBeenCalled()
  })

  it('keeps beating on an interval while the run is in flight', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })
    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalledTimes(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000)
    })

    // 30s cadence → three further beats inside 90s.
    expect(mockHeartbeat.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('stops beating once the tab unmounts, so the run can be reaped', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result, unmount } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })
    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalled())

    unmount()
    const afterUnmount = mockHeartbeat.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })

    expect(mockHeartbeat.mock.calls.length).toBe(afterUnmount)
  })

  it('survives a failed beat without surfacing an error', async () => {
    mockHeartbeat.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })

    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalled())
    expect(result.current.runId).toBe(RUN_ID)
  })

  it('stops beating once the run reaches a terminal state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useWorkflowRun(WF_ID), { wrapper })

    await act(async () => {
      await result.current.startRun({ inputs: {}, executor: 'client' })
    })
    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalled())

    act(() => {
      result.current.stopRun()
    })
    const afterStop = mockHeartbeat.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })

    expect(mockHeartbeat.mock.calls.length).toBe(afterStop)
  })
})

// ── Rehydration ───────────────────────────────────────────────────────────────

describe('rehydration from a run id', () => {
  it('adopts an initialRunId without startRun being called', async () => {
    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    expect(result.current.runId).toBe(RUN_ID)
    expect(mockStartRun).not.toHaveBeenCalled()
    // Let the mount-time lookups settle so their state updates land inside the test.
    await waitFor(() => expect(mockGetRun).toHaveBeenCalled())
  })

  it('loads existing node results for the adopted run', async () => {
    renderHook(() => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }), { wrapper })
    await waitFor(() => expect(mockGetNodeResults).toHaveBeenCalledWith(RUN_ID))
  })

  it('reports a partially-finished run as still running', async () => {
    mockGetNodeResults.mockResolvedValue([
      { id: '1', status: 'completed' },
      { id: '2', status: 'running' },
    ])

    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isRunning).toBe(true))
  })

  it('reports a finished run as not running', async () => {
    mockGetNodeResults.mockResolvedValue([
      { id: '1', status: 'completed' },
      { id: '2', status: 'completed' },
    ])

    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.nodeResults).toHaveLength(2))
    expect(result.current.isRunning).toBe(false)
  })

  it('recovers the executor of the adopted run so heartbeating resumes', async () => {
    // Without this, reattaching to a client-executed run would leave it
    // un-heartbeated and the reaper would retire a run whose tab is open.
    mockGetRun.mockResolvedValue({ id: RUN_ID, executor: 'client' })
    mockGetNodeResults.mockResolvedValue([{ id: '1', status: 'running' }])

    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.executor).toBe('client'))
    await waitFor(() => expect(mockHeartbeat).toHaveBeenCalledWith(RUN_ID))
  })

  it('does not heartbeat an adopted worker-executed run', async () => {
    mockGetRun.mockResolvedValue({ id: RUN_ID, executor: 'worker' })
    mockGetNodeResults.mockResolvedValue([{ id: '1', status: 'running' }])

    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isRunning).toBe(true))
    expect(mockHeartbeat).not.toHaveBeenCalled()
  })

  it('tolerates getRun failing during rehydration', async () => {
    mockGetRun.mockRejectedValue(new Error('not found'))
    mockGetNodeResults.mockResolvedValue([{ id: '1', status: 'running' }])

    const { result } = renderHook(
      () => useWorkflowRun(WF_ID, { initialRunId: RUN_ID }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isRunning).toBe(true))
    expect(result.current.executor).toBeNull()
  })
})
