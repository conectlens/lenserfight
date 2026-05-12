import { createHmac } from 'node:crypto'
import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

const DRAIN_INTERVAL_MS = parseInt(
  process.env['WEBHOOK_DRAIN_INTERVAL_MS'] ?? '10000',
  10
)
const MAX_RETRIES = 3

interface OutboxRow {
  id: string
  subscription_id: string
  battle_id: string
  event_type: string
  payload: Record<string, unknown>
  retry_count: number
}

interface SubscriptionRow {
  webhook_url: string
  secret_hmac: string
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

async function deliverWebhook(
  outbox: OutboxRow,
  sub: SubscriptionRow
): Promise<boolean> {
  const body = JSON.stringify({
    event_type: outbox.event_type,
    battle_id:  outbox.battle_id,
    payload:    outbox.payload,
    delivered_at: new Date().toISOString(),
  })

  const sig = signPayload(body, sub.secret_hmac)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(sub.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'X-LF-Signature':     `sha256=${sig}`,
        'X-LF-Event-Type':    outbox.event_type,
        'X-LF-Delivery-Id':   outbox.id,
      },
      body,
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function drainCycle(): Promise<void> {
  const svc = createServiceSupabaseClient()

  // Claim up to 10 undelivered entries
  const { data: rows, error } = await svc
    .from('webhook_outbox')
    .select('id, subscription_id, battle_id, event_type, payload, retry_count')
    .is('acked_at', null)
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error || !rows?.length) return

  for (const row of rows as OutboxRow[]) {
    const { data: subData } = await svc
      .from('battle_event_subscriptions')
      .select('webhook_url, secret_hmac')
      .eq('id', row.subscription_id)
      .is('revoked_at', null)
      .single()

    if (!subData) {
      // Subscription revoked — mark as acked
      await svc
        .from('webhook_outbox')
        .update({ acked_at: new Date().toISOString() })
        .eq('id', row.id)
      continue
    }

    const ok = await deliverWebhook(row, subData as SubscriptionRow)

    if (ok) {
      await svc
        .from('webhook_outbox')
        .update({ acked_at: new Date().toISOString() })
        .eq('id', row.id)
      nodeLogger.info('webhook-drain: delivered', { outboxId: row.id, eventType: row.event_type })
    } else {
      const newRetry = row.retry_count + 1
      await svc
        .from('webhook_outbox')
        .update({ retry_count: newRetry })
        .eq('id', row.id)

      if (newRetry >= MAX_RETRIES) {
        nodeLogger.warn('webhook-drain: max retries reached', { outboxId: row.id })
      }
    }
  }
}

export function startWebhookDrainWorker(): () => void {
  let timer: ReturnType<typeof setInterval> | undefined

  async function tick() {
    try {
      await drainCycle()
    } catch (err) {
      nodeLogger.error('webhook-drain: cycle error', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  tick().catch(() => undefined)
  timer = setInterval(() => { tick().catch(() => undefined) }, DRAIN_INTERVAL_MS)
  nodeLogger.info('webhook-drain-worker: started', { intervalMs: DRAIN_INTERVAL_MS })

  return () => {
    if (timer) clearInterval(timer)
  }
}
