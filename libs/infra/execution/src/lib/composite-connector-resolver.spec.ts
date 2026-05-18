import { describe, it, expect, vi } from 'vitest'
import { createCompositeConnectorResolver } from './composite-connector-resolver'
import type { ConnectorCredentialResolver } from './connector-credential-resolver'

function makeResolver(returns: string | null): ConnectorCredentialResolver {
  return { resolve: vi.fn(async () => returns) }
}

describe('createCompositeConnectorResolver', () => {
  it('routes a valid OAuth ref (provider.capability.label) to the OAuth resolver', async () => {
    const oauthResolver = makeResolver('oauth_token')
    const platformResolver = makeResolver('platform_token')
    const composite = createCompositeConnectorResolver(oauthResolver, platformResolver)

    const result = await composite.resolve('google.gmail.primary', ['scope'])
    expect(result).toBe('oauth_token')
    expect(oauthResolver.resolve).toHaveBeenCalledWith('google.gmail.primary', ['scope'])
    expect(platformResolver.resolve).not.toHaveBeenCalled()
  })

  it('routes a platform slug (non-OAuth ref) to the platform resolver', async () => {
    const oauthResolver = makeResolver('oauth_token')
    const platformResolver = makeResolver('platform_token')
    const composite = createCompositeConnectorResolver(oauthResolver, platformResolver)

    const result = await composite.resolve('my-platform-connector')
    expect(result).toBe('platform_token')
    expect(platformResolver.resolve).toHaveBeenCalledWith('my-platform-connector', undefined)
    expect(oauthResolver.resolve).not.toHaveBeenCalled()
  })

  it('routes an empty slug to platform resolver (not a valid OAuth ref)', async () => {
    const oauthResolver = makeResolver('oauth_token')
    const platformResolver = makeResolver(null)
    const composite = createCompositeConnectorResolver(oauthResolver, platformResolver)

    const result = await composite.resolve('')
    expect(result).toBeNull()
    expect(platformResolver.resolve).toHaveBeenCalled()
    expect(oauthResolver.resolve).not.toHaveBeenCalled()
  })

  it('routes unknown-provider ref to platform resolver (not a parseable OAuth ref)', async () => {
    const oauthResolver = makeResolver('should_not_return')
    const platformResolver = makeResolver('platform_result')
    const composite = createCompositeConnectorResolver(oauthResolver, platformResolver)

    // 'github.sheets.primary' — provider 'github' is not a valid OAuth provider
    const result = await composite.resolve('github.sheets.primary')
    expect(result).toBe('platform_result')
    expect(platformResolver.resolve).toHaveBeenCalled()
    expect(oauthResolver.resolve).not.toHaveBeenCalled()
  })

  it('propagates null from OAuth resolver when connection is missing', async () => {
    const oauthResolver = makeResolver(null)
    const platformResolver = makeResolver('platform_token')
    const composite = createCompositeConnectorResolver(oauthResolver, platformResolver)

    const result = await composite.resolve('google.calendar.primary')
    expect(result).toBeNull()
    expect(oauthResolver.resolve).toHaveBeenCalled()
    expect(platformResolver.resolve).not.toHaveBeenCalled()
  })
})
