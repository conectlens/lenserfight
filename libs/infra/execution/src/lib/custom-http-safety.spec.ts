import { describe, expect, it } from 'vitest'
import {
  maskSensitiveFields,
  sanitizeCustomHttpHeaders,
  validateCustomHttpUrl,
} from './custom-http-safety'

describe('custom HTTP safety', () => {
  it('requires HTTPS and an allowlisted host', () => {
    expect(validateCustomHttpUrl('http://example.com/hook', { allowlistedHosts: ['example.com'] })).toEqual({
      ok: false,
      reason: 'https_required',
    })
    expect(validateCustomHttpUrl('https://example.com/hook', { allowlistedHosts: ['example.com'] }).ok).toBe(true)
  })

  it('blocks localhost, private ranges, and metadata hosts', () => {
    for (const url of [
      'https://localhost/hook',
      'https://127.0.0.1/hook',
      'https://10.0.0.1/hook',
      'https://192.168.0.10/hook',
      'https://169.254.169.254/latest',
      'https://metadata.google.internal/latest',
    ]) {
      expect(validateCustomHttpUrl(url, { allowlistedHosts: [new URL(url).hostname] })).toEqual({
        ok: false,
        reason: 'private_or_metadata_host_blocked',
      })
    }
  })

  it('strips unsafe headers and masks sensitive fields', () => {
    expect(sanitizeCustomHttpHeaders({
      Authorization: 'Bearer secret',
      Accept: 'application/json',
      Cookie: 'x=y',
      'Content-Type': 'application/json',
    })).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })

    expect(maskSensitiveFields({ token: 'abc', nested: { apiKey: 'def', keep: true } })).toEqual({
      token: '[REDACTED]',
      nested: { apiKey: '[REDACTED]', keep: true },
    })
  })
})
