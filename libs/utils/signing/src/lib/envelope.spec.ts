import { describe, expect, it } from 'vitest'

import { canonicalize } from './canonicalize'
import { generateEd25519Keypair } from './ed25519'
import { generateNonce, nowIat } from './nonce'
import { signEnvelope, verifyEnvelope } from './envelope'

describe('canonicalize', () => {
  it('sorts object keys by code unit', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(canonicalize({ '\u00e9': 1, e: 2 })).toBe('{"e":2,"\u00e9":1}')
  })

  it('escapes control characters', () => {
    expect(canonicalize('a\nb')).toBe('"a\\nb"')
    expect(canonicalize('\u0001')).toBe('"\\u0001"')
  })

  it('preserves nested arrays and order', () => {
    expect(canonicalize({ x: [3, 1, 2] })).toBe('{"x":[3,1,2]}')
  })

  it('throws on undefined leaf', () => {
    expect(() => canonicalize(undefined)).toThrow()
  })

  it('drops undefined object properties', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}')
  })
})

describe('signEnvelope / verifyEnvelope', () => {
  it('round-trips a signed envelope', () => {
    const { publicKey, privateKey } = generateEd25519Keypair()
    const env = signEnvelope(privateKey, 'device-1', { hello: 'world' })
    expect(verifyEnvelope(publicKey, env)).toEqual({ ok: true })
  })

  it('rejects mutated bodies', () => {
    const { publicKey, privateKey } = generateEd25519Keypair()
    const env = signEnvelope(privateKey, 'device-1', { n: 1 })
    const tampered = { ...env, body: { n: 2 } }
    expect(verifyEnvelope(publicKey, tampered)).toEqual({
      ok: false,
      reason: 'signature_mismatch',
    })
  })

  it('rejects out-of-window iat', () => {
    const { publicKey, privateKey } = generateEd25519Keypair()
    const env = signEnvelope(privateKey, 'd', { x: 1 }, { iat: nowIat() - 1000 })
    expect(verifyEnvelope(publicKey, env, { now: nowIat() })).toEqual({
      ok: false,
      reason: 'iat_window',
    })
  })

  it('rejects mismatched kid when expectedKid is set', () => {
    const { publicKey, privateKey } = generateEd25519Keypair()
    const env = signEnvelope(privateKey, 'd1', {})
    expect(verifyEnvelope(publicKey, env, { expectedKid: 'd2' })).toEqual({
      ok: false,
      reason: 'kid_mismatch',
    })
  })

  it('rejects invalid nonces', () => {
    const { publicKey, privateKey } = generateEd25519Keypair()
    const env = signEnvelope(privateKey, 'd', {}, { nonce: 'short' })
    expect(verifyEnvelope(publicKey, env)).toEqual({
      ok: false,
      reason: 'nonce_invalid',
    })
  })
})

describe('generateNonce', () => {
  it('returns base64url of correct size', () => {
    const n = generateNonce(16)
    expect(n).toMatch(/^[A-Za-z0-9_-]+$/)
    // 16 bytes → 22 base64url chars (no padding)
    expect(n.length).toBeGreaterThanOrEqual(20)
  })
})
