import {
  agentWorkspaceService,
  lensesService,
  memoryService,
  toolsService,
  workflowsService,
} from '@lenserfight/data/repositories'
import { WorkflowExecutionService } from '@lenserfight/infra/execution'
import { byokKeyResolver, callProvider } from '@lenserfight/providers'
import type {
  AgentMemoryEntryRecord,
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentWorkflowAssignmentRecord,
  AgentWorkspaceBootstrap,
  WriteMemoryEntryInput,
} from '@lenserfight/types'
import { useCallback, useRef, useState } from 'react'

import type {
  IExecutionProvider,
  WorkflowEdge,
  WorkflowExecutionContext,
  WorkflowNode,
  WorkflowNodeConfig,
  MergeStrategy,
  NodeResult,
  EngineEvent,
  ExecutionInput,
  ExecutionResult,
} from '@lenserfight/infra/execution'
import type { Provider } from '@lenserfight/providers'

const TEXT_PROVIDERS = new Set<string>(['openai', 'anthropic', 'google', 'mistral', 'ollama'])

const DEFAULT_PROVIDER = 'anthropic'
const DEFAULT_MODEL_KEY = 'claude-3-5-sonnet-20241022'

function resolveProviderAndModel(
  profiles: AgentModelProfileRecord[],
): { providerName: string; modelKey: string } {
  const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0] ?? null
  const providerName = defaultProfile?.provider_key ?? DEFAULT_PROVIDER
  const modelKey = defaultProfile?.model_key ?? DEFAULT_MODEL_KEY
  return { providerName, modelKey }
}

const MEMORY_INJECTION_LIMIT = 5
const MEMORY_WRITE_FIELD = '__lf_memory_writes'

function resolveActiveMemoryProfile(
  profiles: AgentMemoryProfileRecord[],
): AgentMemoryProfileRecord | null {
  if (!profiles || profiles.length === 0) return null
  return profiles.find((p) => p.is_default) ?? profiles[0] ?? null
}

function buildMemoryContextBlock(entries: AgentMemoryEntryRecord[]): string {
  if (entries.length === 0) return ''
  const bullets = entries
    .map((e) => `- (${e.scope}/${e.source}) ${e.content}`)
    .join('\n')
  return `## Context Memory\n${bullets}\n\n`
}

interface ToolEventContext {
  teamRunId: string
  aiLenserId: string
  invocations: Map<string, string>
}

async function routeToolInvocationEvent(
  event: EngineEvent,
  ctx: ToolEventContext,
): Promise<void> {
  const eventName = event.name as string
  if (!eventName?.startsWith?.('tool_invocation_')) return
  const meta = (event.metadata ?? {}) as Record<string, unknown>
  const callId = typeof meta['callId'] === 'string' ? (meta['callId'] as string) : null
  if (!callId) return

  try {
    if (eventName === 'tool_invocation_started') {
      const toolId = typeof meta['toolId'] === 'string' ? (meta['toolId'] as string) : null
      if (!toolId) return
      const invocationId = await toolsService.invokeTool({
        team_run_id: ctx.teamRunId,
        tool_id: toolId,
        ai_lenser_id: ctx.aiLenserId,
        input: (meta['input'] as Record<string, unknown>) ?? {},
        agent_run_step_id:
          typeof meta['stepId'] === 'string' ? (meta['stepId'] as string) : null,
      })
      ctx.invocations.set(callId, invocationId)
      return
    }

    const invocationId = ctx.invocations.get(callId)
    if (!invocationId) return

    if (eventName === 'tool_invocation_completed') {
      await toolsService.completeInvocation({
        invocation_id: invocationId,
        status: 'completed',
        output: (meta['output'] as Record<string, unknown>) ?? null,
        cost_estimate:
          typeof meta['cost'] === 'number' ? (meta['cost'] as number) : null,
      })
    } else if (eventName === 'tool_invocation_failed') {
      await toolsService.completeInvocation({
        invocation_id: invocationId,
        status: 'failed',
        error: typeof meta['error'] === 'string' ? (meta['error'] as string) : 'unknown',
      })
    }
  } catch {
    // tool invocation persistence is best-effort
  }
}

function extractMemoryWrites(
  outputData: Record<string, unknown> | undefined,
  profileId: string,
  teamRunId: string,
): WriteMemoryEntryInput[] {
  if (!outputData) return []
  const raw = (outputData as Record<string, unknown>)[MEMORY_WRITE_FIELD]
  if (!Array.isArray(raw)) return []
  const writes: WriteMemoryEntryInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const content = typeof obj['content'] === 'string' ? (obj['content'] as string) : null
    if (!content) continue
    const scope = (obj['scope'] as WriteMemoryEntryInput['scope']) ?? 'project'
    const source = (obj['source'] as WriteMemoryEntryInput['source']) ?? 'agent'
    writes.push({
      profile_id: profileId,
      scope,
      source,
      content,
      confidence:
        typeof obj['confidence'] === 'number'
          ? (obj['confidence'] as number)
          : 0.5,
      expires_at: typeof obj['expires_at'] === 'string' ? (obj['expires_at'] as string) : null,
      team_run_id: teamRunId,
      metadata: (obj['metadata'] as Record<string, unknown>) ?? {},
    })
  }
  return writes
}

function createTextProvider(
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

export interface TeamRunDispatchInput {
  assignment: AgentWorkflowAssignmentRecord
  bootstrap: AgentWorkspaceBootstrap
  rootInputs?: Record<string, unknown>
}

export interface TeamRunDispatchResult {
  teamRunId: string
  workflowRunId: string
  status: 'running' | 'pending_approval'
}

export function useTeamRunDispatch() {
  const [isPending, setIsPending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const dispatch = useCallback(
    async (input: TeamRunDispatchInput): Promise<TeamRunDispatchResult> => {
      const { assignment, bootstrap, rootInputs = {} } = input

      if (!assignment.is_active) {
        throw new Error('Cannot dispatch: workflow assignment is inactive.')
      }

      const approvalRequired =
        Boolean(assignment.approval_policy?.['require_approval']) ||
        Boolean(assignment.approval_policy?.['requiresApproval'])

      const workflowRunRecord = await workflowsService.startRun(
        assignment.workflow_id,
        rootInputs,
      )

      const teamRun = await agentWorkspaceService.createTeamRun({
        ai_lenser_id: bootstrap.ai_lenser_id,
        workflow_id: assignment.workflow_id,
        workflow_run_id: workflowRunRecord.id,
        workflow_assignment_id: assignment.id,
        team_id: assignment.assignee_kind === 'team' ? assignment.assignee_team_id : null,
        approval_status: approvalRequired ? 'pending' : 'not_required',
      })

      await agentWorkspaceService.appendTeamRunEvent(teamRun.id, 'dispatch_queued', {
        workflow_id: assignment.workflow_id,
        workflow_run_id: workflowRunRecord.id,
        triggered_by: 'manual',
        requires_approval: approvalRequired,
      })

      if (approvalRequired) {
        return { teamRunId: teamRun.id, workflowRunId: workflowRunRecord.id, status: 'pending_approval' }
      }

      setIsPending(true)
      const controller = new AbortController()
      abortRef.current = controller

      const [nodes, edges] = await Promise.all([
        workflowsService.getNodes(assignment.workflow_id),
        workflowsService.getEdges(assignment.workflow_id),
      ])

      const { providerName, modelKey } = resolveProviderAndModel(bootstrap.profiles.models)

      if (!TEXT_PROVIDERS.has(providerName)) {
        await agentWorkspaceService.updateTeamRunStatus(
          teamRun.id,
          'failed',
          new Date().toISOString(),
        )
        throw new Error(`Provider '${providerName}' is not supported for browser-side agent dispatch.`)
      }

      let apiKey = ''
      try {
        apiKey = byokKeyResolver.resolve(providerName)
      } catch {
        await agentWorkspaceService.updateTeamRunStatus(
          teamRun.id,
          'failed',
          new Date().toISOString(),
        )
        throw new Error(
          `No API key configured for provider '${providerName}'. Configure a platform key to run agent workflows.`,
        )
      }

      const execNodes: WorkflowNode[] = nodes.map((n) => ({
        id: n.id,
        lensId: n.lens_id,
        versionId: n.version_id ?? null,
        config: n.config ? (n.config as WorkflowNodeConfig) : undefined,
      }))

      const execEdges: WorkflowEdge[] = edges.map((e) => ({
        sourceNodeId: e.source_node_id,
        targetNodeId: e.target_node_id,
        sourceOutputKey: e.source_output_key,
        targetParamLabel: e.target_param_label,
        mergeStrategy: (e.merge_strategy ?? null) as MergeStrategy | null,
        condition: null,
      }))

      const teamRunId = teamRun.id
      const workflowRunId = workflowRunRecord.id

      const activeMemoryProfile = resolveActiveMemoryProfile(bootstrap.profiles.memory ?? [])
      const pendingMemoryWrites: WriteMemoryEntryInput[] = []
      const toolInvocations = new Map<string, string>()

      const ctx: WorkflowExecutionContext = {
        runId: workflowRunId,
        rootInputs,
        signal: controller.signal,

        async resolveLensTemplate(lensId, versionId) {
          if (controller.signal.aborted) return ''
          const version = versionId
            ? await lensesService.getVersionById(versionId)
            : await lensesService.getLatestPublishedVersion(lensId)
          const baseTemplate = version?.templateBody ?? ''
          if (!activeMemoryProfile) return baseTemplate
          try {
            const entries = await memoryService.readMemoryEntries({
              profile_id: activeMemoryProfile.id,
              scope: 'project',
              limit: MEMORY_INJECTION_LIMIT,
              team_run_id: teamRunId,
            })
            if (entries.length === 0) return baseTemplate
            agentWorkspaceService
              .appendTeamRunEvent(teamRunId, 'memory_injected', {
                profile_id: activeMemoryProfile.id,
                entry_count: entries.length,
              })
              .catch(() => undefined)
            return `${buildMemoryContextBlock(entries)}${baseTemplate}`
          } catch {
            return baseTemplate
          }
        },

        async onNodeStatusChange(nodeId: string, result: NodeResult) {
          await workflowsService.updateNodeResult(
            workflowRunId,
            nodeId,
            result.status,
            result.outputData as Record<string, unknown> | undefined,
            result.error,
            { retryCount: result.attempts ?? null },
          )
          if (
            activeMemoryProfile &&
            result.status === 'completed' &&
            result.outputData
          ) {
            const writes = extractMemoryWrites(
              result.outputData,
              activeMemoryProfile.id,
              teamRunId,
            )
            if (writes.length > 0) pendingMemoryWrites.push(...writes)
          }
          try {
            await agentWorkspaceService.upsertAgentRunStep({
              team_run_id: teamRunId,
              workflow_node_id: nodeId,
              lane: 0,
              title: `Node ${nodeId.slice(0, 8)}`,
              status: result.status,
              current_task: result.status === 'running' ? 'Executing...' : null,
              recent_output_summary:
                result.status === 'completed' && result.outputData
                  ? JSON.stringify(result.outputData).slice(0, 200)
                  : null,
              blocker_summary: result.error ?? null,
              started_at: result.status === 'running' ? new Date().toISOString() : null,
              completed_at:
                result.status === 'completed' || result.status === 'failed'
                  ? new Date().toISOString()
                  : null,
            })
          } catch {
            // step persistence is best-effort
          }
        },

        async onEvent(event: EngineEvent) {
          try {
            await agentWorkspaceService.appendTeamRunEvent(teamRunId, event.name, {
              nodeId: event.nodeId,
              ...(event.metadata ?? {}),
            })
          } catch {
            // event persistence is best-effort
          }
          await routeToolInvocationEvent(event, {
            teamRunId,
            aiLenserId: bootstrap.ai_lenser_id,
            invocations: toolInvocations,
          })
        },
      }

      const globalProvider = createTextProvider(
        providerName as Exclude<Provider, 'fal'>,
        modelKey,
        apiKey,
        controller.signal,
      )

      const executionService = new WorkflowExecutionService(globalProvider)

      try {
        const runResult = await executionService.executeWorkflow(execNodes, execEdges, ctx)
        const finalStatus = runResult.status === 'completed' ? 'completed' : 'failed'
        await agentWorkspaceService.updateTeamRunStatus(
          teamRunId,
          finalStatus,
          new Date().toISOString(),
        )
        await agentWorkspaceService.appendTeamRunEvent(teamRunId, `run_${finalStatus}`, {
          workflow_run_id: workflowRunId,
        })
        if (finalStatus === 'completed') {
          agentWorkspaceService
            .triggerPostRunEvaluations(assignment.workflow_id, teamRunId)
            .catch(() => undefined)

          if (activeMemoryProfile && pendingMemoryWrites.length > 0) {
            const writes = pendingMemoryWrites.splice(0, pendingMemoryWrites.length)
            const writeCount = writes.length
            Promise.all(writes.map((entry) => memoryService.writeMemoryEntry(entry)))
              .then(() =>
                agentWorkspaceService.appendTeamRunEvent(teamRunId, 'memory_committed', {
                  profile_id: activeMemoryProfile.id,
                  write_count: writeCount,
                }),
              )
              .catch(() => undefined)
          }
        }
      } catch (err) {
        await agentWorkspaceService.updateTeamRunStatus(
          teamRunId,
          'failed',
          new Date().toISOString(),
        ).catch(() => undefined)
        await agentWorkspaceService.appendTeamRunEvent(teamRunId, 'run_failed', {
          error: err instanceof Error ? err.message : String(err),
        }).catch(() => undefined)
        throw err
      } finally {
        setIsPending(false)
        abortRef.current = null
      }

      return { teamRunId, workflowRunId, status: 'running' }
    },
    [],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  return { dispatch, isPending, abort }
}
