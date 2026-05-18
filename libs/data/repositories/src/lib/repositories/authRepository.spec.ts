import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseAuthRepository } from './authRepository'

const rpcMock = vi.fn()
const updateUserMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const onAuthStateChangeMock = vi.fn()

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmailMock(...args),
      signInWithOAuth: vi.fn(),
      resend: vi.fn(),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
    },
  },
}))

vi.mock('@lenserfight/utils/env', () => ({
  AUTH_BASE_URL: 'https://auth.lenserfight.com',
}))

vi.mock('@lenserfight/utils/dom', () => ({
  buildAuthReturnUrl: vi.fn((url: string) => url),
}))

describe('SupabaseAuthRepository password reset flow', () => {
  const repo = new SupabaseAuthRepository()

  beforeEach(() => {
    rpcMock.mockReset()
    updateUserMock.mockReset()
    resetPasswordForEmailMock.mockReset()
    onAuthStateChangeMock.mockReset()
  })

  it('requestPasswordReset sends correct redirectTo from AUTH_BASE_URL', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null })

    await repo.requestPasswordReset('user@example.com')

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://auth.lenserfight.com/reset-password',
      captchaToken: undefined,
    })
  })

  it('requestPasswordReset passes captchaToken when provided', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ error: null })

    await repo.requestPasswordReset('user@example.com', 'captcha-token-123')

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://auth.lenserfight.com/reset-password',
      captchaToken: 'captcha-token-123',
    })
  })

  it('requestPasswordReset throws when Supabase returns an error', async () => {
    const err = new Error('Email not found')
    resetPasswordForEmailMock.mockResolvedValue({ error: err })

    await expect(repo.requestPasswordReset('nobody@example.com')).rejects.toThrow('Email not found')
  })

  it('resetPassword calls updateUser with the provided password', async () => {
    updateUserMock.mockResolvedValue({ error: null })

    await repo.resetPassword('NewSecurePass1!')

    expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewSecurePass1!' })
  })

  it('resetPassword throws when Supabase returns an error', async () => {
    const err = new Error('Token expired')
    updateUserMock.mockResolvedValue({ error: err })

    await expect(repo.resetPassword('AnyPass1!')).rejects.toThrow('Token expired')
  })

  it('onAuthStateChange passes both user and event type to the callback', () => {
    const mockSubscription = { unsubscribe: vi.fn() }
    onAuthStateChangeMock.mockImplementation((handler: Function) => {
      handler('PASSWORD_RECOVERY', { user: { id: 'user-1', email: 'u@e.com' } })
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    const unsubscribe = repo.onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'PASSWORD_RECOVERY'
    )

    unsubscribe()
    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
  })

  it('onAuthStateChange passes null user when session is null', () => {
    const mockSubscription = { unsubscribe: vi.fn() }
    onAuthStateChangeMock.mockImplementation((handler: Function) => {
      handler('SIGNED_OUT', null)
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    repo.onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith(null, 'SIGNED_OUT')
  })
})

describe('SupabaseAuthRepository device approval flow', () => {
  const repo = new SupabaseAuthRepository()

  beforeEach(() => {
    rpcMock.mockReset()
    onAuthStateChangeMock.mockReset()
  })

  it('requests a device approval with the expected RPC payload', async () => {
    rpcMock.mockResolvedValue({
      data: {
        requestId: 'req-1',
        requestSecret: 'secret',
        userCode: 'ABCD-EFGH',
        verificationUri: '/device-approval?code=ABCD-EFGH',
        verificationUriComplete: '/device-approval?code=ABCD-EFGH',
        pollIntervalSeconds: 5,
        expiresAt: '2026-03-28T00:10:00Z',
        status: 'pending',
      },
      error: null,
    })

    const result = await repo.requestDeviceApproval({
      label: 'CLI',
      requestTtlMinutes: 10,
      tokenTtlHours: 24,
    })

    expect(rpcMock).toHaveBeenCalledWith('fn_auth_request_device_approval', {
      p_label: 'CLI',
      p_request_ttl_minutes: 10,
      p_token_ttl_hours: 24,
    })
    expect(result.requestId).toBe('req-1')
  })

  it('lists developer tokens through the auth RPC', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'tok-1',
          label: 'CLI',
          tokenPrefix: 'abcdef12',
          status: 'active',
          expiresAt: '2026-03-28T01:00:00Z',
          createdAt: '2026-03-28T00:00:00Z',
          revokedAt: null,
          lastUsedAt: null,
        },
      ],
      error: null,
    })

    const tokens = await repo.listDeveloperTokens()

    expect(rpcMock).toHaveBeenCalledWith('fn_auth_list_developer_tokens')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].id).toBe('tok-1')
  })
})
