import { WorkflowExecutionService, SupabaseDelegationHandler } from '@lenserfight/infra/execution'
import { getExecutionProvider } from '@lenserfight/infra/execution'
import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

import type { WorkflowNode, WorkflowEdge, WorkflowExecutionContext, NodeResult } from '@lenserfight/infra/execution'
import type { LensInputContract, LensOutputContract } from '@lenserfight/types'

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`

// Z10: retry helper for transient Supabase RPC/network errors. Does NOT retry
// claim operations (those are mutating and non-idempotent).
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isTransientError(err) || attempt === maxAttempts) throw err
      lastErr = err
      const delayMs = Math.min(30_000, 500 * Math.pow(2, attempt))
      await new Promise<void>((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}

function isTransientError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
  const msg = raw.toLowerCase()
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up')
  )
}

interface ClaimedScheduledRun {
  run_id: string
  workflow_id: string
  schedule_id: string | null
  triggered_by: string | null
  context_inputs: Record<string, unknown>
  global_model_id: string | null
  ai_lenser_id: string | null
  battle_id: string | null
  contender_id: string | null
  byok_key_id: string | null
  funding_source: string | null
}

interface DbWorkflowNode {
  id: string
  lens_id: string | null
  version_id: string | null
  config: Record<string, unknown>
}

interface DbWorkflowEdge {
  id: string
  source_node_id: string
  target_node_id: string
  source_output_key: string
  target_param_label: string
}

function mapNode(n: DbWorkflowNode): WorkflowNode {
  return {
    id: n.id,
    lensId: n.lens_id ?? '',
    versionId: n.version_id ?? null,
    config: n.config as WorkflowNode['config'],
  }
}

function mapEdge(e: DbWorkflowEdge): WorkflowEdge {
  return {
    sourceNodeId: e.source_node_id,
    targetNodeId: e.target_node_id,
    sourceOutputKey: e.source_output_key,
    targetParamLabel: e.target_param_label,
  }
}

export async function processNextScheduledWorkflow(): Promise<boolean> {
  const serviceClient = createServiceSupabaseClient()

  const { data: claimResult, error: claimError } = await serviceClient
    .rpc('fn_worker_claim_scheduled_workflow_run', { p_worker_id: WORKER_ID })

  if (claimError) throw claimError

  const claimed = (Array.isArray(claimResult) ? claimResult[0] : claimResult) as ClaimedScheduledRun | undefined
  if (!claimed) return false

  const { run_id, workflow_id } = claimed
  const startedAt = Date.now()

  // BZ: validate BYOK key before dispatching if this is a BYOK-funded battle run
  if (claimed.funding_source === 'user_byok' && claimed.battle_id && claimed.contender_id) {
    const { data: validationData, error: validationError } = await serviceClient.rpc(
      'fn_byok_validate_for_battle',
      { p_battle_id: claimed.battle_id, p_contender_id: claimed.contender_id }
    )
    if (validationError) {
      nodeLogger.error('byok validation rpc error', { runId: run_id, message: validationError.message })
      await serviceClient.rpc('fn_update_workflow_run_status', { p_run_id: run_id, p_status: 'failed' })
      return true
    }
    const validation = (Array.isArray(validationData) ? validationData[0] : validationData) as
      | { valid: boolean; reason: string | null; key_id?: string | null }
      | undefined
    if (!validation?.valid) {
      nodeLogger.error('byok validation failed', {
        runId: run_id,
        battleId: claimed.battle_id,
        reason: validation?.reason ?? 'unknown',
      })
      await serviceClient.rpc('fn_update_workflow_run_status', { p_run_id: run_id, p_status: 'failed' })
      return true
    }
  }

  const { data: wfCtxData } = await serviceClient.rpc('fn_worker_get_workflow_context', {
    p_run_id: run_id,
  })
  const wfCtxRow = (Array.isArray(wfCtxData) ? wfCtxData[0] : wfCtxData) as { workspace_id?: string | null } | null
  const workspaceId: string | null = wfCtxRow?.workspace_id ?? null

  try {
    const graphData = await withRetry(async () => {
      const { data, error } = await serviceClient.rpc('fn_worker_get_workflow_graph', { p_workflow_id: workflow_id })
      if (error) throw error
      return data
    })

    const graph = graphData as { nodes: DbWorkflowNode[]; edges: DbWorkflowEdge[] } | null
    const nodes: WorkflowNode[] = (graph?.nodes ?? []).map(mapNode)
    const edges: WorkflowEdge[] = (graph?.edges ?? []).map(mapEdge)

    const defaultModelId = claimed.global_model_id ?? 'claude-sonnet-4-6'

    const providerByModelKey = new Map<string, ReturnType<typeof getExecutionProvider>>()

    const ctx: WorkflowExecutionContext = {
      runId: run_id,
      rootInputs: claimed.context_inputs ?? {},
      defaultModelKey: defaultModelId,
      delegation: new SupabaseDelegationHandler(serviceClient),

      async resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string> {
        const { data, error } = await serviceClient.rpc('fn_worker_get_lens_template_body', {
          p_lens_id: lensId,
          p_version_id: versionId ?? null,
        })
        if (error) throw new Error(error.message)
        const baseTemplate = (data as string | null) ?? ''
        if (!baseTemplate) {
          throw new Error(`fn_worker_get_lens_template_body returned empty for lens ${lensId}`)
        }

        if (!claimed.ai_lenser_id) return baseTemplate

        const { data: memCtx } = await serviceClient.rpc('fn_build_lenser_prompt_context', {
          p_ai_lenser_id: claimed.ai_lenser_id,
          p_limit: 20,
        })
        return memCtx ? `${memCtx}${baseTemplate}` : baseTemplate
      },

      async resolveVersionContracts(versionId?: string | null) {
        if (!versionId) return { input: null, output: null }
        try {
          const { data, error } = await serviceClient.rpc('fn_get_version_contracts', { p_version_id: versionId })
          if (error) return { input: null, output: null }
          const row = Array.isArray(data) ? data[0] : data
          if (!row) return { input: null, output: null }
          return {
            input: (row.input_contract ?? null) as LensInputContract | null,
            output: (row.output_contract ?? null) as LensOutputContract | null,
          }
        } catch {
          return { input: null, output: null }
        }
      },

      resolveExecutionProvider(node) {
        const modelKey = (node.config?.modelId?.trim() || defaultModelId).trim()
        let p = providerByModelKey.get(modelKey)
        if (!p) {
          p = getExecutionProvider(resolveProviderKey(modelKey))
          providerByModelKey.set(modelKey, p)
        }
        return p
      },

      async onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void> {
        const od = result.outputData as Record<string, unknown> | undefined
        const { error } = await serviceClient.rpc('fn_worker_upsert_node_result', {
          p_run_id: run_id,
          p_node_id: nodeId,
          p_status: result.status,
          p_output_data: od ?? null,
          p_error_message: result.error ?? null,
          p_resolved_input_snapshot: result.resolvedInputSnapshot ?? null,
          p_provider_route: result.providerRoute ?? null,
        })
        if (error) {
          nodeLogger.error('fn_worker_upsert_node_result failed', { runId: run_id, nodeId, message: error.message })
        }

        if (result.status === 'completed' && workspaceId && claimed.ai_lenser_id) {
          const mediaType = od?.['mediaType'] as string | undefined
          const url = od?.['url'] as string | undefined
          if (mediaType && ['image', 'video', 'audio'].includes(mediaType) && url) {
            const mimeType = (od?.['mimeType'] as string | undefined) ?? null
            const ext = mimeType?.split('/')[1]?.split('+')[0] ?? mediaType
            await serviceClient.rpc('fn_worker_insert_workflow_media_object', {
              p_workspace_id: workspaceId,
              p_owner_lenser_id: claimed.ai_lenser_id,
              p_run_id: run_id,
              p_node_id: nodeId,
              p_external_url: url,
              p_mime_type: mimeType ?? '',
              p_media_type: mediaType,
              p_name: `wf-${run_id.slice(0, 8)}-${nodeId.slice(0, 8)}.${ext}`,
            })
          }
        }

        if (
          result.status === 'completed' &&
          claimed.funding_source === 'user_byok' &&
          claimed.byok_key_id &&
          claimed.battle_id
        ) {
          const modelKey = (od?.['model_key'] as string | undefined) ?? claimed.global_model_id ?? 'unknown'
          const tokenCount =
            ((od?.['token_input'] as number | undefined) ?? 0) +
            ((od?.['token_output'] as number | undefined) ?? 0)
          serviceClient
            .rpc('fn_byok_log_usage', {
              p_key_id: claimed.byok_key_id,
              p_battle_id: claimed.battle_id,
              p_model_id: modelKey,
              p_token_count: tokenCount,
            })
            .then(({ error: logErr }) => {
              if (logErr) {
                nodeLogger.error('byok usage log failed', { runId: run_id, message: logErr.message })
              }
            })
        }
      },
    }

    const bootstrapProvider = getExecutionProvider(resolveProviderKey(defaultModelId))
    const service = new WorkflowExecutionService(bootstrapProvider)

    const runResult = await service.executeWorkflow(nodes, edges, ctx)

    const finalStatus = runResult.status === 'completed' ? 'completed' : 'failed'
    await withRetry(async () => {
      await serviceClient.rpc('fn_update_workflow_run_status', {
        p_run_id: run_id,
        p_status: finalStatus,
      })
    })

    nodeLogger.info('scheduled workflow run completed', {
      runId: run_id,
      workflowId: workflow_id,
      status: finalStatus,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    nodeLogger.error('scheduled workflow run failed', { runId: run_id, workflowId: workflow_id, message })
    await withRetry(async () => {
      await serviceClient.rpc('fn_update_workflow_run_status', {
        p_run_id: run_id,
        p_status: 'failed',
      })
    }).catch((statusErr) => {
      nodeLogger.error('could not write failed status for run', {
        runId: run_id,
        message: statusErr instanceof Error ? statusErr.message : String(statusErr),
      })
    })
  }

  return true
}

function resolveProviderKey(modelId: string): string {
  const m = modelId.toLowerCase()
  if (m.includes('fal-ai/') || m.startsWith('fal')) return 'fal-ai'
  if (m.startsWith('claude')) return 'anthropic'
  if (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3')) return 'openai'
  if (m.startsWith('gemini')) return 'google'
  if (m.startsWith('mistral') || m.startsWith('open-mistral')) return 'mistral'
  if (m.startsWith('research') || m.includes('research')) return 'research'
  return 'anthropic'
}
