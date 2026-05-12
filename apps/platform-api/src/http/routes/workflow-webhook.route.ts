import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeLogger } from '@lenserfight/utils/logger'
import { readJson, sendApiError, sendSuccess } from '../../lib/http'
import { createServiceSupabaseClient } from '../../lib/supabase'

// Simple in-memory per-workflow rate limiter: 10 req/min
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(workflowId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(workflowId)
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(workflowId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  return false
}

// POST /workflows/:id/trigger
export async function handleWorkflowWebhookTrigger(
  req: IncomingMessage,
  res: ServerResponse,
  workflowId: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  if (isRateLimited(workflowId)) {
    sendApiError(res, 429, { code: 'rate_limited', message: 'Too many webhook triggers. Limit: 10/min.' }, requestId, startedAt)
    return
  }

  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    sendApiError(res, 400, { code: 'invalid_json', message: 'Request body must be valid JSON' }, requestId, startedAt)
    return
  }

  const { secret, payload } = (body as Record<string, unknown>) ?? {}

  if (typeof secret !== 'string' || !secret) {
    sendApiError(res, 400, { code: 'missing_secret', message: '`secret` field required in body' }, requestId, startedAt)
    return
  }

  const svc = createServiceSupabaseClient()
  const { data, error } = await svc.rpc('fn_workflows_webhook_trigger', {
    p_workflow_id: workflowId,
    p_secret:      secret,
    p_payload:     (payload ?? {}) as Record<string, unknown>,
  })

  if (error) {
    const status = error.message.includes('invalid_webhook_secret') ? 401
      : error.message.includes('not found') ? 404 : 400
    nodeLogger.warn('workflow-webhook-trigger: failed', { workflowId, message: error.message })
    sendApiError(res, status, { code: 'trigger_failed', message: error.message }, requestId, startedAt)
    return
  }

  sendSuccess(res, 200, { run_id: data as string }, requestId, startedAt)
}
