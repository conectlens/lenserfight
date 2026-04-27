import type { LensExecuteRequest, WorkflowRunRequest } from '@lenserfight/api/contracts'
import type { FundingSource } from '@lenserfight/types'

const FUNDING_SOURCES: FundingSource[] = [
  'platform_credit',
  'user_byok_cloud',
  'user_byok_local',
  'sponsored',
]

export function parseLensExecuteRequest(payload: unknown): LensExecuteRequest {
  const body = (payload ?? {}) as Record<string, unknown>
  const params = body.params
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('`params` must be an object.')
  }

  if (body.fundingSource && !FUNDING_SOURCES.includes(body.fundingSource as FundingSource)) {
    throw new Error('`fundingSource` is invalid.')
  }

  return {
    params: params as Record<string, unknown>,
    modelOverride: typeof body.modelOverride === 'string' ? body.modelOverride : undefined,
    providerOverride: typeof body.providerOverride === 'string' ? body.providerOverride : undefined,
    fundingSource: body.fundingSource as FundingSource | undefined,
    byokKeyRefId: typeof body.byokKeyRefId === 'string' ? body.byokKeyRefId : undefined,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
  }
}

export function parseWorkflowRunRequest(payload: unknown): WorkflowRunRequest {
  const body = (payload ?? {}) as Record<string, unknown>
  const inputs = body.inputs
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw new Error('`inputs` must be an object.')
  }

  return {
    inputs: inputs as Record<string, unknown>,
    modelOverride: typeof body.modelOverride === 'string' ? body.modelOverride : undefined,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
  }
}
