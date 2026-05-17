import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const { mockLogin, mockSignInWithOAuth, mockSanitizeReturnUrl } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSanitizeReturnUrl: vi.fn((url: string | null | undefined) => url ?? '/'),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ login: mockLogin, signInWithOAuth: mockSignInWithOAuth }),
}))

vi.mock('@lenserfight/utils/env', () => ({
  ENABLE_CAPTCHA: false,
  CAPTCHA_SITE_KEY: '',
  loadDevSeedCredentials: () => Promise.resolve(null),
}))

vi.mock('@lenserfight/utils/dom', () => ({
  sanitizeReturnUrl: (url: string | null | undefined) => mockSanitizeReturnUrl(url),
  buildAuthReturnUrl: vi.fn(() => '/'),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  rememberMeStorage: { setRememberMe: vi.fn() },
}))

vi.mock('@lenserfight/infra/partner-provisioning', () => ({
  partnerApiClient: { startOAuthLogin: vi.fn() },
}))

vi.mock('@lenserfight/ui/components', () => ({
  Logo: () => <span data-testid="logo" />,
  Button: ({ children, isLoading, disabled, type, onClick }: any) => (
    <button type={type} onClick={onClick} disabled={disabled || isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}))

vi.mock('@lenserfight/ui/feedback', () => ({
  Loader: ({ message }: any) => <div data-testid="loader">{message}</div>,
}))

import { LoginPage } from './LoginPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockSignInWithOAuth.mockReset()
  })

  it('renders Sign In title', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeTruthy()
  })

  it('renders email and password inputs', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy()
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy()
  })

  it('does NOT render an embedded magic link email input or Send Sign-In Link button', () => {
    renderPage()
    expect(screen.queryByText('Send Sign-In Link')).toBeNull()
    expect(screen.queryByText('Or sign in with email link')).toBeNull()
  })

  it('renders a link to /magic-link', () => {
    renderPage()
    const link = screen.getByText('Sign in with email link')
    expect(link.closest('a')).toHaveProperty('href', expect.stringContaining('/magic-link'))
  })

  it('renders a link to /register', () => {
    renderPage()
    const link = screen.getByText('Join ConectLens')
    expect(link.closest('a')).toHaveProperty('href', expect.stringContaining('/register'))
  })

  it('renders a link to /forgot-password', () => {
    renderPage()
    const link = screen.getByText('Forgot password?')
    expect(link.closest('a')).toHaveProperty('href', expect.stringContaining('/forgot-password'))
  })
})
