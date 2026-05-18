import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
const {
  mockResetPassword,
  mockNavigate,
  mockIsAuthenticated,
  mockIsAuthLoading,
  mockIsRecoverySession,
} = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
  mockNavigate: vi.fn(),
  mockIsAuthenticated: { value: false },
  mockIsAuthLoading: { value: false },
  mockIsRecoverySession: { value: true },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
    isAuthenticated: mockIsAuthenticated.value,
    isLoading: mockIsAuthLoading.value,
    isRecoverySession: mockIsRecoverySession.value,
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@lenserfight/utils/validation', () => ({
  useFormValidation: () => ({
    errors: {},
    validate: () => true,
    clearError: vi.fn(),
    setErrors: vi.fn(),
  }),
  isRequired: () => () => null,
  minLength: () => () => null,
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, isLoading, type, onClick, fullWidth }: any) => (
    <button type={type} onClick={onClick} disabled={isLoading} data-full-width={fullWidth}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  FormError: ({ message }: any) => (message ? <p role="alert">{message}</p> : null),
}))

vi.mock('../components/AuthCard', () => ({
  AuthCard: ({ children, title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}))

vi.mock('../components/BackButton', () => ({
  BackButton: () => <button>Back</button>,
}))

vi.mock('../components/InputField', () => ({
  InputField: ({ label, name, type, placeholder, value, onChange }: any) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </label>
  ),
}))

vi.mock('../components/PasswordStrengthMeter', () => ({
  PasswordStrengthMeter: ({ password }: any) =>
    password ? <div data-testid="password-strength-meter" /> : null,
}))

// Import after all mocks are set up
import { ResetPasswordPage } from './ResetPasswordPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>
  )

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockResetPassword.mockReset()
    mockNavigate.mockReset()
    mockIsAuthenticated.value = false
    mockIsAuthLoading.value = false
    mockIsRecoverySession.value = true
  })

  describe('Loading state', () => {
    it('shows a spinner while auth is loading', () => {
      mockIsAuthLoading.value = true
      renderPage()
      // The spinner container should be present (no form rendered)
      expect(screen.queryByRole('button', { name: /update password/i })).toBeNull()
    })
  })

  describe('Recovery session missing', () => {
    it('shows an error state when isRecoverySession is false', () => {
      mockIsRecoverySession.value = false
      renderPage()
      expect(screen.getByRole('heading', { name: /reset password/i })).toBeTruthy()
      expect(screen.getByText(/request new link/i)).toBeTruthy()
    })

    it('shows expired link message when user is authenticated but no recovery session', () => {
      mockIsRecoverySession.value = false
      mockIsAuthenticated.value = true
      renderPage()
      expect(screen.getByText(/invalid reset link/i)).toBeTruthy()
    })

    it('shows missing session message when user is not authenticated', () => {
      mockIsRecoverySession.value = false
      mockIsAuthenticated.value = false
      renderPage()
      expect(screen.getByText(/auth session missing/i)).toBeTruthy()
    })
  })

  describe('Reset password form', () => {
    it('renders the password form when isRecoverySession is true', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: /set new password/i })).toBeTruthy()
      expect(screen.getByPlaceholderText('Enter new password')).toBeTruthy()
      expect(screen.getByPlaceholderText('Confirm new password')).toBeTruthy()
      expect(screen.getByRole('button', { name: /update password/i })).toBeTruthy()
    })

    it('shows the password strength meter when a password is entered', () => {
      renderPage()
      expect(screen.queryByTestId('password-strength-meter')).toBeNull()
      fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
        target: { name: 'password', value: 'StrongPass1!' },
      })
      expect(screen.getByTestId('password-strength-meter')).toBeTruthy()
    })

    it('calls resetPassword and shows success state on submit', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
        target: { name: 'password', value: 'NewPassword1!' },
      })
      fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
        target: { name: 'confirmPassword', value: 'NewPassword1!' },
      })

      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('NewPassword1!')
        // Success state
        expect(screen.getByText(/all done/i)).toBeTruthy()
      })
    })

    it('shows an API error message when resetPassword throws', async () => {
      mockResetPassword.mockRejectedValue(new Error('Token expired'))
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
        target: { name: 'password', value: 'NewPassword1!' },
      })
      fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
        target: { name: 'confirmPassword', value: 'NewPassword1!' },
      })

      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeTruthy()
      })
    })

    it('shows a fallback error when resetPassword throws without a message', async () => {
      mockResetPassword.mockRejectedValue(new Error())
      renderPage()

      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to reset password/i)).toBeTruthy()
      })
    })
  })

  describe('Success state', () => {
    it('navigates to /login when the Back to Sign In button is clicked', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
        target: { name: 'password', value: 'NewPassword1!' },
      })
      fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
        target: { name: 'confirmPassword', value: 'NewPassword1!' },
      })

      fireEvent.click(screen.getByRole('button', { name: /update password/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to sign in/i })).toBeTruthy()
      })

      fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }))
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
