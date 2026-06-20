import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// H2: battle-status → workflow dispatch.
//
// Duplicate dispatch across replicas is prevented in the database: the
// idempotent fn_workflows_dispatch_on_event dedupes per (workflow, event
// signature), so it is safe for every replica to subscribe. Here we add the
// other half — resilience to the realtime socket dropping. Without resubscribe,
// a dropped connection silently swallows every battle transition until the
// process restarts. We watch the channel status and re-subscribe with backoff.

const RESUBSCRIBE_BASE_MS = 1_000
const RESUBSCRIBE_MAX_MS = 30_000

export function startWorkflowEventDispatcher(): () => void {
  const svc = createServiceSupabaseClient()
  let channel: RealtimeChannel | undefined
  let stopped = false
  let attempt = 0
  let resubscribeTimer: ReturnType<typeof setTimeout> | undefined

  const handleBattleUpdate = (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const newRow = payload.new
    const oldRow = payload.old
    if (newRow['status'] === oldRow['status']) return

    const eventPayload = {
      battle_id: newRow['id'],
      status: newRow['status'],
      old_status: oldRow['status'],
    }

    void (async () => {
      try {
        const { data, error } = await svc.rpc('fn_workflows_dispatch_on_event', {
          p_event_type: 'battle_event',
          p_event_payload: eventPayload,
        })
        if (error) {
          nodeLogger.warn('workflow-event-dispatcher: dispatch failed', { message: error.message })
        } else if ((data as number) > 0) {
          nodeLogger.info('workflow-event-dispatcher: dispatched', {
            battleId: newRow['id'], newStatus: newRow['status'], dispatched: data,
          })
        }
      } catch (err: unknown) {
        nodeLogger.error('workflow-event-dispatcher: unhandled error', {
          message: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }

  const scheduleResubscribe = () => {
    if (stopped || resubscribeTimer) return
    const delay = Math.min(RESUBSCRIBE_MAX_MS, RESUBSCRIBE_BASE_MS * 2 ** attempt)
    attempt += 1
    nodeLogger.warn('workflow-event-dispatcher: resubscribing', { attempt, delayMs: delay })
    resubscribeTimer = setTimeout(() => {
      resubscribeTimer = undefined
      subscribe()
    }, delay)
  }

  const subscribe = () => {
    if (stopped) return
    if (channel) { svc.removeChannel(channel).catch(() => undefined) }

    channel = svc
      .channel(`workflow-event-dispatcher-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'battles', table: 'battles' }, handleBattleUpdate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          attempt = 0
          nodeLogger.info('workflow-event-dispatcher: subscribed to battles.battles updates')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!stopped) scheduleResubscribe()
        }
      })
  }

  subscribe()

  return () => {
    stopped = true
    if (resubscribeTimer) clearTimeout(resubscribeTimer)
    if (channel) svc.removeChannel(channel).catch(() => undefined)
  }
}
