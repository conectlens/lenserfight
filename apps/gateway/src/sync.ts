import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'

import type { GatewayConfig } from './config'

export interface GatewayCommand {
  id: string
  device_id: string
  command_type: string
  payload: Record<string, unknown>
  created_at: string
  claimed_at: string | null
  acked_at: string | null
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
 * (up to 10) the cloud handed us, with claimed_at already set. The daemon is
 * responsible for ack'ing each command after dispatch.
 */
export async function pullCommands(
  deviceId: string,
  supabaseUrl: string,
  anonKey: string,
  options: SyncCallOptions = {}
): Promise<GatewayCommand[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const res = await fetchImpl(rpcUrl(supabaseUrl, 'fn_gateway_claim_commands'), {
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
