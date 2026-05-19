import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { SessionBoundary } from '../SessionBoundary'
import { AuthProvider } from './AuthContext'

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resendSignupConfirmation: vi.fn(),
  sendMagicLink: vi.fn(),
  resolveHandleToEmail: vi.fn(),
  updateMetadata: vi.fn(),
}))

const lenserServiceMocks = vi.hoisted(() => ({
  cancelDeletionOnLogin: vi.fn(),
}))

vi.mock('@lenserfight/data/cache', () => ({
  queryClient: {
    clear: vi.fn(),
    removeQueries: vi.fn(),
  },
  queryKeys: {
    lenser: {
      authenticated: () => ['lenser', 'authenticated'],
    },
    waitingList: {
      status: () => ['waiting-list', 'status'],
    },
  },
}))

vi.mock('@lenserfight/data/repositories', () => ({
  authService: authMocks,
  lenserService: lenserServiceMocks,
  partnerProvisioningRepository: {
    revokeToken: vi.fn(),
  },
}))

vi.mock('@lenserfight/ui/feedback', () => ({
  Loader: ({ message }: { message?: string }) => <div>{message ?? 'Loading'}</div>,
}))

vi.mock('@lenserfight/utils/dom', () => ({
  buildAuthReturnUrl: (value: string) => value,
}))

vi.mock('@lenserfight/utils/env', () => ({
  AUTH_BASE_URL: 'https://auth.example.test',
  getEnvMetadata: vi.fn().mockResolvedValue({
    detected_language: 'en',
    timezone: 'UTC',
    country: 'US',
  }),
}))

vi.mock('@lenserfight/utils/storage', () => ({
  storage: {
    removeItem: vi.fn(),
  },
}))

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    authMocks.onAuthStateChange.mockReturnValue(vi.fn())
    lenserServiceMocks.cancelDeletionOnLogin.mockResolvedValue({ restored: false })
  })

  it('settles the session boundary under React Strict Mode', async () => {
    let resolveAuth!: (user: null) => void
    authMocks.getCurrentUser.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveAuth = resolve
      })
    )

    render(
      <React.StrictMode>
        <AuthProvider>
          <SessionBoundary>
            <div>App content</div>
          </SessionBoundary>
        </AuthProvider>
      </React.StrictMode>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()

    resolveAuth(null)

    await waitFor(() => {
      expect(screen.getByText('App content')).toBeTruthy()
    })
    expect(authMocks.getCurrentUser).toHaveBeenCalledTimes(1)
  })
})
