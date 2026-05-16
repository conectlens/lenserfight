/**
 * HTTP handlers for the gateway's `/keys` surface. The Controller in the
 * GRASP layering — translates HTTP into `LocalKeyStorePort` calls and
 * `LocalKeyStoreError` codes back into HTTP statuses.
 *
 * Routes
 *   GET    /keys                 → list metadata
 *   POST   /keys                 → add { provider, label, rawKey }
 *   PUT    /keys/:id             → update { label?, rawKey? }
 *   DELETE /keys/:id             → remove
 *   POST   /keys/:id/resolve     → return decrypted plaintext (rate-limited)
 *
 * Every request audits via `appendAuditEvent`; failures route to the same
 * audit log. Bearer + origin enforcement is in `auth/bearer.ts`.
 */

import { appendAuditEvent, LocalKeyStoreError } from '@lenserfight/data/local-keys'

import type {
  AddLocalKeyInput,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from '@lenserfight/data/local-keys'
import type http from 'node:http'

import type { BearerAuthGuard } from '../auth/bearer'

const MAX_BODY_BYTES = 64 * 1024 // 64 KiB — keys are small; reject obvious abuse.

export interface KeysHandlerDeps {
  store: LocalKeyStorePort
  auth: BearerAuthGuard
}

interface ParsedRoute {
  op: 'list' | 'add' | 'update' | 'remove' | 'resolve'
  id?: string
}

function parseRoute(method: string, url: string): ParsedRoute | null {
  if (method === 'GET' && url === '/keys') return { op: 'list' }
  if (method === 'POST' && url === '/keys') return { op: 'add' }
  const updateMatch = url.match(/^\/keys\/([A-Za-z0-9_-]{20,40})$/)
  if (updateMatch && method === 'PUT') return { op: 'update', id: updateMatch[1] }
  if (updateMatch && method === 'DELETE') return { op: 'remove', id: updateMatch[1] }
  const resolveMatch = url.match(/^\/keys\/([A-Za-z0-9_-]{20,40})\/resolve$/)
  if (resolveMatch && method === 'POST') return { op: 'resolve', id: resolveMatch[1] }
  return null
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const declared = Number(req.headers['content-length'] ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new Promise((_, reject) => {
      // Drain to keep the connection healthy; reject so the controller emits 413.
      req.resume()
      req.on('end', () => reject(new Error('body_too_large')))
      req.on('error', () => reject(new Error('body_too_large')))
    })
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let exceeded = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) exceeded = true
      else chunks.push(chunk)
    })
    req.on('end', () => {
      if (exceeded) return reject(new Error('body_too_large'))
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (raw.length === 0) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('invalid_json'))
      }
    })
    req.on('error', (err) => reject(err))
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseAddInput(body: unknown): AddLocalKeyInput {
  if (!isPlainObject(body)) throw new Error('invalid_body')
  const provider = body['provider']
  const label = body['label']
  const rawKey = body['rawKey']
  if (typeof provider !== 'string' || typeof label !== 'string' || typeof rawKey !== 'string') {
    throw new Error('invalid_body')
  }
  // Strict: reject extra fields so we can evolve the contract safely.
  const allowed = new Set(['provider', 'label', 'rawKey'])
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new Error('invalid_body')
  }
  return { provider, label, rawKey }
}

function parseUpdateInput(id: string, body: unknown): UpdateLocalKeyInput {
  if (!isPlainObject(body)) throw new Error('invalid_body')
  const allowed = new Set(['label', 'rawKey'])
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new Error('invalid_body')
  }
  const label = body['label']
  const rawKey = body['rawKey']
  if (label !== undefined && typeof label !== 'string') throw new Error('invalid_body')
  if (rawKey !== undefined && typeof rawKey !== 'string') throw new Error('invalid_body')
  return {
    id,
    label: typeof label === 'string' ? label : undefined,
    rawKey: typeof rawKey === 'string' ? rawKey : undefined,
  }
}

function errorStatus(code: string): number {
  switch (code) {
    case 'invalid_key_id':
    case 'invalid_provider':
      return 400
    case 'key_not_found':
      return 404
    case 'duplicate_key':
      return 409
    case 'passphrase_missing':
      return 503
    case 'decryption_failed':
    case 'corrupt_envelope':
      return 422
    case 'permission_error':
    case 'symlink_refused':
      return 500
    default:
      return 500
  }
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  res.end(payload)
}

function applyCors(res: http.ServerResponse, origin: string | null, allowed: boolean): void {
  // The browser receives Access-Control-Allow-* only for allowed origins.
  // For disallowed origins we omit the headers entirely (which is what
  // makes the browser block the response).
  if (allowed && origin) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('access-control-allow-credentials', 'false')
    res.setHeader('access-control-allow-headers', 'authorization, content-type')
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('access-control-max-age', '60')
    res.setHeader('vary', 'origin')
  }
}

/** Returns true iff this handler took ownership of the request. */
export async function handleKeysRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  deps: KeysHandlerDeps
): Promise<boolean> {
  const url = (req.url ?? '').split('?')[0]
  if (!url.startsWith('/keys')) return false

  const origin = (req.headers['origin'] as string | undefined) ?? null
  const originCheck = deps.auth.isOriginAllowed(origin)

  if (req.method === 'OPTIONS') {
    applyCors(res, origin, originCheck.ok)
    res.statusCode = originCheck.ok ? 204 : 403
    res.end()
    return true
  }

  applyCors(res, origin, originCheck.ok)

  const route = parseRoute(req.method ?? '', url)
  if (!route) {
    send(res, 404, { error: 'not_found' })
    return true
  }

  const auth = await deps.auth.authorize({
    authorization: (req.headers['authorization'] as string | undefined) ?? null,
    origin,
    rateLimited: route.op === 'resolve',
  })
  if (!auth.ok) {
    await appendAuditEvent({
      kind: auth.reason === 'rate_limited' ? 'rate_limited' : 'auth_failure',
      ok: false,
      reason: auth.reason,
      keyId: route.id,
      context: { route: `${req.method} ${url}` },
    })
    send(res, auth.status, { error: auth.reason })
    return true
  }

  try {
    switch (route.op) {
      case 'list': {
        const items = await deps.store.list()
        send(res, 200, { keys: items })
        return true
      }
      case 'add': {
        const body = await readBody(req)
        const input = parseAddInput(body)
        const meta = await deps.store.add(input)
        send(res, 201, { key: meta })
        return true
      }
      case 'update': {
        const body = await readBody(req)
        const input = parseUpdateInput(route.id!, body)
        const meta = await deps.store.update(input)
        send(res, 200, { key: meta })
        return true
      }
      case 'remove': {
        await deps.store.remove(route.id!)
        send(res, 204, undefined)
        return true
      }
      case 'resolve': {
        const value = await deps.store.resolve(route.id!)
        send(res, 200, { key: value })
        return true
      }
    }
  } catch (err) {
    if (err instanceof LocalKeyStoreError) {
      send(res, errorStatus(err.code), { error: err.code })
      return true
    }
    const message = (err as Error).message
    if (message === 'invalid_body' || message === 'invalid_json') {
      send(res, 400, { error: message })
      return true
    }
    if (message === 'body_too_large') {
      send(res, 413, { error: message })
      return true
    }
    send(res, 500, { error: 'internal_error' })
    return true
  }
  return true
}
