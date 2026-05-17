/**
 * Browser-side adapter that implements `LocalKeyStorePort` over the LenserFight
 * Gateway's loopback HTTP API.
 *
 * Uses only `fetch` + `sessionStorage`. No Node imports, no IndexedDB,
 * no localStorage. Key material never appears in the browser cache; the
 * gateway holds the only durable copy.
 *
 * The bearer token lives in `sessionStorage` so it dies with the tab. The
 * user re-pairs by running `lf gateway pair --web` and pasting the token —
 * a tradeoff the threat-model docs spell out.
 */

import { LocalKeyStoreError } from '../ports'

import type {
  AddLocalKeyInput,
  LocalKeyMetadata,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from '../ports'

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
export function deriveGatewayUrl(): string {
  if (typeof window === 'undefined' || !window.location) return DEFAULT_GATEWAY_URL
  try {
    const override = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_GATEWAY_URL_KEY) : null
    if (override) return override
  } catch {
    // sessionStorage can throw in some sandboxed contexts; fall through.
  }
  const host = window.location.hostname
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return DEFAULT_GATEWAY_URL
  }
  // The web page is served from a non-loopback host (LAN IP, Tailscale CGNAT,
  // mDNS .local hostname, …). Assume the gateway is reachable at the same
  // host on its default port. Users with a different topology can override
  // via SESSION_GATEWAY_URL_KEY.
  return `${window.location.protocol}//${host}:${DEFAULT_GATEWAY_PORT}`
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

  constructor(opts: GatewayClientOptions = {}) {
    this.baseUrl = opts.gatewayUrl ?? deriveGatewayUrl()
    this.doFetch = opts.fetchImpl ?? fetch.bind(globalThis)
    this.session = opts.sessionStore ?? defaultSessionStore()
  }

  isPaired(): boolean {
    return Boolean(this.getToken())
  }

  setToken(token: string): void {
    this.session.setItem(SESSION_TOKEN_KEY, token)
  }

  clearToken(): void {
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

  /** Probe the gateway. Returns true if reachable AND paired AND token valid. */
  async healthCheck(): Promise<{ reachable: boolean; paired: boolean }> {
    let reachable = false
    try {
      const res = await this.doFetch(`${this.baseUrl}/healthz`, { method: 'GET', credentials: 'omit' })
      reachable = res.ok
    } catch {
      return { reachable: false, paired: false }
    }
    if (!this.isPaired()) return { reachable, paired: false }
    try {
      const res = await this.request('GET', '/keys')
      return { reachable, paired: res.ok }
    } catch {
      return { reachable, paired: false }
    }
  }

  private getToken(): string | null {
    return this.session.getItem(SESSION_TOKEN_KEY)
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
      this.clearToken()
      throw new LocalKeyStoreError('gateway_not_paired', 'Gateway rejected the token. Re-pair via `lf gateway pair --web`.')
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
