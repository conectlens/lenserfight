import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_RETURN_URL, replaceLocationSafely, sanitizeReturnUrl } from './authReturnUrl'

describe('sanitizeReturnUrl relative paths', () => {
  it.each(['/device-approval?code=ABCD&mode=login', '/login?return_url=%2Fx', '/'])(
    'keeps same-origin path %s',
    (path) => {
      expect(sanitizeReturnUrl(path)).toBe(path)
    }
  )

  it.each([
    '/\\evil.example',
    '/\\/evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '//evil.example',
    '/\u0000/evil.example',
    '/auth/login',
  ])('rejects %j', (value) => {
    expect(sanitizeReturnUrl(value)).toBe(DEFAULT_RETURN_URL)
  })

  it('still rejects unknown absolute origins and script URLs', () => {
    expect(sanitizeReturnUrl('https://evil.example/')).toBe(DEFAULT_RETURN_URL)
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe(DEFAULT_RETURN_URL)
  })
})

describe('replaceLocationSafely', () => {
  const original = window.location

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: original, configurable: true })
  })

  function stubLocation() {
    const replace = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'http://localhost:3004',
        href: 'http://localhost:3004/login',
        hostname: 'localhost',
        replace,
      },
    })
    return replace
  }

  it('navigates to same-origin paths', () => {
    const replace = stubLocation()
    replaceLocationSafely('/device-approval?code=X')
    expect(replace).toHaveBeenCalledWith('http://localhost:3004/device-approval?code=X')
  })

  it.each(['/\\evil.example', 'https://evil.example/', 'javascript:alert(1)'])(
    'never navigates to %s',
    (value) => {
      const replace = stubLocation()
      replaceLocationSafely(value)
      for (const call of replace.mock.calls) {
        expect(String(call[0])).not.toContain('evil.example')
        expect(String(call[0])).not.toMatch(/^javascript:/i)
      }
    }
  )
})
