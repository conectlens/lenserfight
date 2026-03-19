import { DEFAULT_RETURN_URL, sanitizeReturnUrl } from './validateReturnUrl'

describe('sanitizeReturnUrl', () => {
  it('allows valid forum routes', () => {
    expect(sanitizeReturnUrl('http://localhost:3000/threads/abc?tab=latest')).toBe(
      'http://localhost:3000/threads/abc?tab=latest'
    )
  })

  it('rejects forum auth proxy routes that would bounce back to auth', () => {
    expect(sanitizeReturnUrl('http://localhost:3000/auth/login')).toBe(DEFAULT_RETURN_URL)
  })

  it('rejects auth app routes so auth never redirects back into itself', () => {
    expect(
      sanitizeReturnUrl('http://localhost:3004/onboarding?return_url=http%3A%2F%2Flocalhost%3A3000%2F')
    ).toBe(DEFAULT_RETURN_URL)
  })

  it('falls back for unknown origins', () => {
    expect(sanitizeReturnUrl('https://example.com/')).toBe(DEFAULT_RETURN_URL)
  })
})
