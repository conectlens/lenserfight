import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

const { mockUseLenser } = vi.hoisted(() => ({
  mockUseLenser: vi.fn(),
}))

vi.mock('@lenserfight/features/profile', () => ({
  useLenser: () => mockUseLenser(),
}))

import { useAuthenticatedLenser } from './useAuthenticatedLenser'

describe('useAuthenticatedLenser', () => {
  it('returns anon-safe profile state', () => {
    mockUseLenser.mockReturnValue({
      lenser: null,
      hasLenser: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useAuthenticatedLenser())

    expect(result.current).toEqual({
      lenser: null,
      hasLenser: false,
      isLoading: false,
    })
  })
})
