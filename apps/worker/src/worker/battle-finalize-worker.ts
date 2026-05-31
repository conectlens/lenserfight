import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

const POLL_INTERVAL_MS = parseInt(
  process.env['BATTLE_FINALIZE_INTERVAL_MS'] ?? '60000', // 60 s
  10
)

export async function runBattleFinalizeCycle(): Promise<number> {
  const svc = createServiceSupabaseClient()

  // fn_worker_run_finalize_cycle encapsulates the scoring-battle query and the
  // per-battle fn_battles_finalize call in a single service-role RPC.
  //
  // Why not svc.from('battles')?
  // The battles table lives in the battles schema which is NOT exposed via
  // PostgREST (locked down by migration 20270801000001). Direct .from()
  // queries hit public.battles which does not exist and silently return zero
  // rows, causing this worker to never finalize any battles.
  const { data, error } = await svc.rpc('fn_worker_run_finalize_cycle')

  if (error) {
    nodeLogger.error('battle-finalize: cycle RPC failed', { message: error.message })
    return 0
  }

  return (data as number | null) ?? 0
}

export function startBattleFinalizeWorker(): () => void {
  let timer: ReturnType<typeof setInterval> | undefined

  async function tick() {
    try {
      const n = await runBattleFinalizeCycle()
      if (n > 0) {
        nodeLogger.info('battle-finalize: finalized this cycle', { count: n })
      }
    } catch (err) {
      nodeLogger.error('battle-finalize: cycle error', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  tick().catch(() => undefined)
  timer = setInterval(() => { tick().catch(() => undefined) }, POLL_INTERVAL_MS)
  nodeLogger.info('battle-finalize-worker: started', { intervalMs: POLL_INTERVAL_MS })

  return () => {
    if (timer) clearInterval(timer)
  }
}
