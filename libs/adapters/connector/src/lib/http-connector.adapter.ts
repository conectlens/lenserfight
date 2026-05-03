import { isConnectorScope, type ConnectorScope } from './scopes'

import type { ConnectorAdapterV1 } from './connector-adapter'
import type {
  ConnectorMetadata,
  DispatchEvent,
  DispatchResult,
  VerifyResult,
} from './connector.types'

export interface HttpConnectorAdapterOptions {
  metadata: ConnectorMetadata
  /** Endpoint that receives dispatched events. */
  endpoint: string
  /** Service token granted to this adapter when calling the LenserFight API. */
  serviceToken: string
  /** Override fetch for tests / non-Node runtimes. */
  fetchImpl?: typeof fetch
  /** Request timeout in ms. Default 10_000. */
  timeoutMs?: number
}

/**
 * Built-in `kind: 'api'` adapter. Posts a JSON event to a configured endpoint
 * and surfaces transport failures as `ok: false` rather than throwing.
 *
 * Webhook variants register their own adapter; this class is intentionally
 * narrow — see GRASP "Single Responsibility" notes in RFC-0001.
 */
export class HttpConnectorAdapter implements ConnectorAdapterV1 {
  private readonly opts: Required<Pick<HttpConnectorAdapterOptions, 'timeoutMs'>> &
    HttpConnectorAdapterOptions

  constructor(opts: HttpConnectorAdapterOptions) {
    this.opts = { timeoutMs: 10_000, ...opts }
  }

  id(): string {
    return this.opts.metadata.slug
  }

  metadata(): ConnectorMetadata {
    return this.opts.metadata
  }

  async verify(token: string): Promise<VerifyResult> {
    if (!token) return { ok: false, scopes: [], reason: 'token_missing' }
    if (token !== this.opts.serviceToken) {
      return { ok: false, scopes: [], reason: 'token_revoked' }
    }
    const scopes = this.opts.metadata.scopes.filter(isConnectorScope) as ConnectorScope[]
    return { ok: true, scopes }
  }

  async dispatch(event: DispatchEvent): Promise<DispatchResult> {
    const fetchImpl = this.opts.fetchImpl ?? fetch
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs)
    const startedAt = Date.now()
    try {
      const res = await fetchImpl(this.opts.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.opts.serviceToken}`,
          'x-lenserfight-event': event.type,
        },
        body: JSON.stringify(event.payload),
      })
      const latencyMs = Date.now() - startedAt
      if (!res.ok) {
        return { ok: false, latencyMs, status: res.status, error: `http_${res.status}` }
      }
      return { ok: true, latencyMs, status: res.status }
    } catch (err) {
      const latencyMs = Date.now() - startedAt
      const error = err instanceof Error ? err.message : 'dispatch_failed'
      return { ok: false, latencyMs, error }
    } finally {
      clearTimeout(timer)
    }
  }
}
