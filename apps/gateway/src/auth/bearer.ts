/**
 * Bearer-token authentication + origin allow-list for the gateway's
 * key-management endpoints. Sits between the HTTP boundary and
 * `LocalKeyStore`.
 *
 * Why bearer + origin (and not just loopback): any process on the same
 * machine can reach 127.0.0.1, and any open browser tab on any origin can
 * issue cross-origin `fetch`. The bearer token gates "is this caller
 * authorized," the origin allow-list gates "is this caller a browser we
 * told the user about."
 */

import { randomBytes } from 'node:crypto'
import { keychain } from '@lenserfight/utils/keychain'
import { safeEqual } from '@lenserfight/data/local-keys'

export const BEARER_KEYCHAIN_SERVICE = 'lenserfight-gateway-bearer'
export const BEARER_KEYCHAIN_ACCOUNT = 'web-pair'

/**
 * Origin allow-list for the gateway HTTP surface.
 *
 * The browser at one of these origins is permitted to call /keys/* and the
 * other gateway endpoints (a 403 is returned otherwise). The list covers
 * three deployment realities:
 *
 *  - Production: `lenserfight.com` and any first-party subdomain.
 *  - Local dev:  `localhost` and `127.0.0.1` on any port.
 *  - Self-host / Tailscale / LAN: Tailscale CGNAT (100.64.0.0/10), RFC 1918
 *    private network ranges (10/8, 172.16/12, 192.168/16), and `.local`
 *    mDNS hostnames. Origins reach the gateway over an internal interface
 *    by definition; there is no scenario where these resolve over the
 *    public internet without an attacker controlling the user's network.
 *
 * Self-hosters with a non-standard domain can extend this via
 * `LF_GATEWAY_EXTRA_ORIGINS` (comma-separated regex strings) — see
 * `loadAllowedOriginPatterns()` below.
 */
export const DEFAULT_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/lenserfight\.com$/,
  /^https:\/\/[a-z0-9-]+\.lenserfight\.com$/,
  /^https?:\/\/localhost(?::\d{1,5})?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d{1,5})?$/,
  /^https?:\/\/\[::1\](?::\d{1,5})?$/,
  // Tailscale CGNAT: 100.64.0.0 – 100.127.255.255 (RFC 6598).
  /^https?:\/\/100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}(?::\d{1,5})?$/,
  // RFC 1918 — 10.0.0.0/8.
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?$/,
  // RFC 1918 — 172.16.0.0/12 (i.e. 172.16 – 172.31).
  /^https?:\/\/172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(?::\d{1,5})?$/,
  // RFC 1918 — 192.168.0.0/16.
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d{1,5})?$/,
  // mDNS hostnames (e.g. `my-laptop.local`).
  /^https?:\/\/[a-z0-9-]+\.local(?::\d{1,5})?$/,
]

/** Parse `LF_GATEWAY_EXTRA_ORIGINS` (comma-separated regex bodies). */
export function loadAllowedOriginPatterns(env: NodeJS.ProcessEnv = process.env): RegExp[] {
  const extra = env['LF_GATEWAY_EXTRA_ORIGINS']
  if (!extra) return DEFAULT_ALLOWED_ORIGIN_PATTERNS
  const more: RegExp[] = []
  for (const raw of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      more.push(new RegExp(raw))
    } catch {
      process.stderr.write(`[bearer] ignoring invalid pattern in LF_GATEWAY_EXTRA_ORIGINS: ${raw}\n`)
    }
  }
  return [...DEFAULT_ALLOWED_ORIGIN_PATTERNS, ...more]
}

export interface BearerAuthOptions {
  allowedOriginPatterns?: RegExp[]
  keychainAdapter?: {
    getSecret(ref: { service: string; account: string }): Promise<string | null>
    setSecret(ref: { service: string; account: string; secret: string }): Promise<void>
    deleteSecret(ref: { service: string; account: string }): Promise<boolean>
  }
  /** Rate-limit budget per token (default 60/min). */
  rateLimitPerMinute?: number
}

export interface AuthorizeResult {
  ok: boolean
  status: number
  reason: 'authorized' | 'missing_token' | 'bad_token' | 'forbidden_origin' | 'rate_limited'
}

export interface OriginCheckResult {
  ok: boolean
  origin: string | null
}

/** Generate a 32-byte URL-safe token. */
export function generateBearerToken(): string {
  return randomBytes(32).toString('base64url')
}

export class BearerAuthGuard {
  private cachedToken: string | null = null
  private readonly origins: RegExp[]
  private readonly keychainAdapter: NonNullable<BearerAuthOptions['keychainAdapter']>
  private readonly rateLimitPerMinute: number
  private readonly hits = new Map<string, { windowStart: number; count: number }>()

  constructor(opts: BearerAuthOptions = {}) {
    this.origins = opts.allowedOriginPatterns ?? loadAllowedOriginPatterns()
    this.keychainAdapter = opts.keychainAdapter ?? {
      getSecret: (ref) => keychain.getSecret(ref),
      setSecret: (ref) => keychain.setSecret(ref),
      deleteSecret: (ref) => keychain.deleteSecret(ref),
    }
    this.rateLimitPerMinute = opts.rateLimitPerMinute ?? 60
  }

  /** Returns the active bearer token, generating one if none exists. */
  async ensureToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken
    const existing = await this.keychainAdapter.getSecret({
      service: BEARER_KEYCHAIN_SERVICE,
      account: BEARER_KEYCHAIN_ACCOUNT,
    })
    if (existing) {
      this.cachedToken = existing
      return existing
    }
    const fresh = generateBearerToken()
    await this.keychainAdapter.setSecret({
      service: BEARER_KEYCHAIN_SERVICE,
      account: BEARER_KEYCHAIN_ACCOUNT,
      secret: fresh,
    })
    this.cachedToken = fresh
    return fresh
  }

  /** Rotate the bearer token; old token immediately stops authorizing. */
  async rotate(): Promise<string> {
    const fresh = generateBearerToken()
    await this.keychainAdapter.setSecret({
      service: BEARER_KEYCHAIN_SERVICE,
      account: BEARER_KEYCHAIN_ACCOUNT,
      secret: fresh,
    })
    this.cachedToken = fresh
    this.hits.clear()
    return fresh
  }

  isOriginAllowed(origin: string | null): OriginCheckResult {
    if (origin == null || origin === '') return { ok: true, origin: null } // same-origin or non-browser caller
    if (this.origins.some((re) => re.test(origin))) return { ok: true, origin }
    return { ok: false, origin }
  }

  async authorize(req: {
    authorization: string | null
    origin: string | null
    /** Pass true for rate-limited endpoints (e.g. `/keys/:id/resolve`). */
    rateLimited?: boolean
  }): Promise<AuthorizeResult> {
    const originCheck = this.isOriginAllowed(req.origin)
    if (!originCheck.ok) {
      return { ok: false, status: 403, reason: 'forbidden_origin' }
    }
    if (!req.authorization) {
      return { ok: false, status: 401, reason: 'missing_token' }
    }
    const presented = req.authorization.replace(/^Bearer\s+/i, '').trim()
    const stored = await this.ensureToken()
    if (!safeEqual(presented, stored)) {
      return { ok: false, status: 401, reason: 'bad_token' }
    }
    if (req.rateLimited && !this.checkRate(presented)) {
      return { ok: false, status: 429, reason: 'rate_limited' }
    }
    return { ok: true, status: 200, reason: 'authorized' }
  }

  private checkRate(token: string): boolean {
    const now = Date.now()
    const bucket = this.hits.get(token)
    if (!bucket || now - bucket.windowStart > 60_000) {
      this.hits.set(token, { windowStart: now, count: 1 })
      return true
    }
    bucket.count += 1
    return bucket.count <= this.rateLimitPerMinute
  }

  /** Test-only seam. */
  __reset(): void {
    this.cachedToken = null
    this.hits.clear()
  }
}
