import http from 'node:http'

import type { GatewayConfig } from './config'

export interface ServerHandle {
  url: string
  /** Additional URLs the server is bound to (e.g. Tailscale interface). */
  extraUrls: string[]
  close: () => Promise<void>
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
  const handler = makeHandler(options)

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
  return async (req, res) => {
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
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not_found' }))
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
