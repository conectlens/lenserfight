import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAuth, mockUseAuthProfileGate, replaceLocationSafely, logout } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseAuthProfileGate: vi.fn(),
  replaceLocationSafely: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@lenserfight/features/auth', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('@lenserfight/ui/components', () => ({
  LoadingOverlay: ({ message }: { message: string }) => <div>{message}</div>,
}))
vi.mock('../hooks/useAuthProfileGate', () => ({ useAuthProfileGate: () => mockUseAuthProfileGate() }))
vi.mock('../utils/validateReturnUrl', () => ({
  DEFAULT_RETURN_URL: '/home',
  replaceLocationSafely: (url: string) => replaceLocationSafely(url),
  sanitizeReturnUrl: () => '/return',
}))

import { AccountUnavailablePage } from './AccountUnavailablePage'

const gate = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  ...extra,
})

describe('AccountUnavailablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logout.mockResolvedValue(undefined)
  })

  it('does not sign out an anonymous visitor following a link', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, logout })
    mockUseAuthProfileGate.mockReturnValue(gate(undefined))
    render(<AccountUnavailablePage />)
    await waitFor(() => expect(replaceLocationSafely).toHaveBeenCalledWith('/return'))
    expect(logout).not.toHaveBeenCalled()
  })

  it('does not sign out a user whose account is active', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, logout })
    mockUseAuthProfileGate.mockReturnValue(gate({ kind: 'active' }))
    render(<AccountUnavailablePage />)
    await waitFor(() => expect(replaceLocationSafely).toHaveBeenCalledWith('/return'))
    expect(logout).not.toHaveBeenCalled()
  })

  it('waits for the profile gate before deciding', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, logout })
    mockUseAuthProfileGate.mockReturnValue(gate(undefined, { isLoading: true }))
    render(<AccountUnavailablePage />)
    expect(logout).not.toHaveBeenCalled()
    expect(replaceLocationSafely).not.toHaveBeenCalled()
  })

  it('signs out and shows the notice once the gate confirms a deleted account', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, logout })
    mockUseAuthProfileGate.mockReturnValue(gate({ kind: 'deleted' }))
    render(<AccountUnavailablePage />)
    expect(await screen.findByText(/account unavailable/i)).not.toBeNull()
    expect(logout).toHaveBeenCalledTimes(1)
    expect(replaceLocationSafely).not.toHaveBeenCalled()
  })
})
