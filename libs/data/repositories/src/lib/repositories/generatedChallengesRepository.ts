import { supabase } from '@lenserfight/data/supabase'
import type {
  GeneratedChallengeConfig,
  GeneratedChallengeRecord,
  GeneratedChallengeStatus,
  ChallengeGeneratorOutput,
} from '@lenserfight/domain/battle-governance'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeneratedChallengeCreateInput {
  battleId: string
  config: GeneratedChallengeConfig
  createdBy?: string
}

export interface GeneratedChallengeCompleteInput {
  questionText: string
  questionPayload?: Record<string, unknown>
  answerKeyEncrypted?: string | null
  answerKeyHash?: string | null
  contentHash: string
  executionRunId?: string | null
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Repository for managing AI-generated challenge questions.
 *
 * All write operations go through service_role since RLS restricts
 * direct writes to service_role only.
 */
export const generatedChallengesRepository = {
  /**
   * Creates a new pending generated challenge record.
   */
  async create(input: GeneratedChallengeCreateInput): Promise<string> {
    const { battleId, config, createdBy } = input

    const { data, error } = await supabase
      .from('generated_challenges')
      .insert({
        battle_id: battleId,
        challenge_type: config.challengeType,
        status: 'pending' as GeneratedChallengeStatus,
        generator_lens_id: config.generatorLensId,
        generator_version_id: config.generatorVersionId ?? null,
        generator_model_id: config.generatorModelId,
        difficulty: config.difficulty ?? 'medium',
        language: config.language ?? 'en',
        time_limit_seconds: config.timeLimitSeconds ?? null,
        scoring_mode: config.scoringMode ?? null,
        input_snapshot: {
          topic: config.topic,
          difficulty: config.difficulty,
          language: config.language,
          ...config.customParameters,
        },
        created_by: createdBy ?? null,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create generated challenge: ${error.message}`)
    return data.id
  },

  /**
   * Transitions challenge to 'generating' status.
   */
  async markGenerating(id: string): Promise<void> {
    const { error } = await supabase
      .from('generated_challenges')
      .update({ status: 'generating' as GeneratedChallengeStatus })
      .eq('id', id)
      .in('status', ['pending', 'failed'])

    if (error) throw new Error(`Failed to mark challenge as generating: ${error.message}`)
  },

  /**
   * Completes generation with the AI output, setting status to 'ready'.
   */
  async completeGeneration(
    id: string,
    output: GeneratedChallengeCompleteInput,
  ): Promise<void> {
    const { error } = await supabase
      .from('generated_challenges')
      .update({
        status: 'ready' as GeneratedChallengeStatus,
        question_text: output.questionText,
        question_payload: output.questionPayload ?? {},
        answer_key_encrypted: output.answerKeyEncrypted ?? null,
        answer_key_hash: output.answerKeyHash ?? null,
        content_hash: output.contentHash,
        execution_run_id: output.executionRunId ?? null,
      })
      .eq('id', id)
      .eq('status', 'generating')

    if (error) throw new Error(`Failed to complete challenge generation: ${error.message}`)
  },

  /**
   * Marks generation as failed.
   */
  async markFailed(id: string): Promise<void> {
    const { error } = await supabase
      .from('generated_challenges')
      .update({ status: 'failed' as GeneratedChallengeStatus })
      .eq('id', id)
      .in('status', ['pending', 'generating'])

    if (error) throw new Error(`Failed to mark challenge as failed: ${error.message}`)
  },

  /**
   * Locks the challenge, making it immutable. Also links it to the battle.
   */
  async lock(id: string, battleId: string): Promise<void> {
    const { error: lockError } = await supabase
      .from('generated_challenges')
      .update({
        status: 'locked' as GeneratedChallengeStatus,
        locked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'ready')

    if (lockError) throw new Error(`Failed to lock challenge: ${lockError.message}`)

    // Link the locked challenge to the battle
    const { error: linkError } = await supabase
      .from('battles')
      .update({ generated_challenge_id: id })
      .eq('id', battleId)

    if (linkError) throw new Error(`Failed to link challenge to battle: ${linkError.message}`)
  },

  /**
   * Fetches the generated challenge for a battle.
   */
  async getForBattle(battleId: string): Promise<GeneratedChallengeRecord | null> {
    const { data, error } = await supabase
      .from('generated_challenges')
      .select('*')
      .eq('battle_id', battleId)
      .eq('status', 'locked')
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch generated challenge: ${error.message}`)
    if (!data) return null

    return mapToRecord(data)
  },

  /**
   * Fetches a generated challenge by ID.
   */
  async getById(id: string): Promise<GeneratedChallengeRecord | null> {
    const { data, error } = await supabase
      .from('generated_challenges')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch generated challenge: ${error.message}`)
    if (!data) return null

    return mapToRecord(data)
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapToRecord(row: Record<string, unknown>): GeneratedChallengeRecord {
  return {
    id: row.id as string,
    battleId: row.battle_id as string,
    challengeType: row.challenge_type as string,
    status: row.status as GeneratedChallengeStatus,
    generatorLensId: row.generator_lens_id as string,
    generatorVersionId: (row.generator_version_id as string) ?? null,
    generatorModelId: row.generator_model_id as string,
    questionText: (row.question_text as string) ?? null,
    questionPayload: (row.question_payload as Record<string, unknown>) ?? {},
    answerKeyHash: (row.answer_key_hash as string) ?? null,
    difficulty: (row.difficulty as string) ?? null,
    language: (row.language as string) ?? null,
    timeLimitSeconds: (row.time_limit_seconds as number) ?? null,
    scoringMode: (row.scoring_mode as string) ?? null,
    contentHash: (row.content_hash as string) ?? null,
    executionRunId: (row.execution_run_id as string) ?? null,
    inputSnapshot: (row.input_snapshot as Record<string, unknown>) ?? {},
    lockedAt: (row.locked_at as string) ?? null,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string) ?? null,
  }
}
