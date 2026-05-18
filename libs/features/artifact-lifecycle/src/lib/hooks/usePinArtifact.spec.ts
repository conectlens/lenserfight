import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const { mockPin, mockUnpin, mockToastSuccess } = vi.hoisted(() => ({
  mockPin: vi.fn(),
  mockUnpin: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  artifactLifecycleRepository: {
    pin: mockPin,
    unpin: mockUnpin,
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
    error: vi.fn(),
  },
}))

import { usePinArtifact } from './usePinArtifact'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockStatusPinned = {
  artifact_type: 'lens' as const,
  artifact_id: 'lens-1',
  state: 'published',
  visibility: 'public',
  archived_at: null,
  deleted_at: null,
  pinned: true,
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

describe('usePinArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPin.mockResolvedValue({ ...mockStatusPinned, pinned: true })
    mockUnpin.mockResolvedValue({ ...mockStatusPinned, pinned: false })
  })

  it('calls pin when pinned=true', async () => {
    const { result } = renderHook(() => usePinArtifact(), { wrapper: makeWrapper() })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1', pinned: true })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockPin).toHaveBeenCalledWith('lens', 'lens-1')
    expect(mockUnpin).not.toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('Pinned.')
  })

  it('calls unpin when pinned=false', async () => {
    const { result } = renderHook(() => usePinArtifact(), { wrapper: makeWrapper() })

    await act(async () => {
      result.current.mutate({ type: 'lens', id: 'lens-1', pinned: false })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUnpin).toHaveBeenCalledWith('lens', 'lens-1')
    expect(mockPin).not.toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('Unpinned.')
  })
})
