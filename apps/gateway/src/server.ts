import { readFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

import { LocalKeyStore } from '@lenserfight/data/local-keys'

import { BearerAuthGuard, loadAllowedOriginPatterns } from './auth/bearer'
import { handleKeysRequest } from './handlers/keys'

import type { LocalKeyStorePort } from '@lenserfight/data/local-keys'
import type { GatewayConfig } from './config'

export interface ServerHandle {
  url: string
  /** Additional URLs the server is bound to (e.g. Tailscale interface). */
  extraUrls: string[]
  close: () => Promise<void>
}

export interface IdentityReadResult {
  public_key: string
  generated_at: string | null
  daemon_version: string
}

export interface StartServerOptions {
  deviceId?: string
  daemonVersion: string
  onPeerLookup?: () => Promise<unknown[]>
  /**
   * Primary bind host (from `config.bind`). Used so `/peers` stays on the
   * primary listener only; extra binds (e.g. Tailscale) return an empty list.
   * Transport is not identity — see Trust Gateway security review.
   */
  primaryBind: string
  /**
   * Additional bind addresses (typically a single Tailscale CGNAT address).
   * The loopback bind from `config.bind` is always created. Each extra bind
   * gets its own `http.Server` so we can fail one without taking the rest
   * down. v1 forbids `0.0.0.0` here; callers must validate before calling.
   */
  extraBinds?: string[]
  /**
   * Override the identity reader. When omitted, the server reads
   * `<stateDir>/identity.json` from disk. The private key is never returned.
   */
  onIdentityRead?: () => Promise<IdentityReadResult | null>
  /** Outbox size reporter for `/outbox` and `/sync/pull` UX surfaces. */
  onOutboxStats?: () => Promise<{ pending: number }>
  /** Manual sync trigger handler for POST `/sync/pull`. Returns claimed count. */
  onSyncPull?: () => Promise<{ claimed: number }>
  /** Path to identity.json. Defaults to `<config.stateDir>/identity.json`. */
  stateDir?: string
  /**
   * Local-keys store and auth guard. When omitted the server constructs
   * defaults (file-backed store + OS-keychain bearer token). Override for
   * tests.
   */
  localKeyStore?: LocalKeyStorePort
  bearerAuth?: BearerAuthGuard
}

/**
 * Loopback HTTP server. v1 exposes a tiny health endpoint and a peer
 * discovery endpoint; the broader API surface (signed routes for sync push
 * pull / attestation forwarding) lands in subsequent commits.
 *
 * The loopback bind never resolves to 0.0.0.0; preconditions enforce that.
 * Extra binds (Tailscale) require explicit consent and must be plain CGNAT
 * IPv4 addresses — the daemon refuses public binds even when given one.
 *
 * `/peers` is answered only on the primary bind; on extra binds it returns an
 * empty list so mesh listeners do not expose discovery data to whoever can
 * reach that interface.
 */
export async function startServer(
  config: GatewayConfig,
  options: StartServerOptions
): Promise<ServerHandle> {
  const localKeyStore = options.localKeyStore ?? new LocalKeyStore()
  const bearerAuth = options.bearerAuth ?? new BearerAuthGuard()

  const handler = makeHandler({
    ...options,
    stateDir: options.stateDir ?? config.stateDir,
    localKeyStore,
    bearerAuth,
  })

  const primary = http.createServer(handler)
  await listen(primary, config.port, config.bind)

  const primaryAddress = primary.address()
  const primaryPort =
    typeof primaryAddress === 'object' && primaryAddress ? primaryAddress.port : config.port
  const url = `http://${config.bind}:${primaryPort}`
  const extraServers: http.Server[] = []
  const extraUrls: string[] = []

  for (const bind of options.extraBinds ?? []) {
    if (bind === '0.0.0.0' || bind === '::') {
      throw new Error(`public_bind_forbidden: refusing to listen on ${bind}`)
    }
    const extra = http.createServer(handler)
    try {
      await listen(extra, primaryPort, bind)
      extraServers.push(extra)
      extraUrls.push(`http://${bind}:${primaryPort}`)
    } catch (err) {
      try {
        await new Promise<void>((res) => primary.close(() => res()))
      } finally {
        for (const s of extraServers) await new Promise<void>((res) => s.close(() => res()))
      }
      throw err
    }
  }

  return {
    url,
    extraUrls,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        primary.close((err) => (err ? reject(err) : resolve()))
      )
      for (const s of extraServers) {
        await new Promise<void>((resolve, reject) =>
          s.close((err) => (err ? reject(err) : resolve()))
        )
      }
    },
  }
}

function makeHandler(options: StartServerOptions): http.RequestListener {
  // Compute once per handler — patterns are static for the daemon's lifetime.
  const allowedOriginPatterns = loadAllowedOriginPatterns()

  return async (req, res) => {
    const url = (req.url ?? '').split('?')[0]

    // CORS pre-handling. Every gateway endpoint — /healthz, /peers, /identity,
    // /sync/pull, /outbox, /keys/* — is callable from the LenserFight web app
    // (the browser uses /healthz to probe reachability before pairing). Apply
    // the same origin allow-list everywhere so the very first cross-origin
    // fetch isn't blocked by the missing Access-Control-Allow-Origin header.
    const origin = (req.headers['origin'] as string | undefined) ?? null
    const originAllowed =
      origin == null || origin === '' || allowedOriginPatterns.some((p) => p.test(origin))

    if (req.method === 'OPTIONS') {
      if (originAllowed && origin) {
        res.setHeader('access-control-allow-origin', origin)
        res.setHeader('access-control-allow-headers', 'authorization, content-type')
        res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.setHeader('access-control-allow-credentials', 'false')
        res.setHeader('access-control-max-age', '60')
        res.setHeader('vary', 'origin')
        // Chrome's Private Network Access spec: when a non-private origin
        // (or any origin per the new pre-flight rules) targets a private
        // resource, the browser sends `Access-Control-Request-Private-Network`
        // and only proceeds if we respond with this header. Loopback and
        // Tailscale CGNAT both count as private — answer yes.
        if (req.headers['access-control-request-private-network']) {
          res.setHeader('access-control-allow-private-network', 'true')
        }
        res.statusCode = 204
      } else {
        res.statusCode = 403
      }
      res.end()
      return
    }

    if (origin && originAllowed) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('vary', 'origin')
    }

    if (
      options.localKeyStore &&
      options.bearerAuth &&
      url.startsWith('/keys')
    ) {
      const handled = await handleKeysRequest(req, res, {
        store: options.localKeyStore,
        auth: options.bearerAuth,
      })
      if (handled) return
    }
    res.setHeader('content-type', 'application/json')
    if (req.url === '/healthz') {
      res.statusCode = 200
      res.end(
        JSON.stringify({
          status: 'ok',
          device_id: options.deviceId ?? null,
          daemon_version: options.daemonVersion,
          time: new Date().toISOString(),
        })
      )
      return
    }
    if (req.url === '/peers') {
      const local = normalizeLocalAddress(req.socket.localAddress)
      const primary = normalizeLocalAddress(options.primaryBind)
      const onExtraBind =
        local != null &&
        primary != null &&
        local !== primary &&
        (options.extraBinds ?? []).some((b) => normalizeLocalAddress(b) === local)
      const peers = onExtraBind ? [] : (await options.onPeerLookup?.()) ?? []
      res.statusCode = 200
      res.end(
        JSON.stringify({
          peers,
          peer_discovery: onExtraBind ? 'primary_bind_only' : 'primary',
        })
      )
      return
    }
    if (req.url === '/identity' && req.method === 'GET') {
      const identity = await readIdentity(options)
      if (!identity) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'identity_missing' }))
        return
      }
      res.statusCode = 200
      res.end(JSON.stringify(identity))
      return
    }
    if (req.url === '/outbox' && req.method === 'GET') {
      const stats = (await options.onOutboxStats?.()) ?? { pending: 0 }
      res.statusCode = 200
      res.end(JSON.stringify(stats))
      return
    }
    if (req.url === '/sync/pull' && req.method === 'POST') {
      const result = (await options.onSyncPull?.()) ?? { claimed: 0 }
      res.statusCode = 200
      res.end(JSON.stringify(result))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not_found' }))
  }
}

async function readIdentity(options: StartServerOptions): Promise<IdentityReadResult | null> {
  if (options.onIdentityRead) return options.onIdentityRead()
  if (!options.stateDir) return null
  try {
    const raw = await readFile(path.join(options.stateDir, 'identity.json'), 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed['public_key'] !== 'string') return null
    return {
      public_key: parsed['public_key'] as string,
      generated_at: typeof parsed['generated_at'] === 'string' ? (parsed['generated_at'] as string) : null,
      daemon_version:
        typeof parsed['daemon_version'] === 'string'
          ? (parsed['daemon_version'] as string)
          : options.daemonVersion,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    return null
  }
}

function normalizeLocalAddress(addr: string | undefined): string | null {
  if (!addr) return null
  if (addr.startsWith('::ffff:')) return addr.slice('::ffff:'.length)
  return addr
}

function listen(server: http.Server, port: number, host: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
      server.removeListener('error', onError)
      reject(err)
    }
    server.once('error', onError)
    server.listen(port, host, () => {
      server.removeListener('error', onError)
      resolve()
    })
  })
}
