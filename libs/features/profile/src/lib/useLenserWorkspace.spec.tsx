import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'

const { mockUseMyLensers, mockUseSwitchLenser, mockSwitchLenser } = vi.hoisted(() => ({
  mockUseMyLensers: vi.fn(),
  mockUseSwitchLenser: vi.fn(),
  mockSwitchLenser: vi.fn(),
}))

vi.mock('./useMyLensers', () => ({
  useMyLensers: () => mockUseMyLensers(),
}))

vi.mock('./useSwitchLenser', () => ({
  useSwitchLenser: () => mockUseSwitchLenser(),
}))

import { useLenserWorkspace } from './useLenserWorkspace'

describe('useLenserWorkspace', () => {
  beforeEach(() => {
    mockSwitchLenser.mockReset()
    mockSwitchLenser.mockResolvedValue(undefined)
    mockUseMyLensers.mockReturnValue({
      workspaces: [
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
      ],
      activeWorkspace: {
        id: 'ai-1',
        handle: 'sky-bot',
        display_name: 'Sky Bot',
        avatar_url: null,
        type: 'ai',
        is_active: true,
      },
      humanWorkspace: {
        id: 'human-1',
        handle: 'skyfall',
        display_name: 'Skyfall',
        avatar_url: null,
        type: 'human',
        is_active: false,
      },
      isLoading: false,
    })
    mockUseSwitchLenser.mockReturnValue({
      switchLenser: mockSwitchLenser,
      isSwitching: false,
    })
  })

  it('exposes the active workspace and the canonical human owner workspace', () => {
    const { result } = renderHook(() => useLenserWorkspace())

    expect(result.current.activeWorkspace?.id).toBe('ai-1')
    expect(result.current.humanWorkspace?.id).toBe('human-1')
    expect(result.current.workspaces).toHaveLength(2)
  })

  it('delegates workspace switching through the secure switch mutation', async () => {
    const { result } = renderHook(() => useLenserWorkspace())

    await act(async () => {
      await result.current.switchWorkspace('human-1')
    })

    expect(mockSwitchLenser).toHaveBeenCalledWith('human-1')
  })
})
