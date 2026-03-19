import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateLenserProfileModal } from './CreateLenserProfileModal'

const mockUseAuth = vi.fn()
const mockGetAuthenticatedLenser = vi.fn()
const mockGetLanguages = vi.fn()
const mockGetLenserByHandle = vi.fn()
const mockCreateLenserProfile = vi.fn()
const mockUpdateLenserProfile = vi.fn()
const mockSetItem = vi.fn()

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => mockUseAuth(),
  InputField: ({
    label,
    value,
    onChange,
    placeholder,
    error,
    required,
    className,
  }: any) => (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={className}
      />
      {error ? <span>{error}</span> : null}
    </label>
  ),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  lenserService: {
    getAuthenticatedLenser: (...args: any[]) => mockGetAuthenticatedLenser(...args),
    getLanguages: (...args: any[]) => mockGetLanguages(...args),
    getLenserByHandle: (...args: any[]) => mockGetLenserByHandle(...args),
    createLenserProfile: (...args: any[]) => mockCreateLenserProfile(...args),
    updateLenserProfile: (...args: any[]) => mockUpdateLenserProfile(...args),
  },
}))

vi.mock('@lenserfight/utils/storage', () => ({
  storage: {
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}))

vi.mock('@lenserfight/ui/modals', () => ({
  Modal: ({ children, canClose, onClose, title }: any) => (
    <div>
      <h1>{title}</h1>
      {canClose ? <button onClick={onClose}>Close</button> : null}
      {children}
    </div>
  ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  LanguageSelectBox: ({ value, onChange, languages, isLoading }: any) => (
    <select
      aria-label="Preferred Language"
      value={value}
      disabled={isLoading}
      onChange={(event) => onChange(event.target.value)}
    >
      {languages.map((language: any) => (
        <option key={language.code} value={language.code}>
          {language.name}
        </option>
      ))}
    </select>
  ),
  StepWizard: ({
    steps,
    currentStep,
    children,
    onNext,
    onComplete,
    canProceed,
    isNextLoading,
    isCompleting,
    nextLabel,
    completeLabel,
  }: any) => (
    <div>
      <div>{steps[currentStep]}</div>
      {children}
      {currentStep === steps.length - 1 ? (
        <button onClick={onComplete} disabled={!canProceed || isCompleting}>
          {completeLabel}
        </button>
      ) : (
        <button onClick={onNext} disabled={!canProceed || isNextLoading}>
          {nextLabel}
        </button>
      )}
    </div>
  ),
}))

const renderModal = (props: Partial<React.ComponentProps<typeof CreateLenserProfileModal>> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateLenserProfileModal onClose={vi.fn()} onComplete={vi.fn()} {...props} />
    </QueryClientProvider>
  )
}

describe('CreateLenserProfileModal', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    mockGetAuthenticatedLenser.mockResolvedValue(null)
    mockGetLanguages.mockResolvedValue([{ code: 'en', name: 'English' }])
    mockGetLenserByHandle.mockResolvedValue(null)
    mockCreateLenserProfile.mockResolvedValue({
      id: 'profile-1',
      handle: 'alice',
      display_name: 'Alice',
      onboarding_step: 1,
      created_at: '2026-03-19T10:00:00.000Z',
    })
    mockUpdateLenserProfile.mockResolvedValue({
      id: 'profile-1',
      handle: 'alice',
      display_name: 'Alice',
      preferred_language: 'en',
      onboarding_step: 2,
      onboarding_completed_at: '2026-03-19T10:05:00.000Z',
      created_at: '2026-03-19T10:00:00.000Z',
    })
    mockSetItem.mockReset()
  })

  it('advances to preferences after step 0 instead of closing', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    await waitFor(() => {
      expect(screen.queryByText('Complete Your Profile')).not.toBeNull()
    })

    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Alice' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    vi.useRealTimers()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    })

    await waitFor(() => {
      expect(screen.queryByText('Preferences')).not.toBeNull()
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('hides manual close affordance when completion is required', async () => {
    renderModal({ requireCompletion: true })

    await waitFor(() => {
      expect(screen.queryByText('Complete Your Profile')).not.toBeNull()
    })

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('calls onComplete once after finishing the last step', async () => {
    const onComplete = vi.fn()
    mockGetAuthenticatedLenser.mockResolvedValue({
      id: 'profile-1',
      handle: 'alice',
      display_name: 'Alice',
      onboarding_step: 1,
      created_at: '2026-03-19T10:00:00.000Z',
    })

    renderModal({ onComplete, requireCompletion: true })

    await waitFor(() => {
      expect(screen.queryByText('Preferences')).not.toBeNull()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    })

    await waitFor(() => {
      expect(mockUpdateLenserProfile).toHaveBeenCalledTimes(1)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
