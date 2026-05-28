import { createHmac } from 'node:crypto'
import { verifyLenserfightSignature } from './verify'

const SECRET = 'whsec_test_super_secret_123'
const BODY = '{"event":"battle.published","id":"btl-1"}'

function signed(body: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf-8').digest('hex')
}

describe('verifyLenserfightSignature', () => {
  it('returns true for a valid sha256 signature on the exact body', () => {
    expect(verifyLenserfightSignature(SECRET, BODY, signed(BODY))).toBe(true)
  })

  it('returns false when the body is tampered after signing', () => {
    const sig = signed(BODY)
    expect(verifyLenserfightSignature(SECRET, BODY + ' ', sig)).toBe(false)
  })

  it('returns false when the secret is wrong', () => {
    expect(
      verifyLenserfightSignature('different-secret', BODY, signed(BODY))
    ).toBe(false)
  })

  it('returns false on a malformed header (missing prefix)', () => {
    expect(verifyLenserfightSignature(SECRET, BODY, '0123abcd')).toBe(false)
  })

  it('returns false on a non-hex signature payload', () => {
    expect(
      verifyLenserfightSignature(SECRET, BODY, 'sha256=NOTHEX' + 'z'.repeat(58))
    ).toBe(false)
  })

  it('returns false on empty inputs', () => {
    expect(verifyLenserfightSignature('', BODY, signed(BODY))).toBe(false)
    expect(verifyLenserfightSignature(SECRET, '', signed(BODY))).toBe(false)
    expect(verifyLenserfightSignature(SECRET, BODY, '')).toBe(false)
  })

  it('accepts headers with mixed-case prefix', () => {
    const sig = signed(BODY).replace('sha256=', 'SHA256=')
    expect(verifyLenserfightSignature(SECRET, BODY, sig)).toBe(true)
  })
})
