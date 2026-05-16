import { apiKeysService, lensesService, walletApiClient, workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { WorkflowExecutionService, getExecutionProvider } from '@lenserfight/infra/execution'
import { createWorkflowModerationGateway } from '@lenserfight/infra/moderation'
import { byokKeyResolver, callProvider } from '@lenserfight/providers'
import { mapEngineEventToSse, WorkflowEventType } from '@lenserfight/types'
import { useCallback, useRef } from 'react'

import { persistNodeMediaArtifact } from '../execution/persistNodeMedia'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import type {
  IExecutionProvider,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionContext,
  NodeResult,
  ExecutionInput,
  ExecutionResult,
  MergeStrategy,
  WorkflowNodeConfig,
} from '@lenserfight/infra/execution'
import type { Provider } from '@lenserfight/providers'
import type {
  AIModel,
  FundingSource,
  LensInputContract,
  LensOutputContract,
  LocalKeyMeta,
} from '@lenserfight/types'

/** Text-only providers that go through callProvider() from @lenserfight/providers. */
const TEXT_PROVIDERS = new Set<string>(['openai', 'anthropic', 'google', 'mistral', 'ollama'])
/** Media providers the browser executor is allowed to call when user_byok_local is selected. */
const LOCAL_MEDIA_PROVIDERS = new Set<string>(['fal-ai'])

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

/**
 * Wraps a registered infra/execution provider (e.g. FalAIProvider) so that the
 * modelKey and BYOK API key are captured in closure, matching the browser
 * calling convention where execute() is called with the lensId as first arg.
 */
function createRegisteredProviderAdapter(
  providerId: string,
  modelKey: string,
  apiKey: string,
): IExecutionProvider {
  const base = getExecutionProvider(providerId)
  return {
    id: base.id,
    supportedMediaTypes: base.supportedMediaTypes,
    execute(_lensId: string, input: ExecutionInput, signal?: AbortSignal) {
      return base.execute(modelKey, { ...input, params: { ...(input.params ?? {}), apiKey } }, signal)
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
  /**
   * When true, engage ContentModerationService as the workflow moderation
   * gateway. Defaults to true — turn off explicitly if a workflow disables
   * moderation via `config.moderation = 'off'` on every node.
   */
  enableModeration?: boolean
  /**
   * Active workspace id. When provided, the hook uploads any media artifacts
   * produced by nodes (PDFs, images, etc.) to `media.objects` so the run
   * survives a page refresh. Without a workspace id, media stays in-memory.
   */
  workspaceId?: string | null
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
  enableModeration = true,
  workspaceId,
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

      // Per-node monotonic delta index. Used by `node.stream.delta` so the
      // client reducer can assemble chunks even if SSE frames arrive out of
      // order or the transport retransmits.
      const deltaIndexByNode = new Map<string, number>()

      try {
        const appendRunEventSafe = async (
          type: string,
          payload: Record<string, unknown> = {},
        ) => {
          try {
            await workflowsService.appendRunEvent(runId, type, { runId, ...payload })
          } catch {
            // Observability is best-effort and must never break execution.
          }
        }
        await appendRunEventSafe(WorkflowEventType.RUN_STARTED, { status: 'starting' })
        await appendRunEventSafe(WorkflowEventType.RUN_STATUS_CHANGED, { status: 'running' })

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

        const isTextProvider = TEXT_PROVIDERS.has(providerName)
        const isLocalMediaProvider = LOCAL_MEDIA_PROVIDERS.has(providerName)
        const allowMedia = fundingSource === 'user_byok_local' || fundingSource === 'platform_credit'

        if (!isTextProvider && !(isLocalMediaProvider && allowMedia)) {
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
            if (import.meta.env.DEV) {
              // Local dev: resolve cloud vault key client-side, set apiKey so the provider
              // call below works identically to user_byok_local.
              // This branch is tree-shaken away in production builds (Vite replaces DEV=false).
              apiKey = await walletApiClient.resolveByokKeyForLocalDev(selectedKeyRefId)
            } else {
              throw new Error(
                'Cloud BYOK workflow execution must run on the platform executor. Use platform credit or a local key for browser execution.'
              )
            }
          } else {
            // platform_credit path for browser execution falls back to configured provider key.
            apiKey = byokKeyResolver.resolve(providerName)
          }
        }

        if (controller.signal.aborted) {
          await appendRunEventSafe(WorkflowEventType.RUN_CANCELLED, { status: 'cancelled' })
          await appendRunEventSafe(WorkflowEventType.RUN_STATUS_CHANGED, { status: 'cancelled' })
          return {
            runId,
            status: 'cancelled' as const,
            nodeResults: [],
          }
        }

        const globalProvider: IExecutionProvider = isTextProvider
          ? createTextExecutionProvider(
              providerName as Exclude<Provider, 'fal'>,
              globalModelId,
              apiKey,
              controller.signal,
            )
          : createRegisteredProviderAdapter(providerName, globalModelId, apiKey)

        // Map DB records → execution service types, preserving per-node config
        // so retry/timeout/merge/moderation hints from the builder flow through.
        const execNodes: WorkflowNode[] = nodes.map((n) => ({
          id: n.id,
          lensId: n.lens_id,
          versionId: n.version_id,
          config: readNodeConfig(n.config),
        }))

        const execEdges: WorkflowEdge[] = edges.map((e) => ({
          sourceNodeId: e.source_node_id,
          targetNodeId: e.target_node_id,
          sourceOutputKey: e.source_output_key,
          targetParamLabel: e.target_param_label,
          mergeStrategy: (e.merge_strategy ?? null) as MergeStrategy | null,
          condition: readEdgeCondition(e.condition),
        }))

        const moderation = enableModeration ? createWorkflowModerationGateway() : undefined

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

          async resolveVersionContracts(versionId?: string | null) {
            if (!versionId) return { input: null, output: null }
            try {
              const { data } = await supabase.rpc('fn_get_version_contracts', { p_version_id: versionId })
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

          async onNodeStatusChange(nodeId: string, result: NodeResult): Promise<void> {
            // When a node produces durable media (PDF / image / video), upload
            // the blob to media.objects so the artifact survives a page refresh.
            // Failures here are non-fatal: we still persist the node result
            // with the transient URL so the UI can show a best-effort preview.
            let outputData = result.outputData as Record<string, unknown> | undefined
            if (
              result.status === 'completed' &&
              result.envelope?.media?.url &&
              workspaceId &&
              (result.envelope.media.url.startsWith('blob:') ||
                result.envelope.media.url.startsWith('data:'))
            ) {
              try {
                const obj = await persistNodeMediaArtifact({
                  envelope: result.envelope,
                  runId,
                  nodeId,
                  workspaceId,
                })
                if (obj) {
                  outputData = {
                    ...(outputData ?? {}),
                    media: {
                      ...((outputData?.['media'] as Record<string, unknown> | undefined) ?? {}),
                      objectId: obj.id,
                      bucket: obj.bucket,
                      objectKey: obj.objectKey,
                      mime: obj.mimeType,
                      bytes: obj.byteSize,
                    },
                  }
                }
              } catch (err) {
                console.warn('[useWorkflowExecution] persistNodeMediaArtifact failed', err)
              }
            }

            await workflowsService.updateNodeResult(
              runId,
              nodeId,
              result.status,
              outputData,
              result.error,
              {
                retryCount: result.attempts ?? null,
                waitingReason: result.waitingReason ?? null,
              },
            )
          },
          async onPartialOutput(nodeId, partial) {
            // Stream partial text into workflow_node_results so the progress panel
            // can render incremental output while the node is still running.
            // Status `streaming` replaces the previous `running` so the run-level
            // state machine can observe first-token-out (§5 node state machine).
            await workflowsService.updateNodeResult(runId, nodeId, 'streaming', {
              mediaType: 'text',
              output: partial.text,
              text: partial.text,
              streaming: true,
            })
            const deltaIndex = nextDeltaIndex(deltaIndexByNode, nodeId)
            await appendRunEventSafe(WorkflowEventType.NODE_STREAM_DELTA, {
              nodeId,
              deltaIndex,
              text: partial.text,
              kind: 'text',
              // Legacy alias kept so older subscribers that still watch
              // `payload.delta` do not break while we migrate clients.
              delta: partial.text,
            })
          },

          async onEvent(event) {
            await appendRunEventSafe(mapEngineEventToSse(event.name), {
              nodeId: event.nodeId,
              ...(event.metadata ?? {}),
            })
          },

          async onProvenance(handoff) {
            // Persist field-level data lineage. Best-effort — failures here
            // never break execution.
            try {
              await workflowsService.recordRunProvenance({
                sourceRunId: handoff.sourceRunId,
                sourceNodeId: handoff.sourceNodeId,
                sourceOutputPath: handoff.sourceOutputPath,
                targetRunId: handoff.targetRunId,
                targetNodeId: handoff.targetNodeId,
                targetInputPath: handoff.targetInputPath,
                transform: handoff.transform ?? null,
              })
            } catch {
              // observability is best-effort
            }
          },

          moderation,
        }

        // Execute the DAG using the global provider
        const executionService = new WorkflowExecutionService(globalProvider)
        const result = await executionService.executeWorkflow(execNodes, execEdges, ctx)

        // Mark run as completed or failed
        await workflowsService.updateRunStatus(runId, result.status)
        await appendRunEventSafe(resultStatusToRunEvent(result.status), { status: result.status })
        await appendRunEventSafe(WorkflowEventType.RUN_STATUS_CHANGED, { status: result.status })

        return result
      } catch (error) {
        if (controller.signal.aborted) {
          try {
            await workflowsService.appendRunEvent(runId, WorkflowEventType.RUN_CANCELLED, {
              runId,
              status: 'cancelled',
            })
            await workflowsService.appendRunEvent(runId, WorkflowEventType.RUN_STATUS_CHANGED, {
              runId,
              status: 'cancelled',
            })
          } catch {
            // best-effort
          }
          return {
            runId,
            status: 'cancelled' as const,
            nodeResults: [],
          }
        }
        try {
          await workflowsService.appendRunEvent(runId, WorkflowEventType.RUN_FAILED, {
            runId,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          })
          await workflowsService.appendRunEvent(runId, WorkflowEventType.RUN_STATUS_CHANGED, {
            runId,
            status: 'failed',
          })
        } catch {
          // best-effort
        }
        throw error
      } finally {
        isExecutingRef.current = false
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [nodes, edges, models, fundingSource, selectedKeyRefId, selectedLocalKeyId, resolveLocalKey, localKeys, enableModeration, workspaceId],
  )

  return { execute, stopExecution }
}

/**
 * Allocate the next monotonic delta index for a given node. The engine guarantees
 * that partial outputs for a single node are consumed sequentially inside one
 * hook instance; we rely on the Map mutation ordering here.
 */
function nextDeltaIndex(store: Map<string, number>, nodeId: string): number {
  const n = (store.get(nodeId) ?? -1) + 1
  store.set(nodeId, n)
  return n
}

/**
 * Map the engine-level terminal run status onto the canonical SSE run event.
 */
function resultStatusToRunEvent(status: 'completed' | 'failed' | 'cancelled'): WorkflowEventType {
  switch (status) {
    case 'completed':
      return WorkflowEventType.RUN_COMPLETED
    case 'failed':
      return WorkflowEventType.RUN_FAILED
    case 'cancelled':
      return WorkflowEventType.RUN_CANCELLED
  }
}

function readNodeConfig(raw: Record<string, unknown> | null | undefined): WorkflowNodeConfig | undefined {
  if (!raw) return undefined
  const cfg: WorkflowNodeConfig = {}
  if (raw['retry'] && typeof raw['retry'] === 'object') cfg.retry = raw['retry'] as WorkflowNodeConfig['retry']
  if (typeof raw['timeoutMs'] === 'number') cfg.timeoutMs = raw['timeoutMs'] as number
  if (typeof raw['onParentFailure'] === 'string') cfg.onParentFailure = raw['onParentFailure'] as WorkflowNodeConfig['onParentFailure']
  if (typeof raw['merge'] === 'string') cfg.merge = raw['merge'] as MergeStrategy
  if (typeof raw['moderation'] === 'string') cfg.moderation = raw['moderation'] as WorkflowNodeConfig['moderation']
  return Object.keys(cfg).length ? cfg : undefined
}

function readEdgeCondition(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null
  if (typeof raw['type'] !== 'string') return null
  const t = raw['type']
  if (!['equals', 'contains', 'present', 'truthy'].includes(t as string)) return null
  return { type: t as 'equals' | 'contains' | 'present' | 'truthy', value: raw['value'] }
}
