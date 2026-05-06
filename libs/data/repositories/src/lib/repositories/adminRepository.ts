import { supabase } from '@lenserfight/data/supabase'

export interface WorkerHealthRecord {
  worker_id: string
  worker_type: string
  last_seen_at: string
  is_healthy: boolean
  seconds_since: number
}

export interface StuckBattleRecord {
  id: string
  slug: string
  title: string
  status: string
  updated_at: string
  stale_seconds: number
}

export interface AdminDLQEntryRecord {
  id: string
  job_id: string
  battle_id: string
  contender_id: string
  slot: string | null
  error_code: string | null
  error_message: string | null
  attempt_count: number
  payload: Record<string, unknown>
  resolved_at: string | null
  created_at: string
}

export interface AdminRepositoryPort {
  getWorkerHealth(): Promise<WorkerHealthRecord[]>
  getDLQEntries(unresolvedOnly?: boolean): Promise<AdminDLQEntryRecord[]>
  retryDLQEntry(deadLetterId: string): Promise<void>
  getStuckBattles(thresholdMinutes?: number): Promise<StuckBattleRecord[]>
}

export class SupabaseAdminRepository implements AdminRepositoryPort {
  async getWorkerHealth(): Promise<WorkerHealthRecord[]> {
    const { data, error } = await supabase.rpc('fn_admin_get_worker_health')
    if (error) throw error
    return (data ?? []) as WorkerHealthRecord[]
  }

  async getDLQEntries(unresolvedOnly = true): Promise<AdminDLQEntryRecord[]> {
    const { data, error } = await supabase.rpc('fn_admin_get_dlq_entries', {
      p_unresolved_only: unresolvedOnly,
    })
    if (error) throw error
    return (data ?? []) as AdminDLQEntryRecord[]
  }

  async retryDLQEntry(deadLetterId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_admin_retry_dlq', {
      p_dead_letter_id: deadLetterId,
    })
    if (error) throw error
  }

  async getStuckBattles(thresholdMinutes = 30): Promise<StuckBattleRecord[]> {
    const { data, error } = await supabase.rpc('fn_admin_get_stuck_battles', {
      p_threshold_minutes: thresholdMinutes,
    })
    if (error) throw error
    return (data ?? []) as StuckBattleRecord[]
  }
}

export const adminRepository = new SupabaseAdminRepository()
