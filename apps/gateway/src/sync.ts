import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'
import { canonicalize, ed25519Sign, ed25519Verify } from '@lenserfight/utils/signing'
import type { SignedEnvelope, SyncEntry } from '@lenserfight/types'

import type { GatewayConfig } from './config'

export interface GatewayCommand {
  id: string
  device_id: string
  command_type: string
  payload: Record<string, unknown>
  created_at: string
  claimed_at: string | null
  acked_at: string | null
  /** Phase BG: base64url Ed25519 signature over the canonical envelope. */
  envelope_sig?: string | null
  /** Phase BG: 128-bit nonce embedded inside the signed envelope. */
  envelope_nonce?: string | null
}

export interface SyncCallOptions {
  fetchImpl?: typeof fetch
}

export interface DispatchOptions {
  config: GatewayConfig
  supabaseUrl: string
  anonKey: string
  fetchImpl?: typeof fetch
  /** Test seam — process.exit substitute. Returns void. */
  exit?: (code?: number) => void
  /** Phase BG: cloud signing public key (base64) used to verify envelopes. */
  cloudSigningPubKeyB64?: string | null
}

function rpcUrl(supabaseUrl: string, fn: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`
}

function rpcHeaders(anonKey: string): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'content-type': 'application/json',
  }
}

/**
 * Claim the next batch of pending commands for this device. Returns the rows
 * (up to 10) the cloud handed us, with claimed_at already set. Phase BG: this
 * uses fn_gateway_claim_commands_v2, which includes envelope_sig + envelope_nonce
 * so the daemon can verify each command before dispatching.
 *
 * The daemon is responsible for ack'ing each command after dispatch (or
 * dropping it after a failed signature verification).
 */
export async function pullCommands(
  deviceId: string,
  supabaseUrl: string,
  anonKey: string,
  options: SyncCallOptions = {}
): Promise<GatewayCommand[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const res = await fetchImpl(rpcUrl(supabaseUrl, 'fn_gateway_claim_commands_v2'), {
    method: 'POST',
    headers: rpcHeaders(anonKey),
    body: JSON.stringify({ p_device_id: deviceId, p_limit: 10 }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`sync_pull_failed: HTTP ${res.status} ${text}`)
  }
  const data = (await res.json()) as GatewayCommand[] | null
  return Array.isArray(data) ? data : []
}

/**
 * Phase BG: verify an Ed25519-signed command envelope against the configured
 * cloud signing public key. Returns true when:
 *   - LF_GATEWAY_SKIP_SIG_VERIFY=true (local dev / tests), OR
 *   - the command carries no sig and the daemon does not have a public key
 *     configured (legacy migration window), OR
 *   - sig verifies over the canonical envelope.
 * Returns false on any mismatch — the caller should ack and drop the command.
 */
export function verifyCommandSignature(
  cmd: GatewayCommand,
  cloudSigningPubKeyB64: string | null | undefined
): boolean {
  if (process.env['LF_GATEWAY_SKIP_SIG_VERIFY'] === 'true') return true
  if (!cmd.envelope_sig) {
    // No sig present. Accept only when the daemon has no key configured
    // (legacy window). Once a key is set, unsigned commands are refused.
    return !cloudSigningPubKeyB64
  }
  if (!cloudSigningPubKeyB64) return false

  const canonical = canonicalize({
    id: cmd.id,
    device_id: cmd.device_id,
    command_type: cmd.command_type,
    payload: cmd.payload,
    created_at: cmd.created_at,
    envelope_nonce: cmd.envelope_nonce ?? null,
  })
  try {
    return ed25519Verify(cloudSigningPubKeyB64, Buffer.from(canonical, 'utf8'), cmd.envelope_sig)
  } catch {
    return false
  }
}

/**
 * Ack a batch of commands. The server is idempotent — re-acking is a no-op.
 */
export async function ackCommands(
  commandIds: string[],
  supabaseUrl: string,
  anonKey: string,
  options: SyncCallOptions = {}
): Promise<number> {
  if (commandIds.length === 0) return 0
  const fetchImpl = options.fetchImpl ?? fetch
  const res = await fetchImpl(rpcUrl(supabaseUrl, 'fn_gateway_ack_commands'), {
    method: 'POST',
    headers: rpcHeaders(anonKey),
    body: JSON.stringify({ p_command_ids: commandIds }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`sync_ack_failed: HTTP ${res.status} ${text}`)
  }
  const count = (await res.json()) as number | null
  return typeof count === 'number' ? count : 0
}

/**
 * Dispatch a single command. The unknown branch logs a warning and still
 * acks the command so that the cloud is not asked to retry indefinitely; the
 * cloud is responsible for not emitting unknown command_type values.
 */
export async function dispatchCommand(
  cmd: GatewayCommand,
  options: DispatchOptions
): Promise<void> {
  const exit = options.exit ?? ((code) => process.exit(code ?? 0))

  // Phase BG: verify before doing anything; on failure ack + drop silently
  // (logged to stderr) so the cloud never sees the command re-claimed.
  if (!verifyCommandSignature(cmd, options.cloudSigningPubKeyB64 ?? null)) {
    process.stderr.write(
      `[sync] envelope_sig verification failed for ${cmd.id} (${cmd.command_type}); discarding\n`
    )
    await ackSafely(cmd, options)
    return
  }

  try {
    switch (cmd.command_type) {
      case 'kill_switch': {
        await ackSafely(cmd, options)
        process.stdout.write('[sync] kill_switch dispatched; exiting\n')
        exit(0)
        return
      }
      case 'revoke_device': {
        await keychain
          .deleteSecret({ service: options.config.keychainService, account: 'device:active' })
          .catch(() => undefined)
        await ackSafely(cmd, options)
        process.stdout.write('[sync] revoke_device dispatched; private key cleared, exiting\n')
        exit(0)
        return
      }
      case 'config_push': {
        const configPath = path.join(options.config.stateDir, 'pushed-config.json')
        await writeFile(configPath, JSON.stringify(cmd.payload, null, 2), { mode: 0o600 })
        await ackSafely(cmd, options)
        return
      }
      default: {
        process.stderr.write(`[sync] unknown command_type=${cmd.command_type}; ack'ing and continuing\n`)
        await ackSafely(cmd, options)
        return
      }
    }
  } catch (err) {
    process.stderr.write(`[sync] dispatch error for ${cmd.command_type}: ${(err as Error).message}\n`)
  }
}

async function ackSafely(cmd: GatewayCommand, options: DispatchOptions): Promise<void> {
  try {
    await ackCommands([cmd.id], options.supabaseUrl, options.anonKey, { fetchImpl: options.fetchImpl })
  } catch (err) {
    process.stderr.write(`[sync] ack failed for ${cmd.id}: ${(err as Error).message}\n`)
  }
}

// ─── Outbox flush ─────────────────────────────────────────────────────────────

export interface OutboxFlushOptions {
  config: GatewayConfig
  deviceId: string
  publicKey: string
  supabaseUrl: string
  anonKey: string
  /** Returns the next batch of pending entries (from SyncEngine.takeBatch). */
  takeBatch: () => SyncEntry[]
  fetchImpl?: typeof fetch
}

/**
 * Leader-guarded outbox flush.
 *
 * 1. Acquires the gateway outbox leader lease via fn_acquire_leader_lease.
 *    If this daemon is not the current leader, returns { skipped: true }.
 * 2. Takes a batch from the caller's SyncEngine.
 *    If the batch is empty, returns { skipped: true }.
 * 3. Builds a signed Ed25519 envelope and POSTs to fn_sync_push.
 *
 * Errors propagate to the caller's scheduleLoop, which logs and continues.
 */
export async function outboxFlush(options: OutboxFlushOptions): Promise<{
  skipped: boolean
  appliedCount?: number
  rejectedCount?: number
}> {
  const { config, deviceId, publicKey, supabaseUrl, anonKey, takeBatch } = options
  const fetchImpl = options.fetchImpl ?? fetch

  // 1. Acquire leader lease (30 s TTL).
  const leaseUrl = rpcUrl(supabaseUrl, 'fn_acquire_leader_lease')
  const leaseRes = await fetchImpl(leaseUrl, {
    method:  'POST',
    headers: rpcHeaders(anonKey),
    body:    JSON.stringify({ p_lease_kind: 'sync_flush', p_device_id: deviceId, p_lease_seconds: 30 }),
  })
  if (!leaseRes.ok) {
    const text = await leaseRes.text().catch(() => '')
    throw new Error(`outbox_flush: leader lease RPC failed ${leaseRes.status}: ${text}`)
  }
  const leaseRow = (await leaseRes.json()) as { holder_acquired?: boolean } | null
  if (!leaseRow?.holder_acquired) {
    return { skipped: true }
  }

  // 2. Take pending batch.
  const entries = takeBatch()
  if (entries.length === 0) {
    return { skipped: true }
  }

  // 3. Sign envelope and push.
  const privateKey = await keychain.getSecret({
    service: config.keychainService,
    account: 'device:active',
  })
  if (!privateKey) {
    throw new Error('outbox_flush: private key not found in keychain — daemon not provisioned')
  }

  const body = { entries }
  const canonical = canonicalize(body)
  const nonce = randomBytes(16).toString('base64url')
  const iat   = Math.floor(Date.now() / 1000)

  const toSign = canonicalize({ v: 1, alg: 'ed25519', kid: deviceId, iat, nonce, body })
  const sig = ed25519Sign(privateKey, Buffer.from(toSign, 'utf8'))

  const envelope: SignedEnvelope<{ entries: SyncEntry[] }> = {
    v: 1, alg: 'ed25519', kid: deviceId, iat, nonce, body, sig,
  }

  const pushUrl = rpcUrl(supabaseUrl, 'fn_sync_push')
  const pushRes = await fetchImpl(pushUrl, {
    method:  'POST',
    headers: rpcHeaders(anonKey),
    body:    JSON.stringify({ p_envelope: envelope }),
  })
  if (!pushRes.ok) {
    const text = await pushRes.text().catch(() => '')
    throw new Error(`outbox_flush: fn_sync_push failed ${pushRes.status}: ${text}`)
  }

  const result = (await pushRes.json()) as { applied_count?: number; rejected_count?: number } | null
  return {
    skipped:       false,
    appliedCount:  result?.applied_count  ?? 0,
    rejectedCount: result?.rejected_count ?? 0,
  }
}
