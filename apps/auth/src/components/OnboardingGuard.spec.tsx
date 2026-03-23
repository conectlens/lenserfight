import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const {
  mockUseAuth,
  mockUseAuthProfileGate,
  mockReplaceLocationSafely,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseAuthProfileGate: vi.fn(),
  mockReplaceLocationSafely: vi.fn(),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useAuthProfileGate', () => ({
  useAuthProfileGate: () => mockUseAuthProfileGate(),
}))

vi.mock('../utils/validateReturnUrl', () => ({
  sanitizeReturnUrl: (url: string | null | undefined) =>
    url ?? 'https://forum.lenserfight.com/',
  replaceLocationSafely: (url: string) => mockReplaceLocationSafely(url),
}))

import { OnboardingGuard } from './OnboardingGuard'

describe('OnboardingGuard', () => {
  beforeEach(() => {
    mockReplaceLocationSafely.mockReset()
    window.history.pushState({}, '', '/onboarding?return_url=https%3A%2F%2Fforum.lenserfight.com%2Fwelcome')
  })

  it('redirects anonymous users to login and closes the loader', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    render(
      <OnboardingGuard>
        <div>Onboarding content</div>
      </OnboardingGuard>
    )

    await waitFor(() => {
      expect(mockReplaceLocationSafely).toHaveBeenCalledWith(
        '/login?return_url=https%3A%2F%2Fforum.lenserfight.com%2Fwelcome'
      )
    })

    expect(screen.queryByText('Loading...')).toBeNull()
    expect(screen.queryByText('Onboarding content')).toBeNull()
  })

  it('renders onboarding children for authenticated users without a Lenser profile', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: { kind: 'new' },
      isLoading: false,
      error: null,
    })

    render(
      <OnboardingGuard>
        <div>Onboarding content</div>
      </OnboardingGuard>
    )

    expect(screen.getByText('Onboarding content')).not.toBeNull()
    expect(mockReplaceLocationSafely).not.toHaveBeenCalled()
  })

  it('redirects authenticated users with an active profile back to return_url', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: { kind: 'active' },
      isLoading: false,
      error: null,
    })

    render(
      <OnboardingGuard>
        <div>Onboarding content</div>
      </OnboardingGuard>
    )

    await waitFor(() => {
      expect(mockReplaceLocationSafely).toHaveBeenCalledWith('https://forum.lenserfight.com/welcome')
    })

    expect(screen.getByText('Loading...')).not.toBeNull()
  })
})
