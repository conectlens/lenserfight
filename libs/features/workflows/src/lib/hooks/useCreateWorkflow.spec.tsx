import { queryKeys } from '@lenserfight/data/cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const { mockUseLenser, mockCreateWorkflow } = vi.hoisted(() => ({
  mockUseLenser: vi.fn(),
  mockCreateWorkflow: vi.fn(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => mockUseLenser(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  workflowsService: {
    createWorkflow: (...args: unknown[]) => mockCreateWorkflow(...args),
  },
}))

import { useCreateWorkflow } from './useCreateWorkflow'

describe('useCreateWorkflow', () => {
  it('uses the authenticated lenser id and invalidates the lenser workflow cache', async () => {
    mockCreateWorkflow.mockReset()
    mockUseLenser.mockReturnValue({ lenser: { id: 'lenser-123' } })
    mockCreateWorkflow.mockResolvedValue({
      id: 'workflow-1',
      lenser_id: 'lenser-123',
      title: 'Workflow title',
      description: null,
      visibility: 'public',
      battle_count: 0,
      created_at: '2026-03-26T00:00:00.000Z',
      updated_at: '2026-03-26T00:00:00.000Z',
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)

    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateWorkflow(), { wrapper })

    await act(async () => {
      await result.current.submit({
        title: 'Workflow title',
        description: 'A workflow',
        visibility: 'private',
      })
    })

    expect(mockCreateWorkflow).toHaveBeenCalledWith({
      title: 'Workflow title',
      description: 'A workflow',
      visibility: 'private',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workflows.byLenser('lenser-123'),
    })
  })
})
