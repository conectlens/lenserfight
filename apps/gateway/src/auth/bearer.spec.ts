import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BEARER_KEYCHAIN_ACCOUNT,
  BEARER_KEYCHAIN_SERVICE,
  BearerAuthGuard,
  DEFAULT_ALLOWED_ORIGIN_PATTERNS,
} from './bearer'

const BEARER_REF = { service: BEARER_KEYCHAIN_SERVICE, account: BEARER_KEYCHAIN_ACCOUNT }

function memKeychain(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}))
  const key = (s: string, a: string) => `${s}::${a}`
  return {
    getSecret: async (ref: { service: string; account: string }) => store.get(key(ref.service, ref.account)) ?? null,
    setSecret: async (ref: { service: string; account: string; secret: string }) => {
      store.set(key(ref.service, ref.account), ref.secret)
    },
    deleteSecret: async (ref: { service: string; account: string }) => store.delete(key(ref.service, ref.account)),
  }
}

describe('BearerAuthGuard', () => {
  it('issues a token on first ensureToken() and persists it', async () => {
    const adapter = memKeychain()
    const guard = new BearerAuthGuard({ keychainAdapter: adapter })
    const first = await guard.ensureToken()
    expect(first.length).toBeGreaterThan(20)
    const second = await guard.ensureToken()
    expect(second).toBe(first)
  })

  it('rotate() invalidates the old token', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const a = await guard.ensureToken()
    const b = await guard.rotate()
    expect(b).not.toBe(a)
    const denied = await guard.authorize({
      authorization: `Bearer ${a}`,
      origin: 'https://lenserfight.com',
    })
    expect(denied).toMatchObject({ status: 401, reason: 'bad_token' })
    const allowed = await guard.authorize({
      authorization: `Bearer ${b}`,
      origin: 'https://lenserfight.com',
    })
    expect(allowed).toMatchObject({ ok: true })
  })

  it('stops authorizing the old token once another process rotates the keychain entry', async () => {
    const adapter = memKeychain()
    const guard = new BearerAuthGuard({ keychainAdapter: adapter, tokenCacheTtlMs: 0 })
    const oldToken = await guard.ensureToken()
    expect(await guard.authorize({ authorization: `Bearer ${oldToken}`, origin: null })).toMatchObject({ ok: true })

    // `lf gateway pair --rotate` is a separate process: it only writes the keychain.
    const newToken = 'rotated-by-another-process-0123456789abcdef'
    await adapter.setSecret({ ...BEARER_REF, secret: newToken })

    expect(await guard.authorize({ authorization: `Bearer ${oldToken}`, origin: null })).toMatchObject({
      status: 401,
      reason: 'bad_token',
    })
    expect(await guard.authorize({ authorization: `Bearer ${newToken}`, origin: null })).toMatchObject({ ok: true })
  })

  describe('token cache window', () => {
    afterEach(() => vi.useRealTimers())

    it('picks up an external rotation after the cache TTL elapses', async () => {
      vi.useFakeTimers()
      const adapter = memKeychain()
      const guard = new BearerAuthGuard({ keychainAdapter: adapter, tokenCacheTtlMs: 1000 })
      const oldToken = await guard.ensureToken()
      await adapter.setSecret({ ...BEARER_REF, secret: 'new-token-0123456789abcdef-0123456789' })

      // Within the TTL the cached value is reused (no keychain read per request).
      expect(await guard.authorize({ authorization: `Bearer ${oldToken}`, origin: null })).toMatchObject({ ok: true })

      vi.advanceTimersByTime(1001)
      expect(await guard.authorize({ authorization: `Bearer ${oldToken}`, origin: null })).toMatchObject({
        status: 401,
        reason: 'bad_token',
      })
    })
  })

  it('authorize() never writes: an absent or empty entry is bad_token', async () => {
    const adapter = memKeychain()
    let writes = 0
    const guard = new BearerAuthGuard({
      tokenCacheTtlMs: 0,
      keychainAdapter: {
        ...adapter,
        setSecret: async (ref) => {
          writes += 1
          await adapter.setSecret(ref)
        },
      },
    })
    expect(await guard.authorize({ authorization: 'Bearer anything', origin: null })).toMatchObject({
      status: 401,
      reason: 'bad_token',
    })
    expect(await adapter.getSecret(BEARER_REF)).toBeNull()

    // An empty entry must not match an empty presented token.
    await adapter.setSecret({ ...BEARER_REF, secret: '' })
    expect(await guard.authorize({ authorization: 'Bearer ', origin: null })).toMatchObject({
      status: 401,
      reason: 'bad_token',
    })
    expect(writes).toBe(0)
  })

  it('fails closed when the keychain read throws', async () => {
    const adapter = memKeychain()
    let failReads = false
    const guard = new BearerAuthGuard({
      tokenCacheTtlMs: 0,
      keychainAdapter: {
        ...adapter,
        getSecret: async (ref) => {
          if (failReads) throw new Error('keychain locked')
          return adapter.getSecret(ref)
        },
      },
    })
    const token = await guard.ensureToken()
    failReads = true
    expect(await guard.authorize({ authorization: `Bearer ${token}`, origin: null })).toMatchObject({
      status: 401,
      reason: 'bad_token',
    })
  })

  it('returns missing_token for empty authorization', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const r = await guard.authorize({ authorization: null, origin: 'https://lenserfight.com' })
    expect(r).toMatchObject({ status: 401, reason: 'missing_token' })
  })

  it('returns forbidden_origin for unknown origins', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const token = await guard.ensureToken()
    const r = await guard.authorize({
      authorization: `Bearer ${token}`,
      origin: 'https://evil.example',
    })
    expect(r).toMatchObject({ status: 403, reason: 'forbidden_origin' })
  })

  it('allows requests without an Origin header (CLI / non-browser callers)', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const token = await guard.ensureToken()
    const r = await guard.authorize({ authorization: `Bearer ${token}`, origin: null })
    expect(r).toMatchObject({ ok: true })
  })

  it('allows localhost / 127.0.0.1 origins with any port', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const token = await guard.ensureToken()
    for (const origin of ['http://localhost', 'http://localhost:4200', 'http://127.0.0.1:5173']) {
      const r = await guard.authorize({ authorization: `Bearer ${token}`, origin })
      expect(r.ok).toBe(true)
    }
  })

  it('rejects bad tokens of identical length (constant-time)', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const token = await guard.ensureToken()
    const wrong = token.split('').reverse().join('')
    const r = await guard.authorize({ authorization: `Bearer ${wrong}`, origin: null })
    expect(r).toMatchObject({ status: 401, reason: 'bad_token' })
  })

  it('rate-limits resolve calls (default 60/min)', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain(), rateLimitPerMinute: 3 })
    const token = await guard.ensureToken()
    for (let i = 0; i < 3; i++) {
      const r = await guard.authorize({
        authorization: `Bearer ${token}`,
        origin: 'https://lenserfight.com',
        rateLimited: true,
      })
      expect(r.ok).toBe(true)
    }
    const r = await guard.authorize({
      authorization: `Bearer ${token}`,
      origin: 'https://lenserfight.com',
      rateLimited: true,
    })
    expect(r).toMatchObject({ status: 429, reason: 'rate_limited' })
  })

  it('does not rate-limit non-resolve calls', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain(), rateLimitPerMinute: 1 })
    const token = await guard.ensureToken()
    for (let i = 0; i < 10; i++) {
      const r = await guard.authorize({
        authorization: `Bearer ${token}`,
        origin: 'https://lenserfight.com',
      })
      expect(r.ok).toBe(true)
    }
  })

  it('default origin patterns include lenserfight.com and subdomains', () => {
    const patterns = DEFAULT_ALLOWED_ORIGIN_PATTERNS
    expect(patterns.some((p) => p.test('https://lenserfight.com'))).toBe(true)
    expect(patterns.some((p) => p.test('https://app.lenserfight.com'))).toBe(true)
    expect(patterns.some((p) => p.test('https://evil.com'))).toBe(false)
  })

  it('default origin patterns include (https) Tailscale CGNAT (100.64/10)', () => {
    const patterns = DEFAULT_ALLOWED_ORIGIN_PATTERNS
    expect(patterns.some((p) => p.test('https://100.88.58.68:3000'))).toBe(true)
    expect(patterns.some((p) => p.test('https://100.64.0.1'))).toBe(true)
    expect(patterns.some((p) => p.test('https://100.127.255.255:38080'))).toBe(true)
    // Outside the CGNAT range — must be rejected.
    expect(patterns.some((p) => p.test('https://100.63.255.255'))).toBe(false)
    expect(patterns.some((p) => p.test('https://100.128.0.0'))).toBe(false)
    expect(patterns.some((p) => p.test('https://101.0.0.1'))).toBe(false)
  })

  it('default origin patterns include (https) RFC 1918 private networks', () => {
    const patterns = DEFAULT_ALLOWED_ORIGIN_PATTERNS
    expect(patterns.some((p) => p.test('https://10.0.0.1'))).toBe(true)
    expect(patterns.some((p) => p.test('https://10.255.255.255:8080'))).toBe(true)
    expect(patterns.some((p) => p.test('https://172.16.0.1'))).toBe(true)
    expect(patterns.some((p) => p.test('https://172.31.255.255'))).toBe(true)
    expect(patterns.some((p) => p.test('https://192.168.1.1:3000'))).toBe(true)
    // 172.15 and 172.32 are NOT private — must be rejected.
    expect(patterns.some((p) => p.test('https://172.15.0.1'))).toBe(false)
    expect(patterns.some((p) => p.test('https://172.32.0.1'))).toBe(false)
    // 11.x is public — must be rejected.
    expect(patterns.some((p) => p.test('https://11.0.0.1'))).toBe(false)
  })

  it('default origin patterns include (https) .local mDNS hostnames', () => {
    const patterns = DEFAULT_ALLOWED_ORIGIN_PATTERNS
    expect(patterns.some((p) => p.test('https://my-laptop.local'))).toBe(true)
    expect(patterns.some((p) => p.test('https://my-laptop.local:3000'))).toBe(true)
    expect(patterns.some((p) => p.test('https://my.laptop.local'))).toBe(false) // multi-segment not allowed
  })

  it('default origin patterns reject plaintext http on private, CGNAT and .local origins', () => {
    const patterns = DEFAULT_ALLOWED_ORIGIN_PATTERNS
    for (const origin of [
      'http://100.88.58.68:3000',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://192.168.1.10:5173',
      'http://my-laptop.local',
    ]) {
      expect(patterns.some((p) => p.test(origin))).toBe(false)
    }
  })

  it('logs a one-time hint naming LF_GATEWAY_EXTRA_ORIGINS for a rejected private http origin', async () => {
    const writes: string[] = []
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((c) => (writes.push(String(c)), true))
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    guard.isOriginAllowed('http://192.168.1.10:5173')
    guard.isOriginAllowed('http://192.168.1.10:5173')
    spy.mockRestore()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toContain('LF_GATEWAY_EXTRA_ORIGINS')
    expect(writes[0]).toContain('192.168.1.10')
  })

  it('authorize() admits a Tailscale CGNAT origin', async () => {
    const guard = new BearerAuthGuard({ keychainAdapter: memKeychain() })
    const token = await guard.ensureToken()
    const r = await guard.authorize({
      authorization: `Bearer ${token}`,
      origin: 'https://100.88.58.68:3000',
    })
    expect(r).toMatchObject({ ok: true })
  })
})
