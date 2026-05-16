import { apiKeysService, lensesService, walletApiClient, workflowsService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import {
  WorkflowExecutionService,
  getExecutionProvider,
  normalizeWorkflowNodeConfigForExecution,
  registerDefaultNodeRunners,
} from '@lenserfight/infra/execution'
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
import type { ContentPart, Provider, ProviderMessage } from '@lenserfight/providers'
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

function buildTextProviderMessages(input: ExecutionInput): ProviderMessage[] {
  const att = input.attachments ?? []
  if (att.length === 0) {
    return [{ role: 'user', content: input.prompt }]
  }
  const parts: ContentPart[] = [{ type: 'text', text: input.prompt }]
  for (const a of att) {
    if (a.kind === 'image') {
      parts.push({ type: 'image', url: a.url, mimeType: a.mimeType })
    } else if (a.kind === 'document') {
      parts.push({
        type: 'document',
        url: a.url,
        mimeType: a.mimeType ?? 'application/octet-stream',
      })
    } else if (a.kind === 'audio') {
      parts.push({ type: 'audio', url: a.url, mimeType: a.mimeType ?? 'audio/mpeg' })
    }
  }
  return [{ role: 'user', content: parts }]
}

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
        buildTextProviderMessages(input),
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
        registerDefaultNodeRunners()

        // Resolve model → provider + API key (per unique model key in the DAG).
        const resolveWorkflowApiKey = async (prov: string): Promise<string> => {
          if (prov === 'ollama') return ''
          if (fundingSource === 'user_byok_local' && selectedLocalKeyId && resolveLocalKey) {
            return resolveLocalKey(selectedLocalKeyId)
          }
          if (fundingSource === 'user_byok_cloud') {
            if (!selectedKeyRefId) {
              throw new Error('Select a cloud key before running this workflow.')
            }
            const keys = await apiKeysService.getMyKeys()
            const selectedKey = keys.find((k) => k.id === selectedKeyRefId)
            if (!selectedKey) {
              throw new Error('Selected cloud key was not found. Please pick a key again.')
            }
            if (selectedKey.providerKey !== prov) {
              throw new Error(
                `Selected cloud key is for ${selectedKey.providerDisplayName}, but this node needs ${prov}.`,
              )
            }
            if (import.meta.env.DEV) {
              return walletApiClient.resolveByokKeyForLocalDev(selectedKeyRefId)
            }
            throw new Error(
              'Cloud BYOK workflow execution must run on the platform executor. Use platform credit or a local key for browser execution.',
            )
          }
          return byokKeyResolver.resolve(prov)
        }

        const providerByModelKey = new Map<string, IExecutionProvider>()

        const getProviderForModelKey = async (modelKey: string): Promise<IExecutionProvider> => {
          const cached = providerByModelKey.get(modelKey)
          if (cached) return cached

          const m = models.find((x) => x.key === modelKey)
          let pn: string
          if (m) {
            pn = m.provider
          } else if (fundingSource === 'user_byok_local' && selectedLocalKeyId && localKeys?.length) {
            const localKey = localKeys.find((k) => k.id === selectedLocalKeyId)
            if (!localKey) throw new Error(`Model not found: ${modelKey}`)
            pn = localKey.provider
          } else {
            throw new Error(`Model not found: ${modelKey}`)
          }

          const isText = TEXT_PROVIDERS.has(pn)
          const isLocalMedia = LOCAL_MEDIA_PROVIDERS.has(pn)
          const allowMedia = fundingSource === 'user_byok_local' || fundingSource === 'platform_credit'
          if (!isText && !(isLocalMedia && allowMedia)) {
            throw new Error(`Browser-side execution is not supported for provider: ${pn}`)
          }

          const apiKey = await resolveWorkflowApiKey(pn)
          const inst: IExecutionProvider = isText
            ? createTextExecutionProvider(pn as Exclude<Provider, 'fal'>, modelKey, apiKey, controller.signal)
            : createRegisteredProviderAdapter(pn, modelKey, apiKey)
          providerByModelKey.set(modelKey, inst)
          return inst
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

        const bootstrapProvider = await getProviderForModelKey(globalModelId)

        // Map DB records → execution service types, preserving per-node config
        // so retry/timeout/merge/moderation hints from the builder flow through.
        const execNodes: WorkflowNode[] = nodes.map((n) => ({
          id: n.id,
          lensId: n.lens_id ?? null,
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
          defaultModelKey: globalModelId,
          signal: controller.signal,
          resolveExecutionProvider: (node) =>
            getProviderForModelKey((node.config?.modelId?.trim() || globalModelId).trim()),

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
            if (result.resolvedInputSnapshot && result.status !== 'streaming' && result.status !== 'running') {
              outputData = {
                ...(outputData ?? {}),
                _wf: {
                  resolvedInputSnapshot: result.resolvedInputSnapshot,
                  providerRoute: result.providerRoute ?? null,
                },
              }
            }
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

        // Execute the DAG — bootstrap provider is unused when resolveExecutionProvider is set
        const executionService = new WorkflowExecutionService(bootstrapProvider)
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
  return normalizeWorkflowNodeConfigForExecution(raw)
}

function readEdgeCondition(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null
  if (typeof raw['type'] !== 'string') return null
  const t = raw['type']
  if (!['equals', 'contains', 'present', 'truthy'].includes(t as string)) return null
  return { type: t as 'equals' | 'contains' | 'present' | 'truthy', value: raw['value'] }
}
