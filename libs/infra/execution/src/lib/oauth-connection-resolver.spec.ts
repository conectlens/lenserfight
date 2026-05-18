import { describe, it, expect, vi, beforeEach } from 'vitest'
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
      // fn_invoke_edge (refresh trigger)
      return { data: null, error: null }
    }),
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('createOAuthConnectionResolver', () => {
  const lenserId = '00000000-0000-0000-0000-000000000001'

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

  it('triggers refresh and still returns token when near expiry', async () => {
    const refreshMeta = {
      connection_id: 'conn-1',
      refresh_token: 'refresh_tok',
      expires_at: new Date(Date.now() + 60_000).toISOString(), // 1 min from now
      granted_scopes: ['https://www.googleapis.com/auth/gmail.send'],
      provider: 'google',
      capability: 'gmail',
    }
    const client = makeClient({ refreshMeta, token: 'ya29.fresh' })
    const resolver = createOAuthConnectionResolver(client, lenserId)
    const result = await resolver.resolve('google.gmail.primary')
    expect(result).toBe('ya29.fresh')
    // fn_invoke_edge must have been called for refresh
    expect(client.rpc).toHaveBeenCalledWith('fn_invoke_edge', expect.objectContaining({
      p_function: 'oauth-token-refresh',
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
})

describe('nullOAuthConnectionResolver', () => {
  it('always returns null regardless of arguments', async () => {
    expect(await nullOAuthConnectionResolver.resolve('google.gmail.primary', ['scope'])).toBeNull()
    expect(await nullOAuthConnectionResolver.resolve('anything')).toBeNull()
    expect(await nullOAuthConnectionResolver.resolve('')).toBeNull()
  })
})
