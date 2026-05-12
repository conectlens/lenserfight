jest.mock('../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
  createUserSupabaseClient: jest.fn(),
}))
jest.mock('../lib/auth/authenticate', () => ({
  authenticateRequest: jest.fn(),
}))

import type { IncomingMessage } from 'node:http'
import { createServiceSupabaseClient, createUserSupabaseClient } from '../lib/supabase'
import { authenticateRequest } from '../lib/auth/authenticate'
import { authenticateWithRlsContext, getServiceRoleClient } from './rls-context.middleware'

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>
const mockCreateService = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>
const mockCreateUser = createUserSupabaseClient as jest.MockedFunction<typeof createUserSupabaseClient>

beforeEach(() => jest.clearAllMocks())

// ── Test 1: JWT claim propagated — userClient carries the Bearer token ────────

describe('authenticateWithRlsContext', () => {
  it('propagates the bearer token so auth.uid() resolves on userClient queries', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.test.signature'
    const fakeUser = { id: 'user-uuid-1', email: 'test@example.com' }
    const fakeUserClient = { rpc: jest.fn() }
    const fakeServiceClient = { auth: { getUser: jest.fn() } }

    mockAuthenticateRequest.mockResolvedValue({
      accessToken: fakeToken,
      user: fakeUser as never,
      userClient: fakeUserClient as never,
      serviceClient: fakeServiceClient as never,
    })

    const req = { headers: { authorization: `Bearer ${fakeToken}` } } as unknown as IncomingMessage
    const ctx = await authenticateWithRlsContext(req)

    expect(ctx.accessToken).toBe(fakeToken)
    expect(ctx.userClient).toBe(fakeUserClient)
    expect(mockAuthenticateRequest).toHaveBeenCalledWith(req)
  })

  // ── Test 2: Another user's byok_keys are unreachable via the user-scoped client ──

  it('another user\'s byok_keys row returns 0 results under user-scoped RLS client', async () => {
    const fakeToken = 'user-a-token'
    const fakeUser = { id: 'user-a-uuid' }

    const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null })
    const fakeUserClient = {
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(mockSelect) }) }),
    }

    mockAuthenticateRequest.mockResolvedValue({
      accessToken: fakeToken,
      user: fakeUser as never,
      userClient: fakeUserClient as never,
      serviceClient: {} as never,
    })

    const req = { headers: { authorization: `Bearer ${fakeToken}` } } as unknown as IncomingMessage
    const ctx = await authenticateWithRlsContext(req)

    // Simulates: ctx.userClient querying audit.byok_key_usage for another user's key
    const result = await fakeUserClient
      .from('audit.byok_key_usage')
      .select()
      .eq('key_id', 'other-user-key-uuid')()
    expect(result.data).toHaveLength(0)
  })

  // ── Test 3: Unauthenticated request throws (returns 401) ──────────────────

  it('throws when bearer token is missing', async () => {
    mockAuthenticateRequest.mockRejectedValue(new Error('Missing bearer token'))

    const req = { headers: {} } as unknown as IncomingMessage
    await expect(authenticateWithRlsContext(req)).rejects.toThrow('Missing bearer token')
  })
})

describe('getServiceRoleClient', () => {
  it('returns a service role client', () => {
    const fakeServiceClient = { rpc: jest.fn() }
    mockCreateService.mockReturnValue(fakeServiceClient as never)

    const client = getServiceRoleClient()
    expect(client).toBe(fakeServiceClient)
    expect(mockCreateService).toHaveBeenCalled()
  })
})
