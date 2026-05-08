import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase realtime ───────────────────────────────────────────────────

const mockRemoveChannel = vi.fn()
const mockSubscribe = vi.fn()
const mockOn = vi.fn()
const mockChannel = vi.fn()

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryKeys: {
    battles: {
      detail: (slug: string) => ['battles', 'detail', slug],
    },
  },
}))

// ─── Mock React Query ─────────────────────────────────────────────────────────

const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

import { useBattleStateSync } from './useBattleStateSync'

beforeEach(() => {
  vi.clearAllMocks()

  let changeHandler: (() => void) | null = null

  mockOn.mockImplementation((_event: unknown, _filter: unknown, handler: () => void) => {
    changeHandler = handler
    return { subscribe: mockSubscribe }
  })
  mockSubscribe.mockReturnValue({ handler: changeHandler })
  mockChannel.mockReturnValue({ on: mockOn })

  // Expose the handler for tests to trigger manually
  ;(globalThis as Record<string, unknown>).__battleChangeTrigger = () => changeHandler?.()
})

describe('useBattleStateSync', () => {
  it('subscribes to the correct Supabase channel when battleId and slug are provided', () => {
    renderHook(() => useBattleStateSync('battle-123', 'my-battle'))

    expect(mockChannel).toHaveBeenCalledWith('battle-state-battle-123')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'battles',
        table: 'battles',
        filter: 'id=eq.battle-123',
      }),
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('invalidates the battle detail query when a change event fires', () => {
    renderHook(() => useBattleStateSync('battle-456', 'slug-456'))
    ;(globalThis as Record<string, unknown>).__battleChangeTrigger?.()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['battles', 'detail', 'slug-456'],
    })
  })

  it('does not subscribe when battleId is undefined', () => {
    renderHook(() => useBattleStateSync(undefined, 'slug'))
    expect(mockChannel).not.toHaveBeenCalled()
  })

  it('does not subscribe when slug is undefined', () => {
    renderHook(() => useBattleStateSync('battle-789', undefined))
    expect(mockChannel).not.toHaveBeenCalled()
  })

  it('cleans up the channel on unmount', () => {
    const fakeChannel = { on: mockOn }
    mockChannel.mockReturnValue(fakeChannel)

    const { unmount } = renderHook(() => useBattleStateSync('battle-999', 'slug-999'))
    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(fakeChannel)
  })
})
