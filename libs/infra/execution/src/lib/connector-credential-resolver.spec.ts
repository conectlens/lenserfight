import { describe, it, expect, vi } from 'vitest'

import {
  nullConnectorResolver,
  createServerConnectorResolver,
} from './connector-credential-resolver'

describe('nullConnectorResolver', () => {
  it('always returns null', async () => {
    const result = await nullConnectorResolver.resolve('any-slug')
    expect(result).toBeNull()
  })

  it('returns null regardless of scopes', async () => {
    const result = await nullConnectorResolver.resolve('my-connector', ['lenses:read', 'workflows:write'])
    expect(result).toBeNull()
  })
})

describe('createServerConnectorResolver', () => {
  it('returns token when connector is valid and has required scopes', async () => {
    const rpcCall = vi.fn()
      .mockImplementation((name: string) => {
        if (name === 'fn_connector_test') {
          return Promise.resolve({ ok: true, scopes: ['lenses:read', 'workflows:write'] })
        }
        if (name === 'fn_connector_resolve_token') {
          return Promise.resolve('sk-secret-token-value')
        }
        return Promise.resolve(null)
      })

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('my-connector', ['lenses:read'])

    expect(token).toBe('sk-secret-token-value')
    expect(rpcCall).toHaveBeenCalledWith('fn_connector_test', { p_slug: 'my-connector' })
    expect(rpcCall).toHaveBeenCalledWith('fn_connector_resolve_token', { p_slug: 'my-connector' })
  })

  it('returns null when connector test fails', async () => {
    const rpcCall = vi.fn().mockResolvedValue({ ok: false, reason: 'token_revoked' })

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('revoked-connector')

    expect(token).toBeNull()
  })

  it('returns null when required scopes are missing', async () => {
    const rpcCall = vi.fn()
      .mockResolvedValue({ ok: true, scopes: ['lenses:read'] })

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('limited-connector', ['workflows:write'])

    expect(token).toBeNull()
    // Should not attempt to resolve token if scope check fails
    expect(rpcCall).toHaveBeenCalledTimes(1)
  })

  it('returns null when RPC throws', async () => {
    const rpcCall = vi.fn().mockRejectedValue(new Error('network error'))

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('broken-connector')

    expect(token).toBeNull()
  })

  it('returns null when test result is null', async () => {
    const rpcCall = vi.fn().mockResolvedValue(null)

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('unknown-connector')

    expect(token).toBeNull()
  })

  it('passes without scope validation when no scopes required', async () => {
    const rpcCall = vi.fn()
      .mockImplementation((name: string) => {
        if (name === 'fn_connector_test') {
          return Promise.resolve({ ok: true, scopes: [] })
        }
        if (name === 'fn_connector_resolve_token') {
          return Promise.resolve('token-value')
        }
        return Promise.resolve(null)
      })

    const resolver = createServerConnectorResolver(rpcCall)
    const token = await resolver.resolve('no-scopes-needed')

    expect(token).toBe('token-value')
  })
})
