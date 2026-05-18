import { describe, expect, it } from 'vitest'

import { decryptEnvelope, encryptEnvelope, safeEqual } from '../src/lib/cipher'
import { LocalKeyStoreError } from '../src/lib/ports'

import type { KeyEnvelope } from '../src/lib/envelope'
import type { LocalKeyMetadata } from '../src/lib/ports'

const PASS = 'a-strong-test-passphrase-that-is-long-enough'
const PLAINTEXT = 'sk-test-1234567890abcdef'
const meta = (): LocalKeyMetadata => ({
  id: 'abcd1234abcd1234abcd1234',
  provider: 'openai',
  label: 'Test key',
  createdAt: new Date().toISOString(),
})

describe('cipher', () => {
  it('round-trips encrypt -> decrypt', () => {
    const env = encryptEnvelope(PASS, PLAINTEXT, meta())
    expect(decryptEnvelope(PASS, env)).toBe(PLAINTEXT)
  })

  it('wrong passphrase fails with decryption_failed', () => {
    const env = encryptEnvelope(PASS, PLAINTEXT, meta())
    let caught: unknown
    try {
      decryptEnvelope('not-the-passphrase-but-also-long-enough', env)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(LocalKeyStoreError)
    expect((caught as LocalKeyStoreError).code).toBe('decryption_failed')
  })

  it('truncated ciphertext fails with corrupt_envelope', () => {
    const env = encryptEnvelope(PASS, PLAINTEXT, meta())
    const truncated: KeyEnvelope = { ...env, ciphertext: '' }
    expect(() => decryptEnvelope(PASS, truncated)).toThrowError(/Empty ciphertext|corrupt_envelope/)
  })

  it('tampered auth tag fails with decryption_failed', () => {
    const env = encryptEnvelope(PASS, PLAINTEXT, meta())
    const tagBuf = Buffer.from(env.tag, 'base64')
    tagBuf[0] ^= 0xff
    const tampered: KeyEnvelope = { ...env, tag: tagBuf.toString('base64') }
    let caught: unknown
    try {
      decryptEnvelope(PASS, tampered)
    } catch (err) {
      caught = err
    }
    expect((caught as LocalKeyStoreError).code).toBe('decryption_failed')
  })

  it('tampered IV fails with decryption_failed', () => {
    const env = encryptEnvelope(PASS, PLAINTEXT, meta())
    const ivBuf = Buffer.from(env.iv, 'base64')
    ivBuf[0] ^= 0xff
    const tampered: KeyEnvelope = { ...env, iv: ivBuf.toString('base64') }
    let caught: unknown
    try {
      decryptEnvelope(PASS, tampered)
    } catch (err) {
      caught = err
    }
    expect((caught as LocalKeyStoreError).code).toBe('decryption_failed')
  })

  it('produces a fresh IV across many encryptions (no nonce reuse)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const env = encryptEnvelope(PASS, PLAINTEXT, meta())
      expect(seen.has(env.iv)).toBe(false)
      seen.add(env.iv)
    }
  }, 60_000)

  it('produces a fresh salt across many encryptions', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const env = encryptEnvelope(PASS, PLAINTEXT, meta())
      expect(seen.has(env.salt)).toBe(false)
      seen.add(env.salt)
    }
  }, 60_000)

  it('serialized envelope does not contain the plaintext as a substring', () => {
    const distinct = 'sk-uniqueplaintext-AbCdEf-987654321'
    const env = encryptEnvelope(PASS, distinct, meta())
    const blob = JSON.stringify(env)
    expect(blob.includes(distinct)).toBe(false)
  })

  it('safeEqual returns true for identical strings, false otherwise', () => {
    expect(safeEqual('hello', 'hello')).toBe(true)
    expect(safeEqual('hello', 'world')).toBe(false)
    expect(safeEqual('hello', 'hellox')).toBe(false)
    expect(safeEqual('', '')).toBe(true)
  })
})
