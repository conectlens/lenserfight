import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeLogger } from '@lenserfight/utils/logger'
import { getBearerToken, readJson, sendApiError, sendSuccess } from '../../lib/http'
import { createUserSupabaseClient } from '../../lib/supabase'

// GET /admin/vote-anomalies?status=pending|resolved|all
export async function handleGetVoteAnomalies(
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const token = getBearerToken(req)
  if (!token) {
    sendApiError(res, 401, { code: 'unauthenticated', message: 'Bearer token required' }, requestId, startedAt)
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const status = url.searchParams.get('status') ?? 'pending'
  const battleId = url.searchParams.get('battle_id') ?? null

  const client = createUserSupabaseClient(token)

  let query = client.from('vote_anomalies').select('*')

  if (status === 'pending') {
    query = query.is('resolved_at', null)
  } else if (status === 'resolved') {
    query = query.not('resolved_at', 'is', null)
  }

  if (battleId) {
    query = query.eq('battle_id', battleId)
  }

  query = query.order('detected_at', { ascending: false }).limit(100)

  const { data, error } = await query
  if (error) {
    nodeLogger.warn('admin-moderation: get vote anomalies failed', { message: error.message })
    sendApiError(res, 400, { code: 'query_failed', message: error.message }, requestId, startedAt)
    return
  }

  sendSuccess(res, 200, { anomalies: data ?? [] }, requestId, startedAt)
}

// POST /admin/vote-anomalies/:id/resolve
export async function handleResolveVoteAnomaly(
  req: IncomingMessage,
  res: ServerResponse,
  anomalyId: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const token = getBearerToken(req)
  if (!token) {
    sendApiError(res, 401, { code: 'unauthenticated', message: 'Bearer token required' }, requestId, startedAt)
    return
  }

  await readJson(req) // consume body

  const client = createUserSupabaseClient(token)
  const { error } = await client.rpc('fn_resolve_vote_anomaly', {
    p_anomaly_id: anomalyId,
  })

  if (error) {
    const status = error.message.includes('Forbidden') ? 403
      : error.message.includes('not found') ? 404 : 400
    sendApiError(res, status, { code: 'resolve_failed', message: error.message }, requestId, startedAt)
    return
  }

  sendSuccess(res, 200, { resolved: true, anomaly_id: anomalyId }, requestId, startedAt)
}
