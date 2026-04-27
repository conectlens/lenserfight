import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseLensExecuteRequest } from '@lenserfight/api/dto'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { readJson, sendSuccess } from '../../lib/http'
import {
  resolveLens,
  resolveModel,
  validateCloudByokOwnership,
} from '../../lib/execution/helpers'

export async function handleLensesExecuteRoute(
  req: IncomingMessage,
  res: ServerResponse,
  lensIdOrSlug: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const body = parseLensExecuteRequest(await readJson(req))
  const lens = await resolveLens(auth.serviceClient, lensIdOrSlug)
  const model = await resolveModel(auth.serviceClient, body)

  const fundingSource = body.fundingSource ?? 'platform_credit'
  if (fundingSource === 'user_byok_cloud') {
    if (!body.byokKeyRefId) {
      throw new Error('Cloud BYOK requires byokKeyRefId')
    }
    await validateCloudByokOwnership(auth.userClient, body.byokKeyRefId, model.providerKey)
  }

  const { data, error } = await auth.userClient
    .schema('execution')
    .rpc('fn_run_lens_api', {
      p_lens_id: lens.id,
      p_version_id: lens.headVersionId,
      p_model_id: model.id,
      p_inputs: body.params,
      p_funding_source: fundingSource,
      p_byok_key_id: body.byokKeyRefId ?? null,
      p_idempotency_key: body.idempotencyKey ?? null,
    })

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to queue lens execution')
  }

  sendSuccess(res, 202, {
    runId: data as string,
    status: 'queued',
  }, requestId, startedAt)
}
