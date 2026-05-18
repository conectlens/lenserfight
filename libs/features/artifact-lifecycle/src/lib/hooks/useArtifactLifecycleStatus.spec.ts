import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const { mockGetStatus } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  artifactLifecycleRepository: {
    getStatus: mockGetStatus,
  },
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    artifactLifecycle: {
      all: ['artifactLifecycle'],
      status: (type: string, id: string) => ['artifactLifecycle', 'status', type, id],
    },
  },
}))

import { useArtifactLifecycleStatus } from './useArtifactLifecycleStatus'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockStatus = {
  artifact_type: 'lens' as const,
  artifact_id: 'lens-1',
  state: 'published',
  visibility: 'public',
  archived_at: null,
  deleted_at: null,
  pinned: false,
  version_id: 'v1',
  snapshot_hash: null,
  dependency_summary: {
    artifact_type: 'lens',
    artifact_id: 'lens-1',
    counts: {},
    total: 0,
    blocking_reasons: [],
    has_dependencies: false,
    can_hard_delete: true,
  },
}

describe('useArtifactLifecycleStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockResolvedValue(mockStatus)
  })

  it('fetches lifecycle status when type and id are provided', async () => {
    const { result } = renderHook(
      () => useArtifactLifecycleStatus('lens', 'lens-1'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetStatus).toHaveBeenCalledWith('lens', 'lens-1')
    expect(result.current.data?.state).toBe('published')
  })

  it('is disabled when id is undefined', async () => {
    const { result } = renderHook(
      () => useArtifactLifecycleStatus('lens', undefined),
      { wrapper: makeWrapper() },
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetStatus).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('is disabled when type is undefined', async () => {
    const { result } = renderHook(
      () => useArtifactLifecycleStatus(undefined, 'lens-1'),
      { wrapper: makeWrapper() },
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetStatus).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('is disabled when options.enabled is false', async () => {
    const { result } = renderHook(
      () => useArtifactLifecycleStatus('lens', 'lens-1', { enabled: false }),
      { wrapper: makeWrapper() },
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetStatus).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })
})
