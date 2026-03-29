import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor, screen } from '@testing-library/react'
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
  mockSanitizeReturnUrl: vi.fn((url: string | null | undefined) =>
    url ?? 'https://forum.lenserfight.com/'
  ),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useAuthProfileGate', () => ({
  useAuthProfileGate: () => mockUseAuthProfileGate(),
  AUTH_PROFILE_GATE_QUERY_KEY: ['lenser', 'auth-profile-gate'],
}))

vi.mock('../utils/validateReturnUrl', () => ({
  sanitizeReturnUrl: (url: string | null | undefined) => mockSanitizeReturnUrl(url),
  replaceLocationSafely: (url: string) => mockReplaceLocationSafely(url),
}))

import { AccountRecoveryPage } from './AccountRecoveryPage'

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AccountRecoveryPage />
    </QueryClientProvider>
  )
}

describe('AccountRecoveryPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    mockUseAuthProfileGate.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockReplaceLocationSafely.mockReset()
    mockSanitizeReturnUrl.mockClear()
    window.history.pushState({}, '', '/account-recovery?return_url=https%3A%2F%2Fforum.lenserfight.com%2Fwelcome')
  })

  it('redirects anonymous users back to login instead of leaving the loader visible', async () => {
    renderPage()

    await waitFor(() => {
      expect(mockReplaceLocationSafely).toHaveBeenCalledWith(
        '/login?return_url=https%3A%2F%2Fforum.lenserfight.com%2Fwelcome'
      )
    })

    expect(screen.queryByText('Checking your account...')).toBeNull()
  })
})
