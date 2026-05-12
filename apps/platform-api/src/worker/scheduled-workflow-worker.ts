import { WorkflowExecutionService, SupabaseDelegationHandler } from '@lenserfight/infra/execution'
import { getExecutionProvider } from '@lenserfight/infra/execution'
import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

import type { WorkflowNode, WorkflowEdge, WorkflowExecutionContext, NodeResult } from '@lenserfight/infra/execution'

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

    const ctx: WorkflowExecutionContext = {
      runId: run_id,
      rootInputs: claimed.context_inputs ?? {},

      // AL-3: wire delegation so delegate_to_agent nodes dispatch real team runs
      delegation: new SupabaseDelegationHandler(serviceClient),

      async resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string> {
        const { data, error } = await serviceClient.rpc('fn_worker_render_template', {
          p_template_body: lensId,
          p_inputs: {},
        })
        if (error || !data) throw new Error(error?.message ?? `Failed to resolve template for lens ${lensId}`)
        const baseTemplate = data as string

        if (!claimed.ai_lenser_id) return baseTemplate

        const { data: memCtx } = await serviceClient.rpc('fn_build_lenser_prompt_context', {
          p_ai_lenser_id: claimed.ai_lenser_id,
          p_limit: 20,
        })
        return memCtx ? `${memCtx}${baseTemplate}` : baseTemplate
      },

      async onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void> {
        const od = result.outputData as Record<string, unknown> | undefined
        await serviceClient
          .rpc('fn_worker_upsert_node_result', {
            p_run_id:        run_id,
            p_node_id:       nodeId,
            p_status:        result.status,
            p_output_key:    od ? Object.keys(od)[0] ?? null : null,
            p_output_value:  od ? String(Object.values(od)[0] ?? '') : null,
            p_error_message: result.error ?? null,
            p_model_key:     null,
            p_token_input:   0,
            p_token_output:  0,
          })

        if (result.status === 'completed' && workspaceId && claimed.ai_lenser_id) {
          const mediaType = od?.['mediaType'] as string | undefined
          const url = od?.['url'] as string | undefined
          if (mediaType && ['image', 'video', 'audio'].includes(mediaType) && url) {
            const mimeType = (od?.['mimeType'] as string | undefined) ?? null
            const ext = mimeType?.split('/')[1]?.split('+')[0] ?? mediaType
            await serviceClient
              .rpc('fn_worker_insert_workflow_media_object', {
                p_workspace_id:    workspaceId,
                p_owner_lenser_id: claimed.ai_lenser_id,
                p_external_url:    url,
                p_mime_type:       mimeType ?? '',
                p_media_type:      mediaType,
                p_name:            `wf-${run_id.slice(0, 8)}-${nodeId.slice(0, 8)}.${ext}`,
              })
          }
        }
      },
    }

    // Resolve provider from default model id (e.g. 'claude-sonnet-4-6' → 'anthropic')
    const providerKey = resolveProviderKey(defaultModelId)
    const provider = getExecutionProvider(providerKey)
    const service = new WorkflowExecutionService(provider)

    const runResult = await service.executeWorkflow(nodes, edges, ctx)

    const finalStatus = runResult.status === 'completed' ? 'completed' : 'failed'
    await withRetry(() =>
      serviceClient.rpc('fn_update_workflow_run_status', {
        p_run_id: run_id,
        p_status: finalStatus,
      })
    )

    nodeLogger.info('scheduled workflow run completed', {
      runId: run_id,
      workflowId: workflow_id,
      status: finalStatus,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    nodeLogger.error('scheduled workflow run failed', { runId: run_id, workflowId: workflow_id, message })
    await withRetry(() =>
      serviceClient.rpc('fn_update_workflow_run_status', {
        p_run_id: run_id,
        p_status: 'failed',
      })
    ).catch((statusErr) => {
      nodeLogger.error('could not write failed status for run', {
        runId: run_id,
        message: statusErr instanceof Error ? statusErr.message : String(statusErr),
      })
    })
  }

  return true
}

function resolveProviderKey(modelId: string): string {
  if (modelId.startsWith('claude')) return 'anthropic'
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai'
  if (modelId.startsWith('gemini')) return 'google'
  if (modelId.startsWith('mistral') || modelId.startsWith('open-mistral')) return 'mistral'
  return 'anthropic'
}
