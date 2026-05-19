import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAuth, mockGetCachedSession, mockGetCachedAccessToken } = vi.hoisted(() => ({
  mockAuth: {
    linkIdentity: vi.fn(),
    unlinkIdentity: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  mockGetCachedSession: vi.fn(),
  mockGetCachedAccessToken: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { auth: mockAuth },
  getCachedSession: mockGetCachedSession,
  getCachedAccessToken: mockGetCachedAccessToken,
}))

vi.mock('@lenserfight/utils/env', () => ({
  AUTH_BASE_URL: 'https://auth.lenserfight.com',
}))

vi.mock('@lenserfight/data/repositories', () => ({
  apiFetch: vi.fn(),
  unwrapEnvelope: vi.fn(),
}))

import { isChainabitConnected, connectorApiClient } from './partner-api-client'

// ── isChainabitConnected ─────────────────────────────────────────────────────

describe('isChainabitConnected', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns false when no session', () => {
    mockGetCachedSession.mockReturnValue(null)
    expect(isChainabitConnected()).toBe(false)
  })

  it('returns false when session has no user', () => {
    mockGetCachedSession.mockReturnValue({ user: null })
    expect(isChainabitConnected()).toBe(false)
  })

  it('returns false when provider is unrelated', () => {
    mockGetCachedSession.mockReturnValue({
      user: { app_metadata: { provider: 'email', providers: ['email'] } },
    })
    expect(isChainabitConnected()).toBe(false)
  })

  it('returns true when app_metadata.provider is custom:chainabit', () => {
    mockGetCachedSession.mockReturnValue({
      user: { app_metadata: { provider: 'custom:chainabit' } },
    })
    expect(isChainabitConnected()).toBe(true)
  })

  it('returns true when custom:chainabit is in app_metadata.providers array', () => {
    mockGetCachedSession.mockReturnValue({
      user: { app_metadata: { provider: 'email', providers: ['email', 'custom:chainabit'] } },
    })
    expect(isChainabitConnected()).toBe(true)
  })

  it('returns false for old incorrect custom_chainabit string (underscore)', () => {
    mockGetCachedSession.mockReturnValue({
      user: { app_metadata: { provider: 'custom_chainabit', providers: ['custom_chainabit'] } },
    })
    expect(isChainabitConnected()).toBe(false)
  })
})

// ── connectorApiClient.connect ───────────────────────────────────────────────

describe('connectorApiClient.connect', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to the URL returned by linkIdentity', async () => {
    mockAuth.linkIdentity.mockResolvedValue({ data: { url: 'https://auth.chainabit.com/oauth' }, error: null })
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.location as any).href = ''

    await connectorApiClient.connect('https://lenserfight.com/settings')

    expect(mockAuth.linkIdentity).toHaveBeenCalledWith({
      provider: 'chainabit',
      options: { redirectTo: 'https://auth.lenserfight.com/callback?return_url=https%3A%2F%2Flenserfight.com%2Fsettings' },
    })
    expect(window.location.href).toBe('https://auth.chainabit.com/oauth')
  })

  it('throws when linkIdentity returns an error', async () => {
    const err = new Error('provider not found')
    mockAuth.linkIdentity.mockResolvedValue({ data: null, error: err })
    await expect(connectorApiClient.connect()).rejects.toThrow('provider not found')
  })

  it('throws when linkIdentity succeeds but returns no url', async () => {
    mockAuth.linkIdentity.mockResolvedValue({ data: {}, error: null })
    await expect(connectorApiClient.connect()).rejects.toThrow(
      'Chainabit OAuth flow did not return a redirect URL',
    )
  })

  it('throws when linkIdentity succeeds but data is null', async () => {
    mockAuth.linkIdentity.mockResolvedValue({ data: null, error: null })
    await expect(connectorApiClient.connect()).rejects.toThrow(
      'Chainabit OAuth flow did not return a redirect URL',
    )
  })
})

// ── connectorApiClient.disconnect ────────────────────────────────────────────

describe('connectorApiClient.disconnect', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when getUser returns an error', async () => {
    const err = new Error('network error')
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: err })
    await expect(connectorApiClient.disconnect()).rejects.toThrow('network error')
  })

  it('throws when getUser returns null user with no error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(connectorApiClient.disconnect()).rejects.toThrow('Unauthenticated')
  })

  it('no-ops when user has no custom:chainabit identity', async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { identities: [{ provider: 'email', id: '1' }] } },
      error: null,
    })
    await expect(connectorApiClient.disconnect()).resolves.toBeUndefined()
    expect(mockAuth.unlinkIdentity).not.toHaveBeenCalled()
  })

  it('calls unlinkIdentity with the custom:chainabit identity', async () => {
    const chainabitIdentity = { provider: 'custom:chainabit', id: 'abc123' }
    mockAuth.getUser.mockResolvedValue({
      data: { user: { identities: [{ provider: 'email', id: '1' }, chainabitIdentity] } },
      error: null,
    })
    mockAuth.unlinkIdentity.mockResolvedValue({ error: null })

    await connectorApiClient.disconnect()

    expect(mockAuth.unlinkIdentity).toHaveBeenCalledWith(chainabitIdentity)
  })

  it('throws when unlinkIdentity returns an error', async () => {
    const chainabitIdentity = { provider: 'custom:chainabit', id: 'abc123' }
    mockAuth.getUser.mockResolvedValue({
      data: { user: { identities: [chainabitIdentity] } },
      error: null,
    })
    const unlinkErr = new Error('unlink failed')
    mockAuth.unlinkIdentity.mockResolvedValue({ error: unlinkErr })

    await expect(connectorApiClient.disconnect()).rejects.toThrow('unlink failed')
  })

  it('no-ops when user has no identities array', async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { identities: undefined } },
      error: null,
    })
    await expect(connectorApiClient.disconnect()).resolves.toBeUndefined()
    expect(mockAuth.unlinkIdentity).not.toHaveBeenCalled()
  })
})
