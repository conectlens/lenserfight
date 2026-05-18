import type { FundingSource } from '@lenserfight/types'

export interface ExecutionPlanNodeShape {
  id: string
  /** workflow_nodes.config JSON (may include `model_id` from DB). */
  config?: Record<string, unknown> | null
}

/** Minimal model descriptor for pre-flight checks in the browser executor. */
export interface ExecutionPlanModel {
  key: string
  provider: string
}

const TEXT_PROVIDERS = new Set<string>(['openai', 'anthropic', 'google', 'mistral', 'ollama'])
const LOCAL_MEDIA = new Set<string>(['fal-ai'])

export interface ExecutionPlanIssue {
  code: string
  message: string
  nodeId?: string
}

/**
 * Validates that every node model override + default model can run under the
 * selected funding mode in the browser (text + allowed media providers).
 */
export function validateBrowserExecutionPlan(
  nodes: ExecutionPlanNodeShape[],
  defaultModelKey: string,
  models: ExecutionPlanModel[],
  fundingSource: FundingSource | undefined,
): { ok: boolean; errors: ExecutionPlanIssue[] } {
  const errors: ExecutionPlanIssue[] = []
  const allowMedia = fundingSource === 'user_byok_local' || fundingSource === 'platform_credit'

  const resolveProvider = (modelKey: string): string | null => {
    const m = models.find((x) => x.key === modelKey)
    return m?.provider ?? null
  }

  const checkModel = (modelKey: string, nodeId?: string) => {
    const pn = resolveProvider(modelKey)
    if (!pn) {
      errors.push({
        code: 'unknown_model',
        message: `Unknown or unsupported model key "${modelKey}".`,
        nodeId,
      })
      return
    }
    const okText = TEXT_PROVIDERS.has(pn)
    const okMedia = LOCAL_MEDIA.has(pn) && allowMedia
    if (!okText && !okMedia) {
      errors.push({
        code: 'unsupported_provider',
        message: `Provider "${pn}" is not supported for browser workflow execution with the current funding source.`,
        nodeId,
      })
    }
  }

  checkModel(defaultModelKey)
  for (const n of nodes) {
    const raw = n.config ?? undefined
    const mk =
      (typeof raw?.['model_id'] === 'string' && raw['model_id'].trim()) ||
      (typeof raw?.['modelId'] === 'string' && (raw['modelId'] as string).trim()) ||
      ''
    if (mk && mk !== defaultModelKey) checkModel(mk, n.id)
  }

  return { ok: errors.length === 0, errors }
}
