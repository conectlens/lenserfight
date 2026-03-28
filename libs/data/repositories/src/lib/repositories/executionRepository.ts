import { supabase } from '@lenserfight/data/supabase'
import {
  ExecutionRun,
  ExecutionArtifact,
  LensExecutionHistoryItem,
  PromptExecutionRecord,
  ExecutionRunStatus,
  SetArtifactVisibilityDTO,
  PersistLocalExecutionDTO,
} from '@lenserfight/types'

// --- Port ---

export interface ExecutionRepositoryPort {
  getHistoryForLens(lensId: string, limit?: number, offset?: number): Promise<LensExecutionHistoryItem[]>
  /** @deprecated Use getHistoryForLens instead. */
  getExecutionHistoryForPrompt(promptId: string, limit?: number, offset?: number): Promise<PromptExecutionRecord[]>
  getRunById(runId: string): Promise<ExecutionRun | null>
  getArtifactsForRun(runId: string): Promise<ExecutionArtifact[]>
  pollRunStatus(runId: string): Promise<Pick<ExecutionRun, 'id' | 'status' | 'completedAt' | 'errorCode'>>
  setArtifactVisibility(dto: SetArtifactVisibilityDTO): Promise<void>
  persistLocalExecution(dto: PersistLocalExecutionDTO): Promise<string>
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

  private mapHistoryItem(row: Record<string, unknown>): LensExecutionHistoryItem {
    return {
      requestId: row.request_id as string,
      lensId: row.lens_id as string,
      versionId: (row.version_id as string | null) ?? null,
      versionNumber: (row.version_number as number | null) ?? null,
      modelId: (row.model_id as string | null) ?? null,
      modelKey: (row.model_key as string | null) ?? null,
      providerKey: (row.provider_key as string | null) ?? null,
      fundingSource: (row.funding_source as LensExecutionHistoryItem['fundingSource']) ?? 'free',
      runId: (row.run_id as string | null) ?? null,
      runStatus: (row.run_status as LensExecutionHistoryItem['runStatus']) ?? null,
      latencyMs: (row.latency_ms as number | null) ?? null,
      tokenInput: (row.token_input as number | null) ?? null,
      tokenOutput: (row.token_output as number | null) ?? null,
      creditCost: (row.credit_cost as number | null) ?? null,
      createdAt: row.created_at as string,
    }
  }

  async getHistoryForLens(
    lensId: string,
    limit = 20,
    offset = 0,
  ): Promise<LensExecutionHistoryItem[]> {
    const { data, error } = await supabase.schema('execution').rpc('fn_get_lens_execution_history', {
      p_lens_id: lensId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) this.handleError(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    return rows.map((row) => this.mapHistoryItem(row))
  }

  /**
   * @deprecated Use getHistoryForLens instead.
   * Retained for backward compatibility during migration.
   */
  async getExecutionHistoryForPrompt(
    promptId: string,
    limit = 20,
    offset = 0,
  ): Promise<PromptExecutionRecord[]> {
    const items = await this.getHistoryForLens(promptId, limit, offset)
    return items.map((item) => ({
      id: item.requestId,
      lensId: item.lensId,
      lenserId: '',
      runId: item.runId,
      paymentMethod: (item.fundingSource as PromptExecutionRecord['paymentMethod']) ?? 'free',
      createdAt: item.createdAt,
      run: undefined,
      artifacts: [],
    }))
  }

  async getRunById(runId: string): Promise<ExecutionRun | null> {
    const { data, error } = await supabase
      .schema('execution')
      .from('runs')
      .select(
        'id, request_id, status, model_id, provider_request_id, execution_hash, input_hash, output_hash, started_at, completed_at, latency_ms, cost_estimate, token_input, token_output, credit_cost, billing_status, error_code, error_message, created_at',
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
      .select(
        'id, run_id, artifact_kind, content_text, content_json, visibility, is_primary_output, created_at',
      )
      .eq('run_id', runId)
      .order('is_primary_output', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) this.handleError(error)
    return ((data ?? []) as Record<string, unknown>[]).map((r) => this.mapArtifact(r))
  }

  async pollRunStatus(
    runId: string,
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

  async setArtifactVisibility(dto: SetArtifactVisibilityDTO): Promise<void> {
    const { error } = await supabase.rpc('fn_set_artifact_visibility', {
      p_artifact_id: dto.artifactId,
      p_visibility: dto.visibility,
    })

    if (error) this.handleError(error)
  }

  async persistLocalExecution(dto: PersistLocalExecutionDTO): Promise<string> {
    const { data, error } = await supabase.schema('execution').rpc('fn_persist_local_execution', {
      p_lens_id: dto.lensId,
      p_version_id: dto.versionId ?? null,
      p_provider: dto.provider,
      p_model: dto.model,
      p_content_text: dto.contentText,
      p_token_input: dto.tokenInput,
      p_token_output: dto.tokenOutput,
    })

    if (error) this.handleError(error)
    return data as string
  }
}

export const executionRepository = new SupabaseExecutionRepository()
