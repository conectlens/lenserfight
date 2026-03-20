import { supabase } from '@lenserfight/data/supabase'
import {
  ExecutionRun,
  ExecutionArtifact,
  PromptExecutionRecord,
  ExecutionRunStatus,
} from '@lenserfight/types'

// --- Port ---

export interface ExecutionRepositoryPort {
  getExecutionHistoryForPrompt(
    promptId: string,
    limit?: number,
    offset?: number
  ): Promise<PromptExecutionRecord[]>
  getRunById(runId: string): Promise<ExecutionRun | null>
  getArtifactsForRun(runId: string): Promise<ExecutionArtifact[]>
  pollRunStatus(
    runId: string
  ): Promise<Pick<ExecutionRun, 'id' | 'status' | 'completedAt' | 'errorCode'>>
}

// --- Supabase Implementation ---

export class SupabaseExecutionRepository implements ExecutionRepositoryPort {
  private handleError(error: unknown): never {
    throw error
  }

  private mapRun(row: Record<string, unknown>): ExecutionRun {
    return {
      id: row.id as string,
      requestId: row.request_id as string,
      status: row.status as ExecutionRunStatus,
      modelId: (row.model_id as string | null) ?? null,
      agentAdapterId: (row.agent_adapter_id as string | null) ?? null,
      providerRequestId: (row.provider_request_id as string | null) ?? null,
      executionHash: (row.execution_hash as string | null) ?? null,
      inputHash: (row.input_hash as string | null) ?? null,
      outputHash: (row.output_hash as string | null) ?? null,
      startedAt: (row.started_at as string | null) ?? null,
      completedAt: (row.completed_at as string | null) ?? null,
      latencyMs: (row.latency_ms as number | null) ?? null,
      costEstimate: (row.cost_estimate as number | null) ?? null,
      tokenInput: (row.token_input as number | null) ?? null,
      tokenOutput: (row.token_output as number | null) ?? null,
      creditCost: (row.credit_cost as number | null) ?? null,
      billingStatus: (row.billing_status as ExecutionRun['billingStatus']) ?? 'free',
      errorCode: (row.error_code as string | null) ?? null,
      errorMessage: (row.error_message as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  }

  private mapArtifact(row: Record<string, unknown>): ExecutionArtifact {
    return {
      id: row.id as string,
      runId: row.run_id as string,
      artifactKind: row.artifact_kind as ExecutionArtifact['artifactKind'],
      contentText: (row.content_text as string | null) ?? null,
      contentJson: (row.content_json as unknown) ?? null,
      visibility: (row.visibility as ExecutionArtifact['visibility']) ?? 'private',
      isPrimaryOutput: (row.is_primary_output as boolean) ?? false,
      createdAt: row.created_at as string,
    }
  }

  async getExecutionHistoryForPrompt(
    promptId: string,
    limit = 20,
    offset = 0
  ): Promise<PromptExecutionRecord[]> {
    // 1. Fetch prompt_executions rows for this prompt
    const { data: execRows, error: execError } = await supabase
      .schema('content')
      .from('prompt_executions')
      .select('id, prompt_id, lenser_id, execution_run_id, payment_method, created_at')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (execError) this.handleError(execError)

    const rows = (execRows ?? []) as Record<string, unknown>[]

    // 2. Batch-fetch runs for non-null execution_run_ids
    const runIds = rows
      .map((r) => r.execution_run_id as string | null)
      .filter((id): id is string => !!id)

    const runMap = new Map<string, ExecutionRun>()
    if (runIds.length > 0) {
      const { data: runRows, error: runError } = await supabase
        .schema('execution')
        .from('runs')
        .select(
          'id, request_id, status, model_id, agent_adapter_id, provider_request_id, execution_hash, input_hash, output_hash, started_at, completed_at, latency_ms, cost_estimate, token_input, token_output, credit_cost, billing_status, error_code, error_message, created_at'
        )
        .in('id', runIds)

      if (runError) this.handleError(runError)
      for (const row of (runRows ?? []) as Record<string, unknown>[]) {
        const run = this.mapRun(row)
        runMap.set(run.id, run)
      }
    }

    // 3. Batch-fetch primary artifacts for succeeded runs
    const succeededRunIds = Array.from(runMap.values())
      .filter((r) => r.status === 'succeeded')
      .map((r) => r.id)

    const artifactsByRun = new Map<string, ExecutionArtifact[]>()
    if (succeededRunIds.length > 0) {
      const { data: artifactRows, error: artifactError } = await supabase
        .schema('execution')
        .from('artifacts')
        .select('id, run_id, artifact_kind, content_text, content_json, visibility, is_primary_output, created_at')
        .in('run_id', succeededRunIds)
        .eq('is_primary_output', true)

      if (artifactError) this.handleError(artifactError)
      for (const row of (artifactRows ?? []) as Record<string, unknown>[]) {
        const artifact = this.mapArtifact(row)
        const existing = artifactsByRun.get(artifact.runId) ?? []
        existing.push(artifact)
        artifactsByRun.set(artifact.runId, existing)
      }
    }

    // 4. Compose PromptExecutionRecord list
    return rows.map((r) => {
      const runId = r.execution_run_id as string | null
      const run = runId ? runMap.get(runId) : undefined
      return {
        id: r.id as string,
        promptId: r.prompt_id as string,
        lenserId: r.lenser_id as string,
        executionRunId: runId,
        paymentMethod: (r.payment_method as PromptExecutionRecord['paymentMethod']) ?? 'free',
        createdAt: r.created_at as string,
        run,
        artifacts: run ? (artifactsByRun.get(run.id) ?? []) : [],
      }
    })
  }

  async getRunById(runId: string): Promise<ExecutionRun | null> {
    const { data, error } = await supabase
      .schema('execution')
      .from('runs')
      .select(
        'id, request_id, status, model_id, agent_adapter_id, provider_request_id, execution_hash, input_hash, output_hash, started_at, completed_at, latency_ms, cost_estimate, token_input, token_output, credit_cost, billing_status, error_code, error_message, created_at'
      )
      .eq('id', runId)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!data) return null
    return this.mapRun(data as Record<string, unknown>)
  }

  async getArtifactsForRun(runId: string): Promise<ExecutionArtifact[]> {
    const { data, error } = await supabase
      .schema('execution')
      .from('artifacts')
      .select('id, run_id, artifact_kind, content_text, content_json, visibility, is_primary_output, created_at')
      .eq('run_id', runId)
      .order('is_primary_output', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((r) => this.mapArtifact(r))
  }

  async pollRunStatus(
    runId: string
  ): Promise<Pick<ExecutionRun, 'id' | 'status' | 'completedAt' | 'errorCode'>> {
    const { data, error } = await supabase
      .schema('execution')
      .from('runs')
      .select('id, status, completed_at, error_code')
      .eq('id', runId)
      .maybeSingle()

    if (error) this.handleError(error)
    if (!data) throw new Error(`Run ${runId} not found`)

    const row = data as Record<string, unknown>
    return {
      id: row.id as string,
      status: row.status as ExecutionRunStatus,
      completedAt: (row.completed_at as string | null) ?? null,
      errorCode: (row.error_code as string | null) ?? null,
    }
  }
}
