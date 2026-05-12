import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'
import { canonicalize, ed25519Sign } from '@lenserfight/utils/signing'

import type { GatewayConfig } from './config'

export interface GatewayIdentity {
  device_id: string
  public_key: string
  hostname?: string | null
  daemon_version: string
}

export interface HeartbeatPayload {
  device_id: string
  public_key: string
  hostname: string | null
  daemon_version: string
  timestamp: string
  signature: string
}

export interface HeartbeatResult {
  approved: boolean
  killSwitch: boolean
}

export interface SendHeartbeatOptions {
  fetchImpl?: typeof fetch
  /** Used in tests to inject a deterministic timestamp. */
  now?: () => Date
}

const IDENTITY_FILENAME = 'identity.json'

/**
 * Build a signed heartbeat payload from the local identity + keychain private key.
 *
 * The signature covers a canonicalized JSON object of
 *   { device_id, public_key, hostname, daemon_version, timestamp }
 * so that the server can verify the daemon is the one in possession of the
 * private key paired with the recorded public key. Verification is a future
 * server-side hardening step; the field exists today so the schema is stable.
 */
export async function buildHeartbeatPayload(
  config: GatewayConfig,
  identity: GatewayIdentity,
  options: SendHeartbeatOptions = {}
): Promise<HeartbeatPayload> {
  if (!identity?.device_id) {
    throw new Error('heartbeat_identity_missing: identity has no device_id')
  }
  if (!identity?.public_key) {
    throw new Error('heartbeat_identity_missing: identity has no public_key')
  }

  const privateKey = await keychain.getSecret({
    service: config.keychainService,
    account: 'device:active',
  })
  if (!privateKey) {
    throw new Error('heartbeat_identity_missing: private key not found in keychain')
  }

  const now = options.now ? options.now() : new Date()
  const body = {
    device_id: identity.device_id,
    public_key: identity.public_key,
    hostname: identity.hostname ?? null,
    daemon_version: identity.daemon_version,
    timestamp: now.toISOString(),
  }
  const canonical = canonicalize(body)
  const signature = ed25519Sign(privateKey, Buffer.from(canonical, 'utf8'))

  return { ...body, signature }
}

/**
 * Read `identity.json` from the gateway state directory.
 *
 * Returns null when the file is missing — the caller (heartbeat / sync loops)
 * is expected to no-op until the daemon has been provisioned via
 * `lf-gateway-init`.
 */
export async function loadGatewayIdentity(
  config: GatewayConfig
): Promise<GatewayIdentity | null> {
  try {
    const raw = await readFile(path.join(config.stateDir, IDENTITY_FILENAME), 'utf8')
    const parsed = JSON.parse(raw) as Partial<GatewayIdentity>
    if (!parsed.device_id || !parsed.public_key) return null
    return {
      device_id: parsed.device_id,
      public_key: parsed.public_key,
      hostname: parsed.hostname ?? null,
      daemon_version: parsed.daemon_version ?? config.daemonVersion,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/**
 * POST the heartbeat to Supabase via the PostgREST RPC for fn_gateway_heartbeat.
 * Returns the parsed approval + kill-switch flags.
 *
 * The daemon's main loop turns kill_switch=true into `process.exit(0)` so the
 * platform can stop a compromised daemon without requiring local intervention.
 */
export async function sendHeartbeat(
  config: GatewayConfig,
  identity: GatewayIdentity,
  supabaseUrl: string,
  anonKey: string,
  options: SendHeartbeatOptions = {}
): Promise<HeartbeatResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const payload = await buildHeartbeatPayload(config, identity, options)

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/fn_gateway_heartbeat`
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_device_id: payload.device_id,
      p_public_key: payload.public_key,
      p_hostname: payload.hostname,
      p_daemon_version: payload.daemon_version,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`heartbeat_failed: HTTP ${res.status} ${text}`)
  }

  const json = (await res.json()) as { approved?: boolean; kill_switch?: boolean } | null
  return {
    approved: Boolean(json?.approved),
    killSwitch: Boolean(json?.kill_switch),
  }
}
