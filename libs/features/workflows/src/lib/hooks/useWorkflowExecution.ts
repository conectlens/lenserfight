import { lensesService, workflowsService } from '@lenserfight/data/repositories'
import { WorkflowExecutionService } from '@lenserfight/infra/execution'
import { byokKeyResolver, callProvider } from '@lenserfight/providers'
import { useCallback, useRef } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
  IExecutionProvider,
  ExecutionInput,
  ExecutionResult,
} from '@lenserfight/infra/execution'
import type { Provider } from '@lenserfight/providers'
import type { AIModel } from '@lenserfight/types'

/** Text-only providers that go through callProvider() from @lenserfight/providers. */
const TEXT_PROVIDERS = new Set<string>(['openai', 'anthropic', 'google', 'mistral', 'ollama'])

/**
 * Creates an IExecutionProvider that wraps callProvider() for text generation.
 * The first arg from WorkflowExecutionService.execute() is the lensId (ignored) —
 * we always use the pre-resolved modelKey + provider.
 */
function createTextExecutionProvider(
  provider: Exclude<Provider, 'fal'>,
  modelKey: string,
  apiKey: string,
): IExecutionProvider {
  return {
    id: provider,
    supportedMediaTypes: ['text'],
    async execute(_lensId: string, input: ExecutionInput): Promise<ExecutionResult> {
      const start = Date.now()
      const response = await callProvider(
        provider,
        apiKey,
        modelKey,
        [{ role: 'user', content: input.prompt }],
        provider === 'anthropic' ? { maxTokens: 4096 } : undefined,
      )
      return {
        mediaType: 'text',
        text: response.content,
        durationMs: Date.now() - start,
        metadata: {
          modelId: modelKey,
          provider,
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
      }
    },
  }
}

interface UseWorkflowExecutionOptions {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  models: AIModel[]
}

/**
 * Browser-side workflow execution orchestrator.
 *
 * Bridges the pure WorkflowExecutionService (Kahn's topo sort + concurrent waves)
 * with Supabase persistence and the provider adapter layer.
 *
 * Data flow:
 *   1. Caller invokes startRun() from useWorkflowRun to seed DB records
 *   2. This hook's execute() resolves lens templates, runs DAG via WorkflowExecutionService
 *   3. Each node status change writes to DB via fn_update_workflow_node_result
 *   4. Supabase Realtime (in useWorkflowRun) picks up changes → UI updates live
 *   5. On completion, run status is updated via fn_update_workflow_run_status
 *
 * Limitation: uses a single global model for all nodes. Per-node model overrides
 * are persisted in workflow_nodes.config for future CF Worker execution.
 */
export function useWorkflowExecution({ nodes, edges, models }: UseWorkflowExecutionOptions) {
  const isExecutingRef = useRef(false)

  const execute = useCallback(
    async (runId: string, globalModelId: string, rootInputs: Record<string, unknown> = {}) => {
      // Guard against StrictMode double-fire
      if (isExecutingRef.current) return
      isExecutingRef.current = true

      try {
        // Resolve global model → provider + API key
        const globalModel = models.find((m) => m.key === globalModelId)
        if (!globalModel) throw new Error(`Model not found: ${globalModelId}`)

        const providerName = globalModel.provider
        if (!TEXT_PROVIDERS.has(providerName)) {
          throw new Error(`Browser-side execution is not supported for provider: ${providerName}`)
        }

        const apiKey = providerName === 'ollama' ? '' : byokKeyResolver.resolve(providerName)
        const provider = createTextExecutionProvider(
          providerName as Exclude<Provider, 'fal'>,
          globalModelId,
          apiKey,
        )

        // Map DB records → execution service types
        const execNodes: WorkflowNode[] = nodes.map((n) => ({
          id: n.id,
          lensId: n.lens_id,
          versionId: n.version_id,
        }))

        const execEdges: WorkflowEdge[] = edges.map((e) => ({
          sourceNodeId: e.source_node_id,
          targetNodeId: e.target_node_id,
          sourceOutputKey: e.source_output_key,
          targetParamLabel: e.target_param_label,
        }))

        // Build execution context with DB callbacks
        const ctx: WorkflowExecutionContext = {
          runId,
          rootInputs,

          async resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string> {
            const version = versionId
              ? await lensesService.getVersionById(versionId)
              : await lensesService.getLatestPublishedVersion(lensId)
            return version?.templateBody ?? ''
          },

          async onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void> {
            await workflowsService.updateNodeResult(
              runId,
              nodeId,
              result.status,
              result.outputData as Record<string, unknown> | undefined,
              result.error,
            )
          },
        }

        // Execute the DAG
        const executionService = new WorkflowExecutionService(provider)
        const result = await executionService.executeWorkflow(execNodes, execEdges, ctx)

        // Mark run as completed or failed
        await workflowsService.updateRunStatus(runId, result.status)

        return result
      } finally {
        isExecutingRef.current = false
      }
    },
    [nodes, edges, models],
  )

  return { execute }
}
