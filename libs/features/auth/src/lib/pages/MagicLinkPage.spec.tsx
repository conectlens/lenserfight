import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const { mockSendMagicLink, mockSanitizeReturnUrl } = vi.hoisted(() => ({
  mockSendMagicLink: vi.fn(),
  mockSanitizeReturnUrl: vi.fn((url: string | null | undefined) => url ?? '/'),
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ sendMagicLink: mockSendMagicLink }),
}))

vi.mock('@lenserfight/utils/env', () => ({
  ENABLE_CAPTCHA: false,
  CAPTCHA_SITE_KEY: '',
}))

vi.mock('@lenserfight/utils/dom', () => ({
  sanitizeReturnUrl: (url: string | null | undefined) => mockSanitizeReturnUrl(url),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Logo: () => <span data-testid="logo" />,
  Button: ({ children, isLoading, disabled, type, onClick, fullWidth, variant, className }: any) => (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={className}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}))

import { MagicLinkPage } from './MagicLinkPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <MagicLinkPage />
    </MemoryRouter>
  )

describe('MagicLinkPage', () => {
  beforeEach(() => {
    mockSendMagicLink.mockReset()
  })

  it('renders inside AuthCard with correct title', () => {
    renderPage()
    expect(screen.getByText('Sign in with link')).toBeTruthy()
    expect(screen.getByText("We'll email you a one-click sign-in link")).toBeTruthy()
  })

  it('renders email input and submit button', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy()
    expect(screen.getByText('Send Sign-In Link')).toBeTruthy()
  })

  it('renders navigation links to /login and /register', () => {
    renderPage()
    const backLink = screen.getByText('Back to Sign In')
    const registerLink = screen.getByText('Join ConectLens')
    expect(backLink.closest('a')).toHaveProperty('href', expect.stringContaining('/login'))
    expect(registerLink.closest('a')).toHaveProperty('href', expect.stringContaining('/register'))
  })

  it('shows validation error when submitting empty email', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => {
      expect(mockSendMagicLink).not.toHaveBeenCalled()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'not-an-email' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => {
      expect(mockSendMagicLink).not.toHaveBeenCalled()
    })
  })

  it('calls sendMagicLink with valid email on submit', async () => {
    mockSendMagicLink.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'lenser@example.com' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => {
      expect(mockSendMagicLink).toHaveBeenCalledWith('lenser@example.com', undefined)
    })
  })

  it('shows success state after link is sent', async () => {
    mockSendMagicLink.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'lenser@example.com' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => {
      expect(screen.getByText('Check your inbox')).toBeTruthy()
      expect(
        screen.getByText(/If this email can sign in, we sent a link/i)
      ).toBeTruthy()
    })
  })

  it('shows send-again button in success state that resets to form', async () => {
    mockSendMagicLink.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'lenser@example.com' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => screen.getByText('Send again'))
    fireEvent.click(screen.getByText('Send again'))
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy()
  })

  it('shows error message when sendMagicLink throws', async () => {
    mockSendMagicLink.mockRejectedValue(new Error('network error'))
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'lenser@example.com' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
    })
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy()
  })

  it('success state renders Back to Sign In link', async () => {
    mockSendMagicLink.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { name: 'email', value: 'lenser@example.com' },
    })
    fireEvent.click(screen.getByText('Send Sign-In Link'))
    await waitFor(() => screen.getByText('Back to Sign In'))
    expect(screen.getByText('Back to Sign In')).toBeTruthy()
  })
})
