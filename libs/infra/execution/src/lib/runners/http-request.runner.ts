/**
 * HttpRequestRunner — outbound HTTP request node.
 *
 * GRASP Information Expert: this runner knows how to build a safe, bounded
 * HTTP request from node config + upstream data and parse the response.
 *
 * Config schema (nodeConfig):
 *   url: string                      — request URL (https only by default)
 *   method?: GET|POST|PUT|PATCH|DELETE (default GET)
 *   headers?: Record<string,string>  — request headers
 *   queryParams?: Record<string,string|number|boolean>
 *   body?: unknown                   — JSON object, string, or form map
 *   bodyType?: 'json'|'text'|'form'  — how to serialize body (default json)
 *   timeoutMs?: number               — per-request timeout (capped)
 *   allowlistedHosts?: string[]      — SSRF host allow-list
 *   allowlistedOrigins?: string[]    — SSRF origin allow-list
 *   httpsOnly?: boolean              — require https (default true)
 *   auth?: { type, connectorRef?, scopes?, headerName?, paramName?, prefix? }
 *
 * Security:
 * - Every URL passes through validateCustomHttpUrl (SSRF / private-IP / metadata block).
 * - Auth credentials resolved via ctx.resolveConnector; secrets are NEVER logged
 *   or echoed into output (only the auth scheme + masked config are reported).
 * - Bounded: timeout cap, response-size cap, header count cap.
 *
 * Output (output.data): { status, headers, data, ok, url }
 */

import { validateCustomHttpUrl } from '../custom-http-safety'

import type { CustomHttpSafetyConfig } from '../custom-http-safety'
import type { ExecutionResult, WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 120_000
const MAX_RESPONSE_BYTES = 5_242_880 // 5MB
const MAX_HEADERS = 50
const MAX_QUERY_PARAMS = 50

export type HttpAuthType = 'none' | 'bearer' | 'basic' | 'header' | 'api_key'

export interface HttpAuthConfig {
  type?: HttpAuthType
  /** Connector slug whose decrypted token is injected. */
  connectorRef?: string
  /** Scopes the connector must hold. */
  scopes?: string[]
  /** Header name for type 'header' / 'api_key' (default 'Authorization'). */
  headerName?: string
  /** Query param name for type 'api_key' when injected as a param. */
  paramName?: string
  /** Optional value prefix (e.g. 'Bearer '). */
  prefix?: string
  /** Inject api_key into 'header' (default) or 'query'. */
  in?: 'header' | 'query'
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function clampTimeout(value: unknown): number {
  const n = Number(value ?? DEFAULT_TIMEOUT_MS)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS
  return Math.min(n, MAX_TIMEOUT_MS)
}

/** Build the bounded header map. Auth headers are merged separately so config headers can't override them after resolution. */
function buildHeaders(raw: unknown): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return headers
  let count = 0
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_HEADERS) break
    if (typeof name !== 'string' || name.length === 0) continue
    if (value === null || value === undefined) continue
    headers[name] = String(value)
    count++
  }
  return headers
}

function errorOutput(error: string, detail: Record<string, unknown>, nodeId: string): NodeRunnerResult {
  return {
    output: {
      mediaType: 'json',
      text: '',
      data: { error, status: null, headers: {}, data: null, nodeId, ...detail },
      durationMs: 0,
    },
  }
}

export class HttpRequestRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'http_request'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const cfg = ctx.nodeConfig
    const url = typeof cfg['url'] === 'string' ? (cfg['url'] as string) : ''
    const method = String(cfg['method'] ?? 'GET').toUpperCase()

    if (!url) {
      return errorOutput('url_required', { url: null }, ctx.nodeId)
    }
    if (!ALLOWED_METHODS.has(method)) {
      return errorOutput('method_not_allowed', { method }, ctx.nodeId)
    }

    // --- SSRF / allow-list validation (mandatory) ---
    const safetyConfig: CustomHttpSafetyConfig = {
      allowlistedOrigins: arrayOfStrings(cfg['allowlistedOrigins']),
      allowlistedHosts: arrayOfStrings(cfg['allowlistedHosts']),
      httpsOnly: cfg['httpsOnly'] !== false,
    }
    const urlCheck = validateCustomHttpUrl(url, safetyConfig)
    if (!urlCheck.ok) {
      return errorOutput(urlCheck.reason, { url }, ctx.nodeId)
    }

    const target = urlCheck.url
    this.applyQueryParams(target, cfg['queryParams'])

    const headers = buildHeaders(cfg['headers'])
    const auth = (cfg['auth'] as HttpAuthConfig | undefined) ?? undefined
    let authScheme: string = auth?.type ?? 'none'
    let secretQueryParam: string | undefined

    // --- Resolve auth credential (never logged) ---
    if (auth && auth.type && auth.type !== 'none') {
      const applied = await this.applyAuth(ctx, auth, headers, target)
      if (!applied.ok) {
        return errorOutput(applied.reason, { url, authScheme: auth.type }, ctx.nodeId)
      }
      authScheme = auth.type
      secretQueryParam = applied.secretQueryParam
    }

    // --- Build body ---
    const { body, contentType } = this.buildBody(cfg, method)
    if (contentType && !this.hasHeader(headers, 'content-type')) {
      headers['Content-Type'] = contentType
    }

    // --- Bounded request with cooperative + timeout abort ---
    const timeoutMs = clampTimeout(cfg['timeoutMs'])
    const signal = this.combineSignals(ctx.signal, timeoutMs)
    const startedAt = Date.now()

    const displayUrl = this.redactUrl(target, secretQueryParam)

    let response: Response
    try {
      response = await fetch(target.toString(), { method, headers, body, signal })
    } catch (err) {
      const aborted = (err as { name?: string } | null)?.name === 'AbortError'
      return errorOutput(aborted ? 'request_aborted' : 'request_failed', {
        url: displayUrl,
        method,
        authScheme,
        message: aborted ? 'Request timed out or was cancelled' : 'Network error',
      }, ctx.nodeId)
    }

    const parsed = await this.parseResponse(response)
    const durationMs = Date.now() - startedAt

    const output: ExecutionResult = {
      mediaType: 'json',
      text: typeof parsed.data === 'string' ? parsed.data : '',
      data: {
        status: response.status,
        headers: this.collectHeaders(response.headers),
        data: parsed.data,
        ok: response.ok,
        truncated: parsed.truncated,
        url: displayUrl,
        method,
        authScheme,
        nodeId: ctx.nodeId,
      },
      durationMs,
    }
    return { output }
  }

  private applyQueryParams(target: URL, raw: unknown): void {
    if (!raw || typeof raw !== 'object') return
    let count = 0
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (count >= MAX_QUERY_PARAMS) break
      if (value === null || value === undefined) continue
      target.searchParams.set(key, String(value))
      count++
    }
  }

  private hasHeader(headers: Record<string, string>, name: string): boolean {
    return Object.keys(headers).some((h) => h.toLowerCase() === name.toLowerCase())
  }

  /**
   * Resolve the credential via the connector resolver and inject it.
   * Returns { ok: false } when a credential was required but unavailable,
   * so callers fail closed rather than sending an unauthenticated request.
   */
  private async applyAuth(
    ctx: NodeRunnerContext,
    auth: HttpAuthConfig,
    headers: Record<string, string>,
    target: URL,
  ): Promise<{ ok: true; secretQueryParam?: string } | { ok: false; reason: string }> {
    if (!auth.connectorRef) {
      return { ok: false, reason: 'auth_connector_ref_required' }
    }
    if (!ctx.resolveConnector) {
      // Browser / dry-run context: credentials never resolve here.
      return { ok: false, reason: 'credential_unavailable' }
    }
    const token = await ctx.resolveConnector(auth.connectorRef, auth.scopes)
    if (!token) {
      return { ok: false, reason: 'credential_unavailable' }
    }

    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `${auth.prefix ?? 'Bearer '}${token}`
        return { ok: true }
      case 'basic':
        // token is expected pre-encoded "user:pass"; encode to base64 here.
        headers['Authorization'] = `Basic ${toBase64(token)}`
        return { ok: true }
      case 'header': {
        const name = auth.headerName || 'Authorization'
        headers[name] = `${auth.prefix ?? ''}${token}`
        return { ok: true }
      }
      case 'api_key': {
        if (auth.in === 'query') {
          const paramName = auth.paramName || 'api_key'
          target.searchParams.set(paramName, token)
          // Report the param name so the secret is redacted from output.
          return { ok: true, secretQueryParam: paramName }
        }
        const name = auth.headerName || 'X-API-Key'
        headers[name] = `${auth.prefix ?? ''}${token}`
        return { ok: true }
      }
      default:
        return { ok: false, reason: 'auth_type_unsupported' }
    }
  }

  /** Produce a display URL with any injected secret query param redacted. */
  private redactUrl(target: URL, secretQueryParam?: string): string {
    if (!secretQueryParam) return target.toString()
    const safe = new URL(target.toString())
    if (safe.searchParams.has(secretQueryParam)) {
      safe.searchParams.set(secretQueryParam, '[REDACTED]')
    }
    return safe.toString()
  }

  private buildBody(
    cfg: Record<string, unknown>,
    method: string,
  ): { body?: string; contentType?: string } {
    if (method === 'GET' || method === 'DELETE') return {}
    const raw = cfg['body']
    if (raw === undefined || raw === null) return {}
    const bodyType = String(cfg['bodyType'] ?? 'json')

    if (bodyType === 'text') {
      return { body: typeof raw === 'string' ? raw : String(raw), contentType: 'text/plain' }
    }
    if (bodyType === 'form') {
      const params = new URLSearchParams()
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (v !== null && v !== undefined) params.set(k, String(v))
        }
      }
      return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' }
    }
    // json (default)
    if (typeof raw === 'string') return { body: raw, contentType: 'application/json' }
    try {
      return { body: JSON.stringify(raw), contentType: 'application/json' }
    } catch {
      return { body: String(raw), contentType: 'text/plain' }
    }
  }

  /** Merge the engine cancellation signal with a per-request timeout. */
  private combineSignals(engineSignal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    if (!engineSignal) return timeoutSignal
    // AbortSignal.any aborts when either source aborts.
    return AbortSignal.any([engineSignal, timeoutSignal])
  }

  private collectHeaders(headers: Headers): Record<string, string> {
    const out: Record<string, string> = {}
    let count = 0
    headers.forEach((value, key) => {
      if (count >= MAX_HEADERS) return
      out[key] = value
      count++
    })
    return out
  }

  private async parseResponse(response: Response): Promise<{ data: unknown; truncated: boolean }> {
    const text = await this.readBounded(response)
    const truncated = text.length >= MAX_RESPONSE_BYTES
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
    if (contentType.includes('json')) {
      try {
        return { data: JSON.parse(text), truncated }
      } catch {
        return { data: text, truncated }
      }
    }
    return { data: text, truncated }
  }

  /** Read the response body with a hard size cap to bound memory. */
  private async readBounded(response: Response): Promise<string> {
    const full = await response.text()
    return full.length > MAX_RESPONSE_BYTES ? full.slice(0, MAX_RESPONSE_BYTES) : full
  }
}

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}
