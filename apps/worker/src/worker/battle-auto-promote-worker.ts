import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

const POLL_INTERVAL_MS = parseInt(
  process.env['BATTLE_AUTO_PROMOTE_INTERVAL_MS'] ?? '300000', // 5 min
  10
)

export async function runBattleAutoPromoteCycle(): Promise<number> {
  const svc = createServiceSupabaseClient()

  const { data: battleIds, error: listErr } = await svc
    .from('battles')
    .select('id')
    .eq('status', 'draft')
    .eq('auto_promote', true)

  if (listErr) {
    nodeLogger.error('battle-auto-promote: list draft battles failed', { message: listErr.message })
    return 0
  }

  let promoted = 0
  for (const row of battleIds ?? []) {
    const { data, error } = await svc.rpc('fn_battles_auto_promote', {
      p_battle_id: row.id,
    })

    if (error) {
      nodeLogger.warn('battle-auto-promote: promote failed', { battleId: row.id, message: error.message })
    } else if (data === true) {
      promoted++
      nodeLogger.info('battle-auto-promote: promoted', { battleId: row.id })
    }
  }

  return promoted
}

export function startBattleAutoPromoteWorker(): () => void {
  let timer: ReturnType<typeof setInterval> | undefined

  async function tick() {
    try {
      const n = await runBattleAutoPromoteCycle()
      if (n > 0) {
        nodeLogger.info('battle-auto-promote: promoted this cycle', { count: n })
      }
    } catch (err) {
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
