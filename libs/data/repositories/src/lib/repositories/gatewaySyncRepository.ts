import { supabase } from '@lenserfight/data/supabase'
import type {
  ObjectClassName,
  SignedEnvelope,
  SyncEntry,
  SyncStatus,
} from '@lenserfight/types'

export interface GatewaySyncRepositoryPort {
  push(envelope: SignedEnvelope<{ entries: SyncEntry[] }>): Promise<{
    appliedCount: number
    rejectedCount: number
    rejections: unknown
  }>
  pull(input: {
    envelope: SignedEnvelope<unknown>
    objectClasses: ObjectClassName[]
    limit?: number
  }): Promise<
    Array<{
      id: string
      object_class: ObjectClassName
      object_id: string
      op: 'upsert' | 'delete'
      payload: unknown
      vclock: Record<string, number>
      created_at: string
    }>
  >
  status(deviceId: string): Promise<SyncStatus[]>
  acquireLeaderLease(input: {
    leaseKind: string
    deviceId: string
    leaseSeconds?: number
  }): Promise<{ holderDeviceId: string; holderAcquired: boolean; expiresAt: string }>
  resolveConflict(input: { outboxId: string; winner: unknown }): Promise<void>
}

export class SupabaseGatewaySyncRepository implements GatewaySyncRepositoryPort {
  async push(envelope: SignedEnvelope<{ entries: SyncEntry[] }>) {
    const { data, error } = await supabase.rpc('fn_sync_push', {
      p_envelope: envelope as unknown as Record<string, unknown>,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return {
      appliedCount: row?.applied_count ?? 0,
      rejectedCount: row?.rejected_count ?? 0,
      rejections: row?.rejections ?? [],
    }
  }

  async pull(input: {
    envelope: SignedEnvelope<unknown>
    objectClasses: ObjectClassName[]
    limit?: number
  }) {
    const { data, error } = await supabase.rpc('fn_sync_pull', {
      p_envelope: input.envelope as unknown as Record<string, unknown>,
      p_object_classes: input.objectClasses,
      p_limit: input.limit ?? 100,
    })
    if (error) throw error
    return (data ?? []) as Array<{
      id: string
      object_class: ObjectClassName
      object_id: string
      op: 'upsert' | 'delete'
      payload: unknown
      vclock: Record<string, number>
      created_at: string
    }>
  }

  async status(deviceId: string): Promise<SyncStatus[]> {
    const { data, error } = await supabase.rpc('fn_sync_status', {
      p_device_id: deviceId,
    })
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      object_class: row['object_class'] as ObjectClassName,
      watermark: (row['watermark'] as string) ?? null,
      outbox_depth: Number(row['outbox_depth'] ?? 0),
      last_error: (row['last_error'] as string) ?? null,
    }))
  }

  async acquireLeaderLease(input: {
    leaseKind: string
    deviceId: string
    leaseSeconds?: number
  }) {
    const { data, error } = await supabase.rpc('fn_acquire_leader_lease', {
      p_lease_kind: input.leaseKind,
      p_device_id: input.deviceId,
      p_lease_seconds: input.leaseSeconds ?? 30,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return {
      holderDeviceId: row.holder_device_id,
      holderAcquired: Boolean(row.holder_acquired),
      expiresAt: row.expires_at,
    }
  }

  async resolveConflict(input: { outboxId: string; winner: unknown }) {
    const { error } = await supabase.rpc('fn_sync_resolve_conflict', {
      p_outbox_id: input.outboxId,
      p_winner: input.winner as unknown as Record<string, unknown>,
    })
    if (error) throw error
  }
}

export const gatewaySyncRepository = new SupabaseGatewaySyncRepository()
