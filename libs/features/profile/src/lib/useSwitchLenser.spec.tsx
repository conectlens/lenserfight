import { queryKeys } from '@lenserfight/data/cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSwitchLenser } from './useSwitchLenser'

import type { WorkspaceIdentity } from '@lenserfight/types'

const { mockRpc, mockGetActiveLenser, mockClearActiveProfileCaches } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetActiveLenser: vi.fn(),
  mockClearActiveProfileCaches: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('@lenserfight/data/repositories', () => ({
  lenserService: {
    getActiveLenser: (...args: unknown[]) => mockGetActiveLenser(...args),
  },
}))

vi.mock('./activeProfileCache', () => ({
  clearActiveProfileCaches: () => mockClearActiveProfileCaches(),
}))


function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSwitchLenser', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockGetActiveLenser.mockReset()
    mockClearActiveProfileCaches.mockReset()
    mockRpc.mockResolvedValue({ error: null })
    mockGetActiveLenser.mockResolvedValue({
      id: 'human-1',
      handle: 'skyfall',
      user_id: 'user-1',
    })
  })

  it('switches the active profile, patches cache state, and refetches the authenticated profile', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData<WorkspaceIdentity[]>(queryKeys.lenser.myLensers(), [
      {
        id: 'human-1',
        handle: 'skyfall',
        display_name: 'Skyfall',
        avatar_url: null,
        type: 'human',
        is_active: false,
      },
      {
        id: 'ai-1',
        handle: 'sky-bot',
        display_name: 'Sky Bot',
        avatar_url: null,
        type: 'ai',
        is_active: true,
      },
    ])
    queryClient.setQueryData(queryKeys.agents.detail('ai-1'), { id: 'ai-1' })
    queryClient.setQueryData(queryKeys.workflows.byLenser('human-1'), [{ id: 'workflow-1' }])
    queryClient.setQueryData(queryKeys.lenser.profile('skyfall'), { id: 'human-1' })

    const { result } = renderHook(() => useSwitchLenser(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.switchLenser('human-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('fn_switch_active_lenser', {
      p_lenser_id: 'human-1',
    })
    expect(mockClearActiveProfileCaches).toHaveBeenCalledTimes(1)
    expect(mockGetActiveLenser).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(queryKeys.lenser.authenticated())).toEqual({
      id: 'human-1',
      handle: 'skyfall',
      user_id: 'user-1',
    })
    expect(queryClient.getQueryData(queryKeys.lenser.myLensers())).toEqual([
      {
        id: 'human-1',
        handle: 'skyfall',
        display_name: 'Skyfall',
        avatar_url: null,
        type: 'human',
        is_active: true,
      },
      {
        id: 'ai-1',
        handle: 'sky-bot',
        display_name: 'Sky Bot',
        avatar_url: null,
        type: 'ai',
        is_active: false,
      },
    ])

    await waitFor(() => {
      expect(queryClient.getQueryState(queryKeys.agents.detail('ai-1'))?.isInvalidated).toBe(
        true
      )
      expect(
        queryClient.getQueryState(queryKeys.workflows.byLenser('human-1'))?.isInvalidated
      ).toBe(true)
      expect(queryClient.getQueryState(queryKeys.lenser.profile('skyfall'))?.isInvalidated).toBe(
        true
      )
    })
  })
})
