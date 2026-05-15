import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetBalance, mockGetAiModels, mockStartOAuthConnect, mockIsAuthenticated } = vi.hoisted(
  () => ({
    mockGetBalance: vi.fn(),
    mockGetAiModels: vi.fn(),
    mockStartOAuthConnect: vi.fn(),
    mockIsAuthenticated: { value: true },
  }),
)

vi.mock('@lenserfight/data/repositories', () => ({
  partnerProvisioningRepository: {
    getBalance: (...args: unknown[]) => mockGetBalance(...args),
    getAiModels: (...args: unknown[]) => mockGetAiModels(...args),
    startOAuthConnect: (...args: unknown[]) => mockStartOAuthConnect(...args),
  },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

import { usePartnerConnection } from './usePartnerConnection'
import { useChainabitConnection } from './useChainabitConnection'

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

// ── Generic hook ─────────────────────────────────────────────────────────────

describe('usePartnerConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated.value = true
  })

  describe('state: loading', () => {
    it('returns loading while balance is pending', () => {
      mockGetBalance.mockReturnValue(new Promise(() => {}))
      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })
      expect(result.current.state).toBe('loading')
      expect(result.current.credits).toBeNull()
      expect(result.current.models).toBeNull()
    })
  })

  describe('state: connected', () => {
    it('returns connected and credits when balance > 0', async () => {
      mockGetBalance.mockResolvedValue({ credits: 500, currency: 'cr' })
      mockGetAiModels.mockResolvedValue([{ id: 'm1', name: 'GPT-4', provider: 'openai' }])

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('connected'))
      expect(result.current.credits).toBe(500)
      expect(mockGetBalance).toHaveBeenCalledWith('chainabit')
    })

    it('fetches models only when connected', async () => {
      mockGetBalance.mockResolvedValue({ credits: 250, currency: 'cr' })
      mockGetAiModels.mockResolvedValue([{ id: 'm2', name: 'Claude', provider: 'anthropic' }])

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('connected'))
      await waitFor(() => expect(result.current.models).toHaveLength(1))
      expect(mockGetAiModels).toHaveBeenCalledWith('chainabit')
    })

    it('passes partnerName through to repository calls', async () => {
      mockGetBalance.mockResolvedValue({ credits: 100, currency: 'cr' })
      mockGetAiModels.mockResolvedValue([])

      const { result } = renderHook(() => usePartnerConnection('acme'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('connected'))
      expect(mockGetBalance).toHaveBeenCalledWith('acme')
    })
  })

  describe('state: no_credits', () => {
    it('returns no_credits when balance is 0', async () => {
      mockGetBalance.mockResolvedValue({ credits: 0, currency: 'cr' })
      mockGetAiModels.mockResolvedValue([])

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('no_credits'))
      expect(result.current.credits).toBe(0)
    })

    it('fetches models when no_credits (user may top up)', async () => {
      mockGetBalance.mockResolvedValue({ credits: 0, currency: 'cr' })
      mockGetAiModels.mockResolvedValue([{ id: 'm1', name: 'GPT-4', provider: 'openai' }])

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('no_credits'))
      await waitFor(() => expect(result.current.models).not.toBeNull())
    })
  })

  describe('state: no_account', () => {
    it('returns no_account when balance returns not_provisioned error', async () => {
      const err = Object.assign(new Error('Not found'), { error: 'not_provisioned' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('no_account'))
      expect(result.current.credits).toBeNull()
    })

    it('returns no_account for unknown errors (safe default)', async () => {
      mockGetBalance.mockRejectedValue(new Error('network failure'))

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('no_account'))
    })

    it('does not fetch models when no_account', async () => {
      const err = Object.assign(new Error('Not found'), { error: 'not_provisioned' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('no_account'))
      expect(mockGetAiModels).not.toHaveBeenCalled()
    })
  })

  describe('state: invalid_connection', () => {
    it('returns invalid_connection on unauthorized error code', async () => {
      const err = Object.assign(new Error('Unauthorized'), { error: 'unauthorized' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('invalid_connection'))
    })

    it('returns invalid_connection on unauthenticated error code', async () => {
      const err = Object.assign(new Error('Unauthenticated'), { error: 'unauthenticated' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('invalid_connection'))
    })

    it('returns invalid_connection when error message contains 401', async () => {
      mockGetBalance.mockRejectedValue(new Error('401 Unauthorized'))

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('invalid_connection'))
    })

    it('does not fetch models for invalid_connection (reconnect is the recovery path)', async () => {
      const err = Object.assign(new Error('Unauthorized'), { error: 'unauthorized' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('invalid_connection'))
      expect(mockGetAiModels).not.toHaveBeenCalled()
      expect(result.current.models).toBeNull()
    })
  })

  describe('state: provider_error', () => {
    it('returns provider_error on provider_error code', async () => {
      const err = Object.assign(new Error('Provider error'), { error: 'provider_error' })
      mockGetBalance.mockRejectedValue(err)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.state).toBe('provider_error'))
    })
  })

  describe('unauthenticated user', () => {
    it('returns no_account and does not call getBalance when not authenticated', () => {
      mockIsAuthenticated.value = false

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      expect(result.current.state).toBe('no_account')
      expect(mockGetBalance).not.toHaveBeenCalled()
    })
  })

  describe('reconnect', () => {
    it('calls startOAuthConnect with current href', async () => {
      mockGetBalance.mockResolvedValue({ credits: 0, currency: 'cr' })
      mockStartOAuthConnect.mockResolvedValue(undefined)

      const { result } = renderHook(() => usePartnerConnection('chainabit'), { wrapper: createWrapper() })

      await waitFor(() => result.current.state !== 'loading')
      await result.current.reconnect()

      expect(mockStartOAuthConnect).toHaveBeenCalledWith(window.location.href)
    })
  })
})

// ── Chainabit facade ─────────────────────────────────────────────────────────

describe('useChainabitConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated.value = true
  })

  it('delegates to usePartnerConnection("chainabit")', async () => {
    mockGetBalance.mockResolvedValue({ credits: 200, currency: 'cr' })
    mockGetAiModels.mockResolvedValue([])

    const { result } = renderHook(() => useChainabitConnection(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.state).toBe('connected'))
    expect(mockGetBalance).toHaveBeenCalledWith('chainabit')
  })
})
