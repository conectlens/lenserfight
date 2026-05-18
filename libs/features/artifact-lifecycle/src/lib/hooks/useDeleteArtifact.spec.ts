import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const { mockDelete, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  artifactLifecycleRepository: {
    delete: mockDelete,
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

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

import { useDeleteArtifact } from './useDeleteArtifact'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    queryClient,
  }
}

const mockStatus = {
  artifact_type: 'lens' as const,
  artifact_id: 'lens-1',
  state: 'deleted',
  visibility: null,
  archived_at: '2026-01-01T00:00:00Z',
  deleted_at: '2026-01-01T00:00:00Z',
  pinned: false,
  version_id: null,
  snapshot_hash: null,
  delete_mode: 'tombstone' as const,
  dependency_summary: {
    artifact_type: 'lens',
    artifact_id: 'lens-1',
    counts: {},
    total: 0,
    blocking_reasons: [],
    has_dependencies: false,
    can_hard_delete: false,
  },
}

describe('useDeleteArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDelete.mockResolvedValue(mockStatus)
  })

  it('calls delete on the repository', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDelete).toHaveBeenCalledWith('lens', 'lens-1')
  })

  it('toasts success on delete', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockToastSuccess).toHaveBeenCalledWith('Deleted successfully.')
  })

  it('calls onDeleted callback after successful delete', async () => {
    const onDeleted = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1', onDeleted })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it('mutation fires regardless of blocking_reasons — UI guard is caller responsibility', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('toasts error on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Blocked by DB'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockToastError).toHaveBeenCalledWith('Blocked by DB')
  })
})
