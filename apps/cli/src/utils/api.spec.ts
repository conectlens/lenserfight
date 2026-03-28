import { resolveBearerToken } from './api'

describe('resolveBearerToken', () => {
  const config = {
    mode: 'local' as const,
    supabaseUrl: 'http://127.0.0.1:54321',
    authBaseUrl: 'http://localhost:3004',
    supabaseAnonKey: 'anon',
    supabaseServiceRoleKey: 'service',
    developerToken: 'developer',
    authToken: 'session',
    dbPort: 54322,
    apiPort: 54321,
  }

  it('prefers the developer token for automation calls when requested', () => {
    expect(resolveBearerToken(config, { useDeveloperToken: true })).toBe('developer')
  })

  it('falls back to the session token for non-automation calls', () => {
    expect(resolveBearerToken(config)).toBe('session')
  })

  it('prefers the service role key when explicitly requested', () => {
    expect(resolveBearerToken(config, { useServiceRole: true })).toBe('service')
  })
})
