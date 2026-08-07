jest.mock('@lenserfight/cli-client', () => {
  const actual = jest.requireActual('@lenserfight/cli-client')
  return {
    ...actual,
    resolveConfig: jest.fn(),
    resolveBearerToken: jest.fn(),
  }
})

import { resolveBearerToken, resolveConfig } from '@lenserfight/cli-client'

import { hasResolvableAuthToken } from './has-auth-token'

const mockResolveConfig = resolveConfig as jest.MockedFunction<typeof resolveConfig>
const mockResolveBearerToken = resolveBearerToken as jest.MockedFunction<typeof resolveBearerToken>

describe('hasResolvableAuthToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns false when no bearer token resolves', () => {
    mockResolveConfig.mockReturnValue({} as ReturnType<typeof resolveConfig>)
    mockResolveBearerToken.mockReturnValue(undefined)
    expect(hasResolvableAuthToken()).toBe(false)
  })

  it('returns true for a token with no expiry set', () => {
    mockResolveConfig.mockReturnValue({} as ReturnType<typeof resolveConfig>)
    mockResolveBearerToken.mockReturnValue('a-token')
    expect(hasResolvableAuthToken()).toBe(true)
  })

  it('returns true for a token that has not expired yet', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    mockResolveConfig.mockReturnValue({ authExpiresAt: future } as ReturnType<typeof resolveConfig>)
    mockResolveBearerToken.mockReturnValue('a-token')
    expect(hasResolvableAuthToken()).toBe(true)
  })

  it('returns false for a present but expired token — this is the actual bug it fixes: a stale token would otherwise still reach callRpc and trip an interactive auth-recovery prompt', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    mockResolveConfig.mockReturnValue({ authExpiresAt: past } as ReturnType<typeof resolveConfig>)
    mockResolveBearerToken.mockReturnValue('a-stale-token')
    expect(hasResolvableAuthToken()).toBe(false)
  })

  it('returns false when config resolution throws', () => {
    mockResolveConfig.mockImplementation(() => {
      throw new Error('no config')
    })
    expect(hasResolvableAuthToken()).toBe(false)
  })
})
