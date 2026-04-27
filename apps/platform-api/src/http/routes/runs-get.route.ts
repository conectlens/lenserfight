import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { sendSuccess } from '../../lib/http'

export async function handleRunsGetRoute(
  req: IncomingMessage,
  res: ServerResponse,
  runId: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const { data, error } = await auth.userClient
    .schema('execution')
    .rpc('fn_get_run_details', { p_run_id: runId })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Run not found')
  }

  sendSuccess(res, 200, {
    id: row.id,
    requestId: row.request_id,
    status: row.status,
    modelId: row.model_id,
    modelKey: row.model_key,
    providerKey: row.provider_key,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    latencyMs: row.latency_ms,
    tokenInput: row.token_input,
    tokenOutput: row.token_output,
    creditCost: row.credit_cost,
    billingStatus: row.billing_status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    artifacts: row.artifacts ?? [],
  }, requestId, startedAt)
}
