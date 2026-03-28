import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseAuthRepository } from './authRepository'

const rpcMock = vi.fn()

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      resend: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

describe('SupabaseAuthRepository device approval flow', () => {
  const repo = new SupabaseAuthRepository()

  beforeEach(() => {
    rpcMock.mockReset()
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
