import { getAuthGateRedirectUrl, getPostOAuthRedirectUrl } from './authRedirects'

describe('auth redirects', () => {
  it('routes active users back to the return url', () => {
    expect(
      getAuthGateRedirectUrl({ kind: 'active', status: 'active' }, 'http://localhost:3000/')
    ).toBe('http://localhost:3000/')
  })

  it('routes new users into onboarding', () => {
    expect(getAuthGateRedirectUrl({ kind: 'new' }, 'http://localhost:3000/')).toBe(
      'http://localhost:3000/onboarding?return_url=http%3A%2F%2Flocalhost%3A3000%2F'
    )
  })

  it('routes partially onboarded users back into onboarding', () => {
    expect(
      getAuthGateRedirectUrl(
        { kind: 'onboarding', status: 'active', onboardingStep: 1 },
        'http://localhost:3000/'
      )
    ).toBe('http://localhost:3000/onboarding?return_url=http%3A%2F%2Flocalhost%3A3000%2F')
  })

  it('routes deleted users to the terminal page', () => {
    expect(
      getAuthGateRedirectUrl({ kind: 'deleted', status: 'deleted' }, 'http://localhost:3000/')
    ).toBe('/account-unavailable?return_url=http%3A%2F%2Flocalhost%3A3000%2F')
  })

  it('routes recoverable users to the restore page', () => {
    expect(
      getAuthGateRedirectUrl(
        { kind: 'recoverable', status: 'pending_deletion', deletionDeadlineAt: '2026-04-18' },
        'http://localhost:3000/'
      )
    ).toBe('/account-recovery?return_url=http%3A%2F%2Flocalhost%3A3000%2F')
  })

  it('returns OAuth users to auth-controlled login first', () => {
    expect(getPostOAuthRedirectUrl('http://localhost:3000/')).toBe(
      '/login?return_url=http%3A%2F%2Flocalhost%3A3000%2F'
    )
  })
})
