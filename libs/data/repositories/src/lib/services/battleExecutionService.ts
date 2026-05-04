import { supabase } from '@lenserfight/data/supabase'

import type { BattleStatus } from '../repositories/battlesRepository'

// --- Record Types ---

export interface ExecutionConfigRecord {
  id: string
  battle_id: string
  contender_id: string | null
  provider_key: string
  model_key: string
  model_id: string | null
  funding_source: string
  byok_key_ref_id: string | null
  max_tokens: number
  temperature: number
  created_at: string
  updated_at: string
}

export interface UpsertExecutionConfigInput {
  battle_id: string
  contender_id?: string | null
  provider_key: string
  model_key: string
  model_id?: string | null
  funding_source: string
  byok_key_ref_id?: string | null
  max_tokens?: number
  temperature?: number
}

export interface ContenderRunRecord {
  id: string
  battle_id: string
  contender_id: string
  run_id: string
  ordinal: number
  status: string
  credit_cost: number | null
  created_at: string
}

export interface BattleEventRecord {
  id: string
  battle_id: string
  event_type: string
  actor_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface StreamRecordingRecord {
  id: string
  battle_id: string
  contender_id: string
  slot: string
  events: unknown[]
  total_duration_ms: number
  total_tokens: number
  final_output: string | null
  content_type: string
  created_at: string
}

// --- Service ---

export const battleExecutionService = {
  // --- Execution Config ---

  async getExecutionConfig(
    battleId: string,
    contenderId?: string | null,
  ): Promise<ExecutionConfigRecord | null> {
    // Try contender-specific first, then battle-level default (contender_id IS NULL)
    if (contenderId) {
      const { data } = await supabase
        .from('execution_configs')
        .select('*')
        .eq('battle_id', battleId)
        .eq('contender_id', contenderId)
        .maybeSingle()
      if (data) return data as ExecutionConfigRecord
    }
    // Fallback to battle-level default
    const { data } = await supabase
      .from('execution_configs')
      .select('*')
      .eq('battle_id', battleId)
      .is('contender_id', null)
      .maybeSingle()
    return (data as ExecutionConfigRecord) ?? null
  },

  async upsertExecutionConfig(
    input: UpsertExecutionConfigInput,
  ): Promise<ExecutionConfigRecord> {
    const { data, error } = await supabase
      .from('execution_configs')
      .upsert(
        {
          battle_id: input.battle_id,
          contender_id: input.contender_id ?? null,
          provider_key: input.provider_key,
          model_key: input.model_key,
          model_id: input.model_id ?? null,
          funding_source: input.funding_source,
          byok_key_ref_id: input.byok_key_ref_id ?? null,
          max_tokens: input.max_tokens ?? 4096,
          temperature: input.temperature ?? 0.7,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'battle_id,contender_id' },
      )
      .select()
      .single()
    if (error) throw error
    return data as ExecutionConfigRecord
  },

  // --- Contender Runs ---

  async createContenderRun(
    battleId: string,
    contenderId: string,
    runId: string,
    ordinal: number,
  ): Promise<ContenderRunRecord> {
    const { data, error } = await supabase
      .from('contender_runs')
      .insert({
        battle_id: battleId,
        contender_id: contenderId,
        run_id: runId,
        ordinal,
        status: 'running',
      })
      .select()
      .single()
    if (error) throw error
    return data as ContenderRunRecord
  },

  async updateContenderRunStatus(
    id: string,
    status: string,
    creditCost?: number,
  ): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (creditCost != null) update.credit_cost = creditCost
    const { error } = await supabase
      .from('contender_runs')
      .update(update)
      .eq('id', id)
    if (error) throw error
  },

  // --- Battle Events ---

  async insertBattleEvent(
    battleId: string,
    eventType: string,
    actorId?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('events').insert({
      battle_id: battleId,
      event_type: eventType,
      actor_id: actorId ?? null,
      metadata: metadata ?? null,
    })
    if (error) throw error
  },

  // --- Battle Status Transition ---

  async transitionBattleStatus(
    battleId: string,
    newStatus: BattleStatus,
  ): Promise<void> {
    const { error } = await supabase
      .from('battles')
      .update({ status: newStatus })
      .eq('id', battleId)
    if (error) throw error
  },

  // --- Submissions ---

  async createSubmission(
    battleId: string,
    contenderId: string,
    status: string = 'pending',
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        battle_id: battleId,
        contender_id: contenderId,
        status,
      })
      .select('id')
      .single()
    if (error) throw error
    return data as { id: string }
  },

  async updateSubmissionText(
    submissionId: string,
    contentText: string,
    status?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = { content_text: contentText }
    if (status) update.status = status
    const { error } = await supabase
      .from('submissions')
      .update(update)
      .eq('id', submissionId)
    if (error) throw error
  },

  async submitExecutionResult(
    battleId: string,
    contenderId: string,
    contentText: string,
    runId?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('submissions')
      .upsert(
        {
          battle_id: battleId,
          contender_id: contenderId,
          content_text: contentText,
          status: 'submitted',
        },
        { onConflict: 'battle_id,contender_id' },
      )
    if (error) throw error
  },

  // --- Stream Recordings ---

  async saveStreamRecording(
    battleId: string,
    contenderId: string,
    slot: 'A' | 'B',
    events: unknown[],
    totalDurationMs: number,
    totalTokens: number,
    finalOutput: string,
    contentType: string = 'text',
  ): Promise<void> {
    const { error } = await supabase
      .from('stream_recordings')
      .upsert(
        {
          battle_id: battleId,
          contender_id: contenderId,
          slot,
          events,
          total_duration_ms: totalDurationMs,
          total_tokens: totalTokens,
          final_output: finalOutput,
          content_type: contentType,
        },
        { onConflict: 'battle_id,contender_id' },
      )
    if (error) throw error
  },

  async getStreamRecordings(
    battleId: string,
  ): Promise<StreamRecordingRecord[]> {
    const { data, error } = await supabase
      .from('stream_recordings')
      .select('*')
      .eq('battle_id', battleId)
      .order('slot', { ascending: true })
    if (error) throw error
    return (data ?? []) as StreamRecordingRecord[]
  },
}
