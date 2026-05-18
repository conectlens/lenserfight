import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const { mockArchive, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockArchive: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  artifactLifecycleRepository: {
    archive: mockArchive,
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

import { useArchiveArtifact } from './useArchiveArtifact'

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
  state: 'archived',
  visibility: null,
  archived_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  pinned: false,
  version_id: null,
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

describe('useArchiveArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockArchive.mockResolvedValue(mockStatus)
  })

  it('calls archive on the repository with correct args', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useArchiveArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockArchive).toHaveBeenCalledWith('lens', 'lens-1')
  })

  it('toasts success on archive', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useArchiveArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockToastSuccess).toHaveBeenCalledWith('Archived successfully.')
  })

  it('toasts error on failure', async () => {
    mockArchive.mockRejectedValue(new Error('Server error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useArchiveArtifact(), { wrapper })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockToastError).toHaveBeenCalledWith('Server error')
  })

  it('invalidates extra keys on success', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useArchiveArtifact(), { wrapper })

    const extraKey = ['lenses', 'detail', 'lens-1']
    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1', extraInvalidateKeys: [extraKey] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: extraKey }))
  })
})
