import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

const POLL_INTERVAL_MS = parseInt(
  process.env['BATTLE_AUTO_PROMOTE_INTERVAL_MS'] ?? '300000', // 5 min
  10
)

export async function runBattleAutoPromoteCycle(): Promise<number> {
  const svc = createServiceSupabaseClient()

  // fn_worker_run_auto_promote_cycle encapsulates the draft-battle query and
  // the per-battle fn_battles_auto_promote call in a single service-role RPC.
  //
  // Why not svc.from('battles')?
  // The battles table lives in the battles schema which is NOT exposed via
  // PostgREST (locked down by migration 20270801000001). Direct .from()
  // queries hit public.battles which does not exist and silently return zero
  // rows, causing this worker to never promote any battles.
  const { data, error } = await svc.rpc('fn_worker_run_auto_promote_cycle')

  if (error) {
    nodeLogger.error('battle-auto-promote: cycle RPC failed', { message: error.message })
    return 0
  }

  return (data as number | null) ?? 0
}

export function startBattleAutoPromoteWorker(): () => void {
  let timer: ReturnType<typeof setInterval> | undefined

  async function tick() {
    const _cycleStart = performance.now()
    try {
      const n = await runBattleAutoPromoteCycle()
      nodeLogger.info({ workerId: 'battle-auto-promote-worker', workerType: 'daemon', cycleMs: Math.round(performance.now() - _cycleStart), processed: n, errors: 0 }, 'cycle')
    } catch (err) {
      nodeLogger.error({ workerId: 'battle-auto-promote-worker', workerType: 'daemon', cycleMs: Math.round(performance.now() - _cycleStart), processed: 0, errors: 1 }, 'cycle')
      nodeLogger.error('battle-auto-promote: cycle error', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  tick().catch(() => undefined)
  timer = setInterval(() => { tick().catch(() => undefined) }, POLL_INTERVAL_MS)
  nodeLogger.info('battle-auto-promote-worker: started', { intervalMs: POLL_INTERVAL_MS })

  return () => {
    if (timer) clearInterval(timer)
  }
}
