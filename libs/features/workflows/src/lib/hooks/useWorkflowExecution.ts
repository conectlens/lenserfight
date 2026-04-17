import { apiKeysService, lensesService, workflowsService } from '@lenserfight/data/repositories'
import { WorkflowExecutionService } from '@lenserfight/infra/execution'
import { byokKeyResolver, callProvider } from '@lenserfight/providers'
import { useCallback, useRef } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import type {
  IExecutionProvider,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
  ExecutionInput,
  ExecutionResult,
} from '@lenserfight/infra/execution'
import type { Provider } from '@lenserfight/providers'
import type { AIModel, FundingSource, LocalKeyMeta } from '@lenserfight/types'

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
  signal?: AbortSignal,
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
        signal,
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
  /** Funding source selected in the builder (platform_credit | user_byok_cloud | user_byok_local) */
  fundingSource?: FundingSource
  /** Selected local BYOK key id (when fundingSource === 'user_byok_local') */
  selectedLocalKeyId?: string | null
  /** Selected cloud BYOK key ref id (when fundingSource === 'user_byok_cloud') */
  selectedKeyRefId?: string | null
  /** Async resolver that decrypts a local BYOK key — from useFundingSource.resolveLocalKey */
  resolveLocalKey?: (keyId: string) => Promise<string>
  /** Local key metadata list — used to resolve provider when model key is an Ollama/local model not in DB */
  localKeys?: LocalKeyMeta[]
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
 * Supports platform_credit, user_byok_cloud, and user_byok_local funding sources.
 * Per-node model overrides are persisted in workflow_nodes.config for CF Worker execution.
 */
export function useWorkflowExecution({
  nodes,
  edges,
  models,
  fundingSource,
  selectedKeyRefId,
  selectedLocalKeyId,
  resolveLocalKey,
  localKeys,
}: UseWorkflowExecutionOptions) {
  const isExecutingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const stopExecution = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const execute = useCallback(
    async (runId: string, globalModelId: string, rootInputs: Record<string, unknown> = {}) => {
      // Guard against StrictMode double-fire
      if (isExecutingRef.current) return
      isExecutingRef.current = true

      const controller = new AbortController()
      abortRef.current = controller

      try {
        // Resolve global model → provider + API key
        // For local BYOK (e.g. Ollama), the model key may not exist in the DB model list.
        // Fall back to deriving the provider from the selected local key's metadata.
        const globalModel = models.find((m) => m.key === globalModelId)
        let providerName: string
        if (globalModel) {
          providerName = globalModel.provider
        } else if (fundingSource === 'user_byok_local' && selectedLocalKeyId && localKeys?.length) {
          const localKey = localKeys.find((k) => k.id === selectedLocalKeyId)
          if (!localKey) throw new Error(`Model not found: ${globalModelId}`)
          providerName = localKey.provider
        } else {
          throw new Error(`Model not found: ${globalModelId}`)
        }
        if (!TEXT_PROVIDERS.has(providerName)) {
          throw new Error(`Browser-side execution is not supported for provider: ${providerName}`)
        }

        // Resolve API key based on funding source
        let apiKey = ''
        if (providerName !== 'ollama') {
          if (fundingSource === 'user_byok_local' && selectedLocalKeyId && resolveLocalKey) {
            apiKey = await resolveLocalKey(selectedLocalKeyId)
          } else if (fundingSource === 'user_byok_cloud') {
            if (!selectedKeyRefId) {
              throw new Error('Select a cloud key before running this workflow.')
            }
            const keys = await apiKeysService.getMyKeys()
            const selectedKey = keys.find((k) => k.id === selectedKeyRefId)
            if (!selectedKey) {
              throw new Error('Selected cloud key was not found. Please pick a key again.')
            }
            if (selectedKey.providerKey !== providerName) {
              throw new Error(`Selected cloud key is for ${selectedKey.providerDisplayName}, but the model uses ${providerName}.`)
            }
            throw new Error(
              'Cloud BYOK workflow execution must run on the platform executor. Use platform credit or a local key for browser execution.'
            )
          } else {
            // platform_credit path for browser execution falls back to configured provider key.
            apiKey = byokKeyResolver.resolve(providerName)
          }
        }

        if (controller.signal.aborted) {
          return {
            runId,
            status: 'cancelled' as const,
            nodeResults: [],
          }
        }

        const globalProvider = createTextExecutionProvider(
          providerName as Exclude<Provider, 'fal'>,
          globalModelId,
          apiKey,
          controller.signal,
        )

        // Map DB records → execution service types.
        // Per-node model/funding config (NodeExecutionConfig) is stored in workflow_nodes.config
        // and read by the CF Worker for server-side execution. Browser execution uses globalProvider.
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
          signal: controller.signal,

          async resolveLensTemplate(lensId: string, versionId?: string | null): Promise<string> {
            if (controller.signal.aborted) return ''
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

        // Execute the DAG using the global provider
        const executionService = new WorkflowExecutionService(globalProvider)
        const result = await executionService.executeWorkflow(execNodes, execEdges, ctx)

        // Mark run as completed or failed
        await workflowsService.updateRunStatus(runId, result.status)

        return result
      } catch (error) {
        if (controller.signal.aborted) {
          return {
            runId,
            status: 'cancelled' as const,
            nodeResults: [],
          }
        }
        throw error
      } finally {
        isExecutingRef.current = false
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [nodes, edges, models, fundingSource, selectedKeyRefId, selectedLocalKeyId, resolveLocalKey, localKeys],
  )

  return { execute, stopExecution }
}
