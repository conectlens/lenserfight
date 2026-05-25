import { describe, expect, it } from 'vitest'
import { isLoopbackOrLocalUrl, rewriteUrlOrigin } from './urlUtils'

describe('urlUtils', () => {
  it('detects loopback hosts', () => {
    expect(isLoopbackOrLocalUrl('http://127.0.0.1:54321/storage/v1/object/sign/x')).toBe(true)
    expect(isLoopbackOrLocalUrl('http://localhost:54321/x')).toBe(true)
    expect(isLoopbackOrLocalUrl('https://example.com/x')).toBe(false)
  })

  it('rewrites signed URL origin', () => {
    const signed =
      'http://127.0.0.1:54321/storage/v1/object/sign/bucket/key?token=abc'
    const out = rewriteUrlOrigin(signed, 'https://tunnel.example.com')
    expect(out).toBe('https://tunnel.example.com/storage/v1/object/sign/bucket/key?token=abc')
  })
})
