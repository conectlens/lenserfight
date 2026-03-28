import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const {
  mockUseAuth,
  mockUseAuthProfileGate,
  mockReplaceLocationSafely,
  mockSanitizeReturnUrl,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseAuthProfileGate: vi.fn(),
  mockReplaceLocationSafely: vi.fn(),
  mockSanitizeReturnUrl: vi.fn(() => 'https://forum.lenserfight.com/from-test'),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useAuthProfileGate', () => ({
  useAuthProfileGate: () => mockUseAuthProfileGate(),
}))

vi.mock('../utils/validateReturnUrl', () => ({
  sanitizeReturnUrl: () => mockSanitizeReturnUrl(),
  replaceLocationSafely: (url: string) => mockReplaceLocationSafely(url),
}))

import { GatewayGuard } from './GatewayGuard'

describe('GatewayGuard', () => {
  beforeEach(() => {
    mockReplaceLocationSafely.mockReset()
    mockSanitizeReturnUrl.mockClear()
  })

  it('renders auth entry children for anonymous users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    render(
      <GatewayGuard>
        <div>Login form</div>
      </GatewayGuard>
    )

    expect(screen.getByText('Login form')).not.toBeNull()
    expect(mockReplaceLocationSafely).not.toHaveBeenCalled()
  })

  it('redirects authenticated users with an active profile to return_url', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: { kind: 'active' },
      isLoading: false,
      error: null,
    })

    render(
      <GatewayGuard>
        <div>Login form</div>
      </GatewayGuard>
    )

    await waitFor(() => {
      expect(mockReplaceLocationSafely).toHaveBeenCalledWith('https://forum.lenserfight.com/from-test')
    })

    expect(screen.getByRole('status', { name: 'Redirecting...' })).not.toBeNull()
  })
})
