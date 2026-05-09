import { supabase } from '@lenserfight/data/supabase'
import type { DeviceRecord } from '@lenserfight/types'

export interface GatewayDeviceRepositoryPort {
  list(filter?: { trustLevel?: string }): Promise<DeviceRecord[]>
  registerWithKey(input: {
    name: string
    publicKey: string
    deviceType?: string
    os?: string
    arch?: string
    cliVersion?: string
    daemonVersion?: string
    capabilities?: Record<string, unknown>
  }): Promise<{
    deviceId: string
    challengeId: string
    challengeNonce: string
    challengeExpiresAt: string
  }>
  postChallenge(input: {
    deviceId: string
    signature: string
    signedIat?: string
  }): Promise<string>
  approve(deviceId: string): Promise<void>
  revoke(deviceId: string): Promise<void>
  heartbeat(input: {
    deviceId: string
    daemonVersion?: string
    envelopeSig?: string
    gatewayStatus?: string
  }): Promise<void>
}

export class SupabaseGatewayDeviceRepository
  implements GatewayDeviceRepositoryPort
{
  async list(filter?: { trustLevel?: string }): Promise<DeviceRecord[]> {
    const { data, error } = await supabase.rpc('fn_device_list', {
      p_trust_level: filter?.trustLevel ?? null,
      p_limit: 100,
    })
    if (error) throw error
    return (data ?? []) as DeviceRecord[]
  }

  async registerWithKey(input: {
    name: string
    publicKey: string
    deviceType?: string
    os?: string
    arch?: string
    cliVersion?: string
    daemonVersion?: string
    capabilities?: Record<string, unknown>
  }) {
    const { data, error } = await supabase.rpc('fn_device_register_with_key', {
      p_name: input.name,
      p_public_key: input.publicKey,
      p_device_type: input.deviceType ?? 'other',
      p_os: input.os ?? null,
      p_arch: input.arch ?? null,
      p_cli_version: input.cliVersion ?? null,
      p_daemon_version: input.daemonVersion ?? null,
      p_capabilities: input.capabilities ?? {},
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return {
      deviceId: row.device_id,
      challengeId: row.challenge_id,
      challengeNonce: row.challenge_nonce,
      challengeExpiresAt: row.challenge_expires_at,
    }
  }

  async postChallenge(input: {
    deviceId: string
    signature: string
    signedIat?: string
  }): Promise<string> {
    const { data, error } = await supabase.rpc('fn_device_post_challenge', {
      p_device_id: input.deviceId,
      p_signature: input.signature,
      p_signed_iat: input.signedIat ?? new Date().toISOString(),
    })
    if (error) throw error
    return String(data)
  }

  async approve(deviceId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_device_approve', {
      p_device_id: deviceId,
    })
    if (error) throw error
  }

  async revoke(deviceId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_device_revoke', {
      p_device_id: deviceId,
    })
    if (error) throw error
  }

  async heartbeat(input: {
    deviceId: string
    daemonVersion?: string
    envelopeSig?: string
    gatewayStatus?: string
  }): Promise<void> {
    const { error } = await supabase.rpc('fn_device_heartbeat', {
      p_device_id: input.deviceId,
      p_daemon_version: input.daemonVersion ?? null,
      p_envelope_sig: input.envelopeSig ?? null,
      p_gateway_status: input.gatewayStatus ?? 'connected',
    })
    if (error) throw error
  }
}

export const gatewayDeviceRepository = new SupabaseGatewayDeviceRepository()
