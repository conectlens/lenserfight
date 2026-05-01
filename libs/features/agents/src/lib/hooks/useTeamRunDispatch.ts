import { agentWorkspaceService, lensesService, workflowsService } from '@lenserfight/data/repositories'
import { WorkflowExecutionService } from '@lenserfight/infra/execution'
import { byokKeyResolver, callProvider } from '@lenserfight/providers'
import type {
  AgentModelProfileRecord,
  AgentWorkflowAssignmentRecord,
  AgentWorkspaceBootstrap,
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

      const ctx: WorkflowExecutionContext = {
        runId: workflowRunId,
        rootInputs,
        signal: controller.signal,

        async resolveLensTemplate(lensId, versionId) {
          if (controller.signal.aborted) return ''
          const version = versionId
            ? await lensesService.getVersionById(versionId)
            : await lensesService.getLatestPublishedVersion(lensId)
          return version?.templateBody ?? ''
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
