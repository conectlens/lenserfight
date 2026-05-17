import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

interface VoteAnomalySignal {
  voter_id: string
  reason: string
  score: number
}

export async function processVoteAnomalies(battleId: string): Promise<void> {
  const svc = createServiceSupabaseClient()

  const { data, error } = await svc.rpc('fn_detect_suspicious_voting', {
    p_battle_id: battleId,
  })

  if (error) {
    nodeLogger.error('vote-anomaly-worker: detection failed', { battleId, message: error.message })
    return
  }

  const signals = (data ?? []) as VoteAnomalySignal[]
  if (signals.length === 0) return

  for (const signal of signals) {
    const { error: flagErr } = await svc.rpc('fn_flag_vote_anomaly', {
      p_battle_id: battleId,
      p_voter_id:  signal.voter_id,
      p_type:      signal.reason,
      p_score:     signal.score,
    })

    if (flagErr) {
      nodeLogger.warn('vote-anomaly-worker: flag failed', {
        battleId,
        voterId: signal.voter_id,
        reason:  signal.reason,
        message: flagErr.message,
      })
    } else {
      nodeLogger.info('vote-anomaly-worker: flagged', {
        battleId,
        voterId:      signal.voter_id,
        anomalyType:  signal.reason,
        score:        signal.score,
      })
    }
  }
}

export function startVoteAnomalyWorker(): () => void {
  const svc = createServiceSupabaseClient()

  const channel = svc
    .channel('vote-anomaly-worker')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'battles', table: 'votes' },
      (payload) => {
        const battleId = (payload.new as Record<string, unknown>)['battle_id'] as string | undefined
        if (!battleId) return
        processVoteAnomalies(battleId).catch((err: unknown) => {
          nodeLogger.error('vote-anomaly-worker: unhandled error', {
            battleId,
            message: err instanceof Error ? err.message : String(err),
          })
        })
      },
    )
    .subscribe()

  nodeLogger.info('vote-anomaly-worker: subscribed to battles.votes inserts')

  return () => {
    svc.removeChannel(channel).catch(() => undefined)
  }
}
