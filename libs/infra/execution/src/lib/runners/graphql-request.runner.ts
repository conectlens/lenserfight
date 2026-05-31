/**
 * GraphqlRequestRunner — outbound GraphQL query/mutation node.
 *
 * GRASP Information Expert: this runner knows how to POST a bounded GraphQL
 * operation to an external endpoint and surface its data/errors payload.
 *
 * Config schema (nodeConfig):
 *   url: string                      — GraphQL endpoint (https only by default)
 *   query: string                    — the GraphQL document
 *   variables?: Record<string,unknown>
 *   operationName?: string
 *   headers?: Record<string,string>
 *   timeoutMs?: number               — per-request timeout (capped)
 *   allowlistedHosts?: string[]      — SSRF host allow-list
 *   allowlistedOrigins?: string[]    — SSRF origin allow-list
 *   httpsOnly?: boolean              — require https (default true)
 *   auth?: { type, connectorRef?, scopes?, headerName?, prefix? }
 *
 * Security:
 * - Endpoint passes through validateCustomHttpUrl (SSRF / private-IP block).
 * - Auth credentials resolved via ctx.resolveConnector; never logged or echoed.
 * - Bounded: timeout cap, response-size cap, query-length cap.
 *
 * Output (output.data): { data, errors, status, ok, url }
 */

import { validateCustomHttpUrl } from '../custom-http-safety'

import type { CustomHttpSafetyConfig } from '../custom-http-safety'
import type { ExecutionResult, WorkflowNodeType } from '../execution.types'
import type { HttpAuthConfig } from './http-request.runner'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 120_000
const MAX_RESPONSE_BYTES = 5_242_880 // 5MB
const MAX_QUERY_LENGTH = 100_000 // 100KB GraphQL document cap
const MAX_HEADERS = 50

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function clampTimeout(value: unknown): number {
  const n = Number(value ?? DEFAULT_TIMEOUT_MS)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS
  return Math.min(n, MAX_TIMEOUT_MS)
}

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
      data: { error, data: null, errors: [{ message: error }], status: null, nodeId, ...detail },
      durationMs: 0,
    },
  }
}

export class GraphqlRequestRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'graphql_request'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const cfg = ctx.nodeConfig
    const url = typeof cfg['url'] === 'string' ? (cfg['url'] as string) : ''
    const query = typeof cfg['query'] === 'string' ? (cfg['query'] as string) : ''

    if (!url) return errorOutput('url_required', { url: null }, ctx.nodeId)
    if (!query) return errorOutput('query_required', { url }, ctx.nodeId)
    if (query.length > MAX_QUERY_LENGTH) {
      return errorOutput('query_too_large', { url, queryLength: query.length }, ctx.nodeId)
    }

    // --- SSRF / allow-list validation (mandatory) ---
    const safetyConfig: CustomHttpSafetyConfig = {
      allowlistedOrigins: arrayOfStrings(cfg['allowlistedOrigins']),
      allowlistedHosts: arrayOfStrings(cfg['allowlistedHosts']),
      httpsOnly: cfg['httpsOnly'] !== false,
    }
    const urlCheck = validateCustomHttpUrl(url, safetyConfig)
    if (!urlCheck.ok) return errorOutput(urlCheck.reason, { url }, ctx.nodeId)

    const target = urlCheck.url
    const headers = buildHeaders(cfg['headers'])
    headers['Content-Type'] = 'application/json'
    if (!Object.keys(headers).some((h) => h.toLowerCase() === 'accept')) {
      headers['Accept'] = 'application/json'
    }

    // --- Resolve auth credential (never logged) ---
    const auth = (cfg['auth'] as HttpAuthConfig | undefined) ?? undefined
    let authScheme: string = auth?.type ?? 'none'
    if (auth && auth.type && auth.type !== 'none') {
      const applied = await this.applyAuth(ctx, auth, headers)
      if (!applied.ok) {
        return errorOutput(applied.reason, { url, authScheme: auth.type }, ctx.nodeId)
      }
      authScheme = auth.type
    }

    const variables = (cfg['variables'] && typeof cfg['variables'] === 'object'
      ? (cfg['variables'] as Record<string, unknown>)
      : {})
    const operationName = typeof cfg['operationName'] === 'string' ? cfg['operationName'] : undefined
    const body = JSON.stringify({ query, variables, ...(operationName ? { operationName } : {}) })

    // --- Bounded request with cooperative + timeout abort ---
    const timeoutMs = clampTimeout(cfg['timeoutMs'])
    const signal = this.combineSignals(ctx.signal, timeoutMs)
    const startedAt = Date.now()

    let response: Response
    try {
      response = await fetch(target.toString(), { method: 'POST', headers, body, signal })
    } catch (err) {
      const aborted = (err as { name?: string } | null)?.name === 'AbortError'
      return errorOutput(aborted ? 'request_aborted' : 'request_failed', {
        url: target.toString(),
        authScheme,
        message: aborted ? 'Request timed out or was cancelled' : 'Network error',
      }, ctx.nodeId)
    }

    const text = await this.readBounded(response)
    const truncated = text.length >= MAX_RESPONSE_BYTES
    const durationMs = Date.now() - startedAt

    let payload: { data?: unknown; errors?: unknown }
    try {
      payload = JSON.parse(text) as { data?: unknown; errors?: unknown }
    } catch {
      return errorOutput('invalid_graphql_response', {
        url: target.toString(),
        status: response.status,
        authScheme,
      }, ctx.nodeId)
    }

    const errors = Array.isArray(payload.errors) ? payload.errors : []
    const output: ExecutionResult = {
      mediaType: 'json',
      text: '',
      data: {
        data: payload.data ?? null,
        errors,
        status: response.status,
        ok: response.ok && errors.length === 0,
        truncated,
        url: target.toString(),
        authScheme,
        nodeId: ctx.nodeId,
      },
      durationMs,
    }
    return { output }
  }

  /**
   * Resolve the credential via the connector resolver and inject it.
   * Fails closed when a credential was required but unavailable.
   */
  private async applyAuth(
    ctx: NodeRunnerContext,
    auth: HttpAuthConfig,
    headers: Record<string, string>,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!auth.connectorRef) return { ok: false, reason: 'auth_connector_ref_required' }
    if (!ctx.resolveConnector) return { ok: false, reason: 'credential_unavailable' }
    const token = await ctx.resolveConnector(auth.connectorRef, auth.scopes)
    if (!token) return { ok: false, reason: 'credential_unavailable' }

    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `${auth.prefix ?? 'Bearer '}${token}`
        return { ok: true }
      case 'basic':
        headers['Authorization'] = `Basic ${toBase64(token)}`
        return { ok: true }
      case 'header':
      case 'api_key': {
        const name = auth.headerName || (auth.type === 'api_key' ? 'X-API-Key' : 'Authorization')
        headers[name] = `${auth.prefix ?? ''}${token}`
        return { ok: true }
      }
      default:
        return { ok: false, reason: 'auth_type_unsupported' }
    }
  }

  private combineSignals(engineSignal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    if (!engineSignal) return timeoutSignal
    return AbortSignal.any([engineSignal, timeoutSignal])
  }

  private async readBounded(response: Response): Promise<string> {
    const full = await response.text()
    return full.length > MAX_RESPONSE_BYTES ? full.slice(0, MAX_RESPONSE_BYTES) : full
  }
}

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}
