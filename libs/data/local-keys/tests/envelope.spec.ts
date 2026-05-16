import { describe, expect, it } from 'vitest'

import { encryptEnvelope } from '../src/lib/cipher'
import { isKeyEnvelope, parseEnvelopeJson, serializeEnvelope } from '../src/lib/envelope'
import { LocalKeyStoreError } from '../src/lib/ports'

const meta = { id: 'abcd1234abcd1234abcd1234', provider: 'openai', label: 'L', createdAt: '2025-01-01T00:00:00Z' }

describe('envelope', () => {
  it('round-trips through serializeEnvelope/parseEnvelopeJson', () => {
    const env = encryptEnvelope('a-strong-test-passphrase-12345', 'plaintext', meta)
    const json = serializeEnvelope(env)
    const parsed = parseEnvelopeJson(json)
    expect(parsed).toEqual(env)
  })

  it('isKeyEnvelope rejects shapes missing required fields', () => {
    expect(isKeyEnvelope(null)).toBe(false)
    expect(isKeyEnvelope({})).toBe(false)
    expect(isKeyEnvelope({ v: 2, alg: 'aes-256-gcm', kdf: 'scrypt' })).toBe(false)
    expect(
      isKeyEnvelope({
        v: 1,
        alg: 'aes-256-gcm',
        kdf: 'scrypt',
        salt: 'AAAA',
        iv: 'AAAA',
        ciphertext: 'AAAA',
        tag: 'AAAA',
        meta: {},
      })
    ).toBe(false)
  })

  it('parseEnvelopeJson raises corrupt_envelope on invalid JSON', () => {
    let err: unknown
    try {
      parseEnvelopeJson('{not json}')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(LocalKeyStoreError)
    expect((err as LocalKeyStoreError).code).toBe('corrupt_envelope')
  })

  it('parseEnvelopeJson raises corrupt_envelope on wrong schema', () => {
    let err: unknown
    try {
      parseEnvelopeJson(JSON.stringify({ hello: 'world' }))
    } catch (e) {
      err = e
    }
    expect((err as LocalKeyStoreError).code).toBe('corrupt_envelope')
  })
})
