import { supabase } from '@lenserfight/data/supabase'
import { useQuery } from '@tanstack/react-query'

export interface ExecutionControlStatus {
  system_kill_switch_active: boolean
  queue_frozen: boolean
  frozen_reason: string | null
  active_run_count: number
  queued_run_count: number
  active_battle_job_count: number
  queued_battle_job_count: number
  active_worker_count: number
  stale_worker_count: number
  dlq_workflow_count: number
  dlq_battle_count: number
}

async function fetchExecutionStatus(): Promise<ExecutionControlStatus | null> {
  const { data, error } = await supabase.rpc('fn_get_execution_status')
  if (error) throw error
  return data as ExecutionControlStatus | null
}

/**
 * Polls fn_get_execution_status() to expose the global platform execution
 * state. Backs off to 30s when the system is healthy; accelerates to 5s
 * during an emergency stop or queue freeze so the UI resolves quickly.
 *
 * Returns a stable shape:
 *   isSystemLocked — system kill switch is active
 *   isQueueFrozen  — dispatch queue is frozen (new scheduled runs blocked)
 *   isStopping     — kill switch active but runs are still draining
 *   status         — full status object (null while loading)
 */
export function useExecutionControl() {
  const query = useQuery<ExecutionControlStatus | null>({
    queryKey: ['platform', 'execution-control'],
    queryFn: fetchExecutionStatus,
    staleTime: 30_000,
    refetchInterval: (q) => {
      const s = q.state.data
      if (!s) return 30_000
      return s.system_kill_switch_active || s.queue_frozen ? 5_000 : 30_000
    },
  })

  const s = query.data ?? null

  return {
    isSystemLocked: s?.system_kill_switch_active ?? false,
    isQueueFrozen: s?.queue_frozen ?? false,
    /** True when the kill switch is active but runs are still in-flight (draining). */
    isStopping: (s?.system_kill_switch_active ?? false) && (s?.active_run_count ?? 0) > 0,
    status: s,
    isLoading: query.isLoading,
  }
}
