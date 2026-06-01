import type { SupabaseLikeRpcClient } from './client'
import type {
  SdkWorkflowDetail,
  SdkWorkflowRun,
  SdkWorkflowRunLog,
  SdkWorkflowRunState,
  SdkWorkflowSummary,
} from './types/workflows'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const DEFAULT_POLL_INTERVAL_MS = 3_000
const DEFAULT_TIMEOUT_MS = 120_000

export class WorkflowClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * List workflows visible to the authenticated user.
   */
  async browse(options?: {
    limit?: number
    offset?: number
    visibility?: string
  }): Promise<SdkWorkflowSummary[]> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_workflow_list', {
      p_limit: options?.limit ?? 20,
      p_offset: options?.offset ?? 0,
      p_visibility: options?.visibility ?? null,
      p_lenser_id: null,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_workflow_list failed — ${JSON.stringify(error)}`)
    }
    const rows = (data as { data?: unknown[] } | null)?.data
    return Array.isArray(rows) ? (rows as SdkWorkflowSummary[]) : []
  }

  /**
   * Get a single workflow by ID.
   */
  async getById(workflowId: string): Promise<SdkWorkflowDetail | null> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_workflow_get', {
      p_workflow_id: workflowId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_workflow_get failed — ${JSON.stringify(error)}`)
    }
    return (data as SdkWorkflowDetail | null) ?? null
  }

  /**
   * Start a workflow run. Returns immediately with a run ID and `pending` status.
   * The workflow executes asynchronously — use `getRunStatus` to poll or
   * `awaitRun` to block until completion.
   *
   * Requires an authenticated client (`apiKey` in `createClient`).
   */
  async startRun(
    workflowId: string,
    inputs?: Record<string, unknown>,
    options?: { idempotencyKey?: string; modelId?: string },
  ): Promise<SdkWorkflowRun> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_workflow_run_start', {
      p_workflow_id: workflowId,
      p_inputs: inputs ?? {},
      p_global_model_id: options?.modelId ?? null,
      p_idempotency_key: options?.idempotencyKey ?? null,
      p_metadata: {},
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_workflow_run_start failed — ${JSON.stringify(error)}`)
    }
    if (!data) {
      throw new Error(`@lenserfight/sdk: workflow ${workflowId} not found or inaccessible`)
    }
    return data as SdkWorkflowRun
  }

  /**
   * Get the current status of a workflow run.
   */
  async getRunStatus(runId: string): Promise<SdkWorkflowRunState> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_workflow_run_status', {
      p_run_id: runId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_workflow_run_status failed — ${JSON.stringify(error)}`)
    }
    if (!data) {
      throw new Error(`@lenserfight/sdk: run ${runId} not found`)
    }
    const row = data as Record<string, unknown>
    return {
      id: row['id'] as string,
      status: row['status'] as SdkWorkflowRunState['status'],
      activeNodeId: (row['active_node_id'] as string | null) ?? null,
      creditsSpent: (row['credits_spent'] as number) ?? 0,
    }
  }

  /**
   * Get per-node execution logs for a completed run.
   */
  async getRunLogs(runId: string): Promise<SdkWorkflowRunLog[]> {
    const { data, error } = await this.rpcClient.rpc('fn_mcp_workflow_run_logs', {
      p_run_id: runId,
    })
    if (error) {
      throw new Error(`@lenserfight/sdk: fn_mcp_workflow_run_logs failed — ${JSON.stringify(error)}`)
    }
    const rows = (data as { node_results?: unknown[] } | null)?.node_results
    if (!Array.isArray(rows)) return []
    return rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        nodeId: row['node_id'] as string,
        status: row['status'] as string,
        result: row['result'] ?? null,
        error: (row['error'] as string | null) ?? null,
        durationMs: (row['duration_ms'] as number) ?? 0,
        tokenCount: (row['token_count'] as number) ?? 0,
      }
    })
  }

  /**
   * Start a workflow run and poll until it reaches a terminal state
   * (`completed`, `failed`, or `cancelled`). Returns the run logs on success
   * and throws on failure or timeout.
   *
   * @param timeoutMs Maximum wait time in milliseconds (default 120 s).
   */
  async awaitRun(
    workflowId: string,
    inputs?: Record<string, unknown>,
    options?: { idempotencyKey?: string; modelId?: string; timeoutMs?: number },
  ): Promise<SdkWorkflowRunLog[]> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const run = await this.startRun(workflowId, inputs, options)
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS))
      const state = await this.getRunStatus(run.id)
      if (TERMINAL_STATUSES.has(state.status)) {
        if (state.status === 'completed') {
          return this.getRunLogs(run.id)
        }
        throw new Error(`@lenserfight/sdk: workflow run ${run.id} ended with status "${state.status}"`)
      }
    }

    throw new Error(`@lenserfight/sdk: workflow run ${run.id} timed out after ${timeoutMs}ms`)
  }
}
