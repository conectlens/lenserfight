import { describe, expect, it } from 'vitest'

import { resolveSafeRedirectTarget } from './safeRedirect'

describe('resolveSafeRedirectTarget', () => {
  it('allows same-origin internal paths and preserves query strings', () => {
    const result = resolveSafeRedirectTarget('/app/threads/abc?tab=latest#replies', {
      baseOrigin: 'https://forum.lenserfight.win',
    })

    expect(result).toEqual({
      kind: 'internal',
      url: '/threads/abc?tab=latest#replies',
    })
  })

  it('rejects javascript URLs', () => {
    expect(resolveSafeRedirectTarget('javascript:alert(1)', {
      baseOrigin: 'https://forum.lenserfight.win',
    })).toBeNull()
  })

  it('rejects external hosts unless they are allowlisted', () => {
    expect(
      resolveSafeRedirectTarget('https://example.com/landing', {
        baseOrigin: 'https://forum.lenserfight.win',
      })
    ).toBeNull()

    expect(
      resolveSafeRedirectTarget('https://example.com/landing', {
        baseOrigin: 'https://forum.lenserfight.win',
        allowedExternalHosts: ['example.com'],
      })
    ).toEqual({
      kind: 'external',
      url: 'https://example.com/landing',
    })
  })
})
