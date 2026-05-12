import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

export function startWorkflowEventDispatcher(): () => void {
  const svc = createServiceSupabaseClient()

  const channel = svc
    .channel('workflow-event-dispatcher')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'battles', table: 'battles' },
      (payload) => {
        const newRow = payload.new as Record<string, unknown>
        const oldRow = payload.old as Record<string, unknown>

        if (newRow['status'] === oldRow['status']) return

        const eventPayload = {
          battle_id: newRow['id'],
          status:    newRow['status'],
          old_status: oldRow['status'],
        }

        void (async () => {
          try {
            const { data, error } = await svc.rpc('fn_workflows_dispatch_on_event', {
              p_event_type:    'battle_event',
              p_event_payload: eventPayload,
            })
            if (error) {
              nodeLogger.warn('workflow-event-dispatcher: dispatch failed', { message: error.message })
            } else if ((data as number) > 0) {
              nodeLogger.info('workflow-event-dispatcher: dispatched', {
                battleId: newRow['id'],
                newStatus: newRow['status'],
                dispatched: data,
              })
            }
          } catch (err: unknown) {
            nodeLogger.error('workflow-event-dispatcher: unhandled error', {
              message: err instanceof Error ? err.message : String(err),
            })
          }
        })()
      }
    )
    .subscribe()

  nodeLogger.info('workflow-event-dispatcher: subscribed to battles.battles updates')

  return () => {
    svc.removeChannel(channel).catch(() => undefined)
  }
}
