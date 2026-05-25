/**
 * Browser-side adapter that implements `LocalKeyStorePort` over the LenserFight
 * Gateway's loopback HTTP API.
 *
 * Uses `fetch` and an IndexedDB-backed `GatewayPairingStore` for durable
 * credential persistence. No Node imports, no key material in browser cache.
 *
 * ## Pairing lifecycle
 *
 * 1. User runs `lf gateway pair --web` and pastes the bootstrap token.
 * 2. `setToken(token)` stores the token in memory (this session) and in
 *    `sessionStorage` (same-tab compat).
 * 3. `persistPairing()` (called separately by the hook) fetches the gateway's
 *    Ed25519 public key fingerprint from `/identity` and persists the token +
 *    fingerprint to IndexedDB with a 30-day rolling TTL.
 * 4. On future page loads / new tabs, `reconnectFromStoredPairing()` attempts
 *    to load the IDB record, verifies the fingerprint still matches, and restores
 *    the in-memory token. No re-paste required.
 * 5. If the gateway is reinstalled, rotates its token, or the TTL elapses, the
 *    stored record is rejected and the user is prompted to re-pair.
 *
 * See GATEWAY_PAIRING.md for the full security model, storage rationale, and
 * the v2 upgrade path to a proper browser-grant exchange protocol.
 */

import { LocalKeyStoreError } from '../ports'

import { GatewayPairingStore } from './pairing-store'

import type {
  AddLocalKeyInput,
  LocalKeyMetadata,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from '../ports'
import type { GatewayPairingRecord, IdbAdapter } from './pairing-store'

export { GatewayPairingStore }
export type { GatewayPairingRecord, IdbAdapter }

export const SESSION_TOKEN_KEY = 'lf-gateway-bearer'
export const SESSION_GATEWAY_URL_KEY = 'lf-gateway-url'
export const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:38080'
export const DEFAULT_GATEWAY_PORT = 38080

/**
 * Pick the gateway URL the browser should talk to.
 *
 * 1. Explicit override in `sessionStorage['lf-gateway-url']` wins — set by a
 *    user who runs the gateway on a non-default port or host.
 * 2. Otherwise derive from `window.location`: when the page is served from
 *    localhost / 127.0.0.1, use loopback; when served from any other host
 *    (Tailscale CGNAT, LAN IP, mDNS hostname, …), use that same hostname at
 *    port 38080. This avoids the "browser at 100.x calls 127.0.0.1" trap
 *    that Chrome's Private Network Access spec blocks.
 * 3. Fall back to the loopback default for SSR / Node test contexts.
 */
/**
 * Validate a user-supplied gateway URL override.
 *
 * Accepted:
 *   - http:// with a loopback hostname (127.0.0.1, localhost, [::1]) — default case
 *   - https:// with any hostname — users who run the gateway behind a reverse proxy
 *
 * Rejected:
 *   - http:// with a non-loopback hostname — token would travel in cleartext over the network
 *   - javascript:, data:, or any other scheme — obvious injection vectors
 *   - Unparseable strings
 *
 * This guards against a script (XSS, extension, same-origin iframe) setting
 * SESSION_GATEWAY_URL_KEY to an attacker-controlled host, which would cause
 * the bearer token to be sent there in the Authorization header.
 */
export function isPermittedGatewayUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:') {
      const h = u.hostname
      return h === '127.0.0.1' || h === 'localhost' || h === '[::1]'
    }
    return false
  } catch {
    return false
  }
}

export function deriveGatewayUrl(): string {
  if (typeof window === 'undefined' || !window.location) return DEFAULT_GATEWAY_URL
  try {
    const override = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_GATEWAY_URL_KEY) : null
    if (override && isPermittedGatewayUrl(override)) return override
  } catch {
    // sessionStorage can throw in some sandboxed contexts; fall through.
  }
  const host = window.location.hostname
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return DEFAULT_GATEWAY_URL
  }
  // The gateway daemon always runs on the local machine. When the web page is
  // served from a non-loopback host (Tailscale CGNAT, LAN IP, mDNS .local),
  // the browser origin differs from loopback, but the gateway is still at
  // 127.0.0.1. Routing the fetch to the same non-loopback host causes Chrome's
  // Private Network Access pre-flight to fire against an address the gateway
  // may not be bound on, resulting in a null-status CORS failure.
  //
  // Use loopback unconditionally. Users who run the gateway on a *remote*
  // machine (rare) must set SESSION_GATEWAY_URL_KEY explicitly via
  // `lf gateway pair --web`, which is handled by the override above.
  return DEFAULT_GATEWAY_URL
}

export interface GatewayClientOptions {
  /** Override the gateway base URL (test seam). */
  gatewayUrl?: string
  /** Override the fetch implementation (test seam). */
  fetchImpl?: typeof fetch
  /** Override session storage (test seam). */
  sessionStore?: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
    removeItem(key: string): void
  }
  /**
   * Override the pairing store (test seam).
   *
   * In production this is constructed automatically. In tests, pass a
   * `GatewayPairingStore` backed by a `FakeIdbAdapter` to exercise pairing
   * behaviour without IndexedDB.
   */
  pairingStore?: GatewayPairingStore
}

function defaultSessionStore() {
  if (typeof sessionStorage === 'undefined') {
    // SSR / Node test contexts.
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) ?? null) : null),
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
      removeItem: (k: string) => {
        mem.delete(k)
      },
    }
  }
  return sessionStorage
}

export class LocalKeysGatewayClient implements LocalKeyStorePort {
  private readonly baseUrl: string
  private readonly doFetch: typeof fetch
  private readonly session: NonNullable<GatewayClientOptions['sessionStore']>
  private readonly pairingStore: GatewayPairingStore

  /**
   * In-memory token cache for the current page session. Set by `setToken()`
   * and `reconnectFromStoredPairing()`. Cleared by `clearToken()` and
   * `forgetGateway()`. Survives React re-renders but dies with the tab (same
   * as sessionStorage), while the IndexedDB-backed `pairingStore` provides
   * cross-tab and cross-session persistence.
   */
  private _memToken: string | null = null

  constructor(opts: GatewayClientOptions = {}) {
    this.baseUrl = opts.gatewayUrl ?? deriveGatewayUrl()
    this.doFetch = opts.fetchImpl ?? fetch.bind(globalThis)
    this.session = opts.sessionStore ?? defaultSessionStore()
    this.pairingStore = opts.pairingStore ?? new GatewayPairingStore()
  }

  isPaired(): boolean {
    return Boolean(this.getToken())
  }

  /**
   * Store the bearer token for the current page session.
   *
   * Synchronous — sets the in-memory token and writes to sessionStorage
   * immediately. Call `persistPairing()` immediately after to save the
   * credential durably to IndexedDB. The hook's `pairGateway` does both.
   *
   * Kept synchronous so existing callers do not require `await` and to avoid
   * observable microtask interleavings in the existing test suite.
   */
  setToken(token: string): void {
    this._memToken = token
    this.session.setItem(SESSION_TOKEN_KEY, token)
  }

  /**
   * Fetch the gateway's Ed25519 public key fingerprint and persist the current
   * token to IndexedDB with TTL and identity binding.
   *
   * Must be called after `setToken()`. Fire-and-forget is acceptable (`void
   * client.persistPairing()`) — the in-memory token is already active for this
   * session before this resolves. IDB write failures are non-fatal.
   */
  async persistPairing(): Promise<void> {
    const token = this.getToken()
    if (!token) return
    const fingerprint = await this.fetchGatewayFingerprint()
    await this.pairingStore.save(token, fingerprint)
  }

  /**
   * Attempt to restore the pairing from the durable IndexedDB store without
   * requiring the user to paste the token again.
   *
   * Requires the gateway to be reachable (to verify the identity fingerprint).
   * If the gateway is offline, returns `'not_found'` — the caller should then
   * run `healthCheck()` which will surface `gateway_unreachable`.
   *
   * @returns
   *   - `'loaded'`    — token restored; gateway is ready to use.
   *   - `'not_found'` — no stored pairing (first-time user or after forget).
   *   - `'expired'`   — stored pairing exceeded its TTL or the gateway identity
   *                     has changed (fingerprint mismatch). Re-pairing required.
   */
  async reconnectFromStoredPairing(): Promise<'loaded' | 'not_found' | 'expired'> {
    // Already connected this session — no IDB round-trip needed.
    if (this._memToken) return 'loaded'

    const fingerprint = await this.fetchGatewayFingerprint()
    // Cannot verify the stored fingerprint if the gateway is unreachable.
    if (fingerprint === 'unknown') return 'not_found'

    const result = await this.pairingStore.load(fingerprint)
    switch (result.status) {
      case 'ok':
        this._memToken = result.record.token
        this.session.setItem(SESSION_TOKEN_KEY, result.record.token)
        return 'loaded'
      case 'expired':
      case 'mismatch':
        // Both map to 'expired' from the caller's perspective:
        // "you had a valid pairing once, but it is no longer usable — re-pair".
        return 'expired'
      case 'not_found':
        return 'not_found'
    }
  }

  /**
   * Clear the stored pairing entirely — both the in-memory token and the
   * IndexedDB record. Called when the user clicks "Forget this gateway".
   */
  async forgetGateway(): Promise<void> {
    this._memToken = null
    this.session.removeItem(SESSION_TOKEN_KEY)
    await this.pairingStore.forget()
  }

  /**
   * Return the raw pairing record from IndexedDB without TTL/fingerprint
   * validation. Useful for displaying pairing metadata (paired date, expiry).
   */
  async getPairingRecord(): Promise<GatewayPairingRecord | null> {
    return this.pairingStore.peek()
  }

  /**
   * Clear the session-scoped token without touching IndexedDB.
   * Use `forgetGateway()` for a full, durable "forget" operation.
   */
  clearToken(): void {
    this._memToken = null
    this.session.removeItem(SESSION_TOKEN_KEY)
  }

  async list(): Promise<LocalKeyMetadata[]> {
    const res = await this.request('GET', '/keys')
    const body = await this.parseBody(res, 'list')
    return body['keys'] as LocalKeyMetadata[]
  }

  async add(input: AddLocalKeyInput): Promise<LocalKeyMetadata> {
    const res = await this.request('POST', '/keys', {
      provider: input.provider,
      label: input.label,
      rawKey: input.rawKey,
    })
    const body = await this.parseBody(res, 'add')
    return body['key'] as LocalKeyMetadata
  }

  async update(input: UpdateLocalKeyInput): Promise<LocalKeyMetadata> {
    const res = await this.request('PUT', `/keys/${encodeURIComponent(input.id)}`, {
      label: input.label,
      rawKey: input.rawKey,
    })
    const body = await this.parseBody(res, 'update')
    return body['key'] as LocalKeyMetadata
  }

  async remove(id: string): Promise<void> {
    const res = await this.request('DELETE', `/keys/${encodeURIComponent(id)}`)
    await this.parseBody(res, 'remove')
  }

  async resolve(id: string): Promise<string> {
    const res = await this.request('POST', `/keys/${encodeURIComponent(id)}/resolve`)
    const body = await this.parseBody(res, 'resolve')
    const value = body['key'] as string
    // Defense: drop the local body reference immediately. Callers are
    // responsible for not retaining the returned string beyond one use.
    return value
  }

  /**
   * Probe the gateway. If no token is in memory, attempts to restore the
   * pairing from IndexedDB before reporting `paired: false`.
   *
   * Returns `{ reachable: true, paired: true }` only when the gateway is
   * reachable AND a valid token can be obtained.
   */
  async healthCheck(): Promise<{ reachable: boolean; paired: boolean }> {
    let reachable = false
    try {
      const res = await this.doFetch(`${this.baseUrl}/healthz`, { method: 'GET', credentials: 'omit' })
      reachable = res.ok
    } catch {
      return { reachable: false, paired: false }
    }
    if (!this.isPaired()) {
      // Attempt to restore the stored pairing. The gateway is reachable
      // (healthz succeeded), so fingerprint verification is possible.
      const reconnect = await this.reconnectFromStoredPairing()
      if (reconnect !== 'loaded') return { reachable, paired: false }
    }
    try {
      const res = await this.request('GET', '/keys')
      return { reachable, paired: res.ok }
    } catch {
      return { reachable, paired: false }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getToken(): string | null {
    // In-memory cache takes precedence (avoids sessionStorage reads on every
    // request during a session). Falls back to sessionStorage for compat with
    // callers that set the token via `session.setItem(SESSION_TOKEN_KEY, …)`
    // directly (e.g. existing tests).
    return this._memToken ?? this.session.getItem(SESSION_TOKEN_KEY)
  }

  /**
   * Fetch the gateway's Ed25519 public key from `GET /identity` and return
   * its SHA-256 hex fingerprint.
   *
   * Returns `'unknown'` on any error (network failure, malformed response,
   * WebCrypto unavailable). A stored record with fingerprint `'unknown'` will
   * always fail the mismatch check once the gateway IS reachable — this is
   * correct: we cannot trust an identity-unverified pairing.
   */
  private async fetchGatewayFingerprint(): Promise<string> {
    try {
      const res = await this.doFetch(`${this.baseUrl}/identity`, {
        method: 'GET',
        credentials: 'omit',
      })
      if (!res.ok) return 'unknown'
      const body = (await res.json()) as Record<string, unknown>
      const publicKey = body['public_key']
      if (typeof publicKey !== 'string' || publicKey.length === 0) return 'unknown'
      const bytes = new TextEncoder().encode(publicKey)
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      return 'unknown'
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const token = this.getToken()
    if (!token) {
      throw new LocalKeyStoreError('gateway_not_paired', 'Gateway not paired. Run `lf gateway pair --web`.')
    }
    const headers: Record<string, string> = {
      'authorization': `Bearer ${token}`,
      'accept': 'application/json',
    }
    if (body !== undefined) headers['content-type'] = 'application/json'
    try {
      return await this.doFetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
      })
    } catch (err) {
      throw new LocalKeyStoreError(
        'gateway_unreachable',
        `Gateway is not running at ${this.baseUrl}: ${(err as Error).message}`
      )
    }
  }

  private async parseBody(
    res: Response,
    op: 'list' | 'add' | 'update' | 'remove' | 'resolve'
  ): Promise<Record<string, unknown>> {
    if (res.status === 401) {
      // Determine whether there was a previously-stored pairing that was just
      // rejected. If so, surface `pairing_revoked` to the hook so the UI can
      // show a contextual "pairing revoked" message rather than the generic
      // "not paired" message shown to first-time users.
      const hadStoredPairing = (await this.pairingStore.peek()) !== null
      this._memToken = null
      this.session.removeItem(SESSION_TOKEN_KEY)
      await this.pairingStore.revoke()
      throw new LocalKeyStoreError(
        hadStoredPairing ? 'pairing_revoked' : 'gateway_not_paired',
        'Gateway rejected the token. Re-pair via `lf gateway pair --web`.'
      )
    }
    if (res.status === 403) {
      throw new LocalKeyStoreError('gateway_forbidden', 'Gateway refused the request (origin or scope).')
    }
    if (res.status === 429) {
      throw new LocalKeyStoreError('gateway_rate_limited', 'Too many requests. Slow down and retry.')
    }
    if (res.status === 404 && (op === 'update' || op === 'remove' || op === 'resolve')) {
      throw new LocalKeyStoreError('key_not_found', 'Key not found on gateway.')
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LocalKeyStoreError('io_error', `Gateway ${op} failed (${res.status}): ${text}`)
    }
    if (res.status === 204) return {}
    const text = await res.text()
    if (text.length === 0) return {}
    try {
      return JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new LocalKeyStoreError('io_error', `Gateway returned non-JSON body for ${op}`)
    }
  }
}
