import { WorkflowExecutionService, SupabaseDelegationHandler } from '@lenserfight/infra/execution'
import { getExecutionProvider } from '@lenserfight/infra/execution'
import { nodeLogger } from '@lenserfight/utils/logger'
import { createServiceSupabaseClient } from '../lib/supabase'

import type { WorkflowNode, WorkflowEdge, WorkflowExecutionContext, NodeResult } from '@lenserfight/infra/execution'

const WORKER_ID = process.env['BATTLE_WORKER_ID'] ?? `worker-${process.pid}`

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
    .schema('lenses')
    .rpc('fn_claim_scheduled_workflow_run', { p_worker_id: WORKER_ID })

  if (claimError) throw claimError

  const claimed = (Array.isArray(claimResult) ? claimResult[0] : claimResult) as ClaimedScheduledRun | undefined
  if (!claimed) return false

  const { run_id, workflow_id } = claimed
  const startedAt = Date.now()

  // Fetch workspace_id for media.objects rows created by media-producing nodes.
  // fn_claim_scheduled_workflow_run doesn't include it, so we look it up once.
  const { data: wfRunRow } = await serviceClient
    .schema('lenses')
    .from('workflow_runs')
    .select('workspace_id')
    .eq('id', run_id)
    .maybeSingle()
  const workspaceId = (wfRunRow as { workspace_id: string | null } | null)?.workspace_id ?? null

  try {
    // Load nodes and edges for the workflow
    const [nodesResult, edgesResult] = await Promise.all([
      serviceClient
        .schema('lenses')
        .from('workflow_nodes')
        .select('id, lens_id, version_id, config')
        .eq('workflow_id', workflow_id)
        .order('ordinal'),
      serviceClient
        .schema('lenses')
        .from('workflow_edges')
        .select('id, source_node_id, target_node_id, source_output_key, target_param_label')
        .eq('workflow_id', workflow_id),
    ])

    if (nodesResult.error) throw nodesResult.error
    if (edgesResult.error) throw edgesResult.error

    const nodes: WorkflowNode[] = (nodesResult.data ?? []).map(mapNode)
    const edges: WorkflowEdge[] = (edgesResult.data ?? []).map(mapEdge)

    const defaultModelId = claimed.global_model_id ?? 'claude-sonnet-4-6'

    const ctx: WorkflowExecutionContext = {
      runId: run_id,
      rootInputs: claimed.context_inputs ?? {},

      // AL-3: wire delegation so delegate_to_agent nodes dispatch real team runs
      delegation: new SupabaseDelegationHandler(serviceClient),

      async resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string> {
        const { data, error } = await serviceClient.schema('lenses').rpc('fn_render_template', {
          p_version_id: versionId ?? null,
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
        await serviceClient
          .schema('lenses')
          .from('workflow_node_results')
          .upsert(
            {
              run_id,
              node_id: nodeId,
              status: result.status,
              output_data: result.outputData ?? null,
              error_message: result.error ?? null,
              started_at: result.status === 'running' ? new Date().toISOString() : undefined,
              completed_at: ['completed', 'failed', 'timed_out', 'cancelled'].includes(result.status)
                ? new Date().toISOString()
                : undefined,
            },
            { onConflict: 'run_id,node_id', ignoreDuplicates: false },
          )

        // AK-1: register media outputs so lf media list / MediaOutputCard can find them.
        // Only fires when we have the ownership context (both may be null for anonymous runs).
        if (result.status === 'completed' && workspaceId && claimed.ai_lenser_id) {
          const od = result.outputData as Record<string, unknown> | undefined
          const mediaType = od?.['mediaType'] as string | undefined
          const url = od?.['url'] as string | undefined
          if (mediaType && ['image', 'video', 'audio'].includes(mediaType) && url) {
            const mimeType = (od?.['mimeType'] as string | undefined) ?? null
            const ext = mimeType?.split('/')[1]?.split('+')[0] ?? mediaType
            await serviceClient
              .schema('media')
              .from('objects')
              .insert({
                workspace_id:    workspaceId,
                owner_lenser_id: claimed.ai_lenser_id,
                external_url:    url,
                mime_type:       mimeType,
                media_type:      mediaType,
                name:            `wf-${run_id.slice(0, 8)}-${nodeId.slice(0, 8)}.${ext}`,
                visibility:      'private',
                lifecycle_state: 'active',
                metadata:        { workflow_run_id: run_id, node_id: nodeId },
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
    await serviceClient.rpc('fn_update_workflow_run_status', {
      p_run_id: run_id,
      p_status: finalStatus,
    })

    nodeLogger.info('scheduled workflow run completed', {
      runId: run_id,
      workflowId: workflow_id,
      status: finalStatus,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await serviceClient.rpc('fn_update_workflow_run_status', {
      p_run_id: run_id,
      p_status: 'failed',
    })
    nodeLogger.error('scheduled workflow run failed', { runId: run_id, workflowId: workflow_id, message })
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
