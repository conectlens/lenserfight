import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createOAuthConnectionResolver, nullOAuthConnectionResolver } from './oauth-connection-resolver'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeClient(overrides: {
  refreshMeta?: Record<string, unknown> | null
  token?: string | null
  resolveError?: { message: string } | null
} = {}) {
  return {
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'fn_oauth_get_connection_for_refresh') {
        return { data: overrides.refreshMeta ?? null, error: null }
      }
      if (fn === 'fn_oauth_resolve_connection') {
        return { data: overrides.token ?? null, error: overrides.resolveError ?? null }
      }
      // fn_oauth_upsert_connection (called after inline refresh)
      return { data: null, error: null }
    }),
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('createOAuthConnectionResolver', () => {
  const lenserId = '00000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'test-client-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns null for an invalid (non-OAuth) ref', async () => {
    const client = makeClient({ token: 'tok' })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('platform-slug')
    expect(result).toBeNull()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('returns the access token for a valid ref with no refresh needed', async () => {
    const client = makeClient({ token: 'ya29.access_token', refreshMeta: null })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.gmail.primary', ['https://www.googleapis.com/auth/gmail.send'])
    expect(result).toBe('ya29.access_token')
    expect(client.rpc).toHaveBeenCalledWith('fn_oauth_resolve_connection', expect.objectContaining({
      p_ref: 'google.gmail.primary',
    }))
  })

  it('triggers inline Google token refresh and still returns token when near expiry', async () => {
    const refreshMeta = {
      connection_id: 'conn-1',
      refresh_token: 'refresh_tok',
      expires_at: new Date(Date.now() + 60_000).toISOString(), // 1 min from now
      granted_scopes: ['https://www.googleapis.com/auth/gmail.send'],
      provider: 'google',
      capability: 'gmail',
    }
    const client = makeClient({ refreshMeta, token: 'ya29.fresh' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'ya29.new_access',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/gmail.send',
      }),
    }))

    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.gmail.primary')
    expect(result).toBe('ya29.fresh')
    // Google token endpoint must have been called
    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    )
    // fn_oauth_upsert_connection must have been called with the new access token
    expect(client.rpc).toHaveBeenCalledWith('fn_oauth_upsert_connection', expect.objectContaining({
      p_access_token: 'ya29.new_access',
      p_lenser_id: lenserId,
    }))
  })

  it('returns null when fn_oauth_resolve_connection returns an error', async () => {
    const client = makeClient({ token: null, resolveError: { message: 'scope_mismatch' } })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.sheets.primary')
    expect(result).toBeNull()
  })

  it('returns null when fn_oauth_resolve_connection returns null token', async () => {
    const client = makeClient({ token: null })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.calendar.primary')
    expect(result).toBeNull()
  })

  it('returns null and does not throw when the RPC throws', async () => {
    const client = {
      rpc: vi.fn().mockRejectedValue(new Error('network error')),
    }
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.gmail.primary')
    expect(result).toBeNull()
  })

  it('skips token refresh and does not call fetch when GOOGLE_OAUTH_CLIENT_ID is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'test-secret')
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const refreshMeta = {
      connection_id: 'conn-1',
      refresh_token: 'refresh_tok',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      granted_scopes: [],
      provider: 'google',
      capability: 'gmail',
    }
    const client = makeClient({ refreshMeta, token: 'ya29.existing' })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.gmail.primary')
    expect(result).toBe('ya29.existing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips token refresh and does not call fetch when GOOGLE_OAUTH_CLIENT_SECRET is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'test-client-id')
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const refreshMeta = {
      connection_id: 'conn-2',
      refresh_token: 'refresh_tok',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      granted_scopes: [],
      provider: 'google',
      capability: 'drive',
    }
    const client = makeClient({ refreshMeta, token: 'ya29.existing' })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.drive.primary')
    expect(result).toBe('ya29.existing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips token refresh for non-google providers', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const refreshMeta = {
      connection_id: 'conn-3',
      refresh_token: 'gh_refresh_tok',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      granted_scopes: [],
      provider: 'github',
      capability: 'repos',
    }
    const client = makeClient({ refreshMeta, token: 'ghs_existing' })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('github.repos.primary')
    expect(result).toBe('ghs_existing')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('nullOAuthConnectionResolver', () => {
  it('always returns null regardless of arguments', async () => {
    expect(await nullOAuthConnectionResolver.resolve('google.gmail.primary', ['scope'])).toBeNull()
    expect(await nullOAuthConnectionResolver.resolve('anything')).toBeNull()
    expect(await nullOAuthConnectionResolver.resolve('')).toBeNull()
  })
})
