import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseWorkflowRunRequest } from '@lenserfight/api/dto'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { readJson, sendSuccess } from '../../lib/http'

export async function handleWorkflowRunRoute(
  req: IncomingMessage,
  res: ServerResponse,
  workflowId: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const body = parseWorkflowRunRequest(await readJson(req))

  const { data, error } = await auth.userClient.rpc('fn_start_workflow_run', {
    p_workflow_id: workflowId,
    p_inputs: body.inputs,
    p_global_model_id: body.modelOverride ?? null,
    p_idempotency_key: body.idempotencyKey ?? null,
  })

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to queue workflow run')
  }

  sendSuccess(res, 202, {
    runId: data as string,
    workflowId,
    status: 'queued',
  }, requestId, startedAt)
}
