-- Benchmark Metadata Migration
--
-- Extends the Battle system to support benchmark game data collection and export.
-- All changes are additive and backward compatible — existing battles are unaffected.
--
-- What this migration does:
--   1. Extends the challenge_type CHECK constraints to include 3 new benchmark types.
--   2. Adds benchmark_config JSONB column to battles.battles (nullable).
--   3. Adds normalized_score NUMERIC column to battles.battles (nullable).
--   4. Creates battles.v_benchmark_dataset — a safe, privacy-aware export view.
--
-- What this migration does NOT do:
--   - Does not create a new schema or new benchmark-specific tables.
--   - Does not duplicate execution logs (reuses execution.requests/runs/artifacts).
--   - Does not duplicate scoring (reuses battles.scorecards, battles.ai_judge_verdicts).
--   - Does not duplicate contender/submission tables.
--   - Does not change RLS on existing tables.

BEGIN;

-- ── 1. Extend challenge_type CHECK constraints ──────────────────────────────
-- Add the three new benchmark game types to both CHECK constraints.
-- Existing rows are unchanged; new benchmark battles can now set these types.

ALTER TABLE battles.battles DROP CONSTRAINT IF EXISTS chk_challenge_type_values;
ALTER TABLE battles.battles
  ADD CONSTRAINT chk_challenge_type_values
    CHECK (
      challenge_type IS NULL
      OR challenge_type IN (
        -- Human challenge types (task_source = 'challenge')
        'writing_contest',
        'math_calculation',
        'grammar_quiz',
        'hand_drawing',
        'fill_in_blanks',
        'first_code_error',
        'logic_puzzle',
        'prompt_duel',
        'debate',
        -- Benchmark game types (task_source = 'lens', ai_vs_ai or human_vs_ai)
        'code_completion_benchmark',
        'instruction_following_benchmark',
        'reasoning_benchmark'
      )
    );

ALTER TABLE battles.generated_challenges DROP CONSTRAINT IF EXISTS chk_generated_challenge_type;
ALTER TABLE battles.generated_challenges
  ADD CONSTRAINT chk_generated_challenge_type
    CHECK (
      challenge_type IN (
        -- Human challenge types
        'writing_contest',
        'math_calculation',
        'grammar_quiz',
        'hand_drawing',
        'fill_in_blanks',
        'first_code_error',
        'logic_puzzle',
        'prompt_duel',
        'debate',
        -- Benchmark game types
        'code_completion_benchmark',
        'instruction_following_benchmark',
        'reasoning_benchmark'
      )
    );

-- ── 2. Add benchmark_config to battles.battles ──────────────────────────────
-- Nullable JSONB column. NULL = non-benchmark battle (no change to existing rows).
--
-- Expected shape:
--   {
--     "game_key":               string,   -- matches BENCHMARK_GAME_REGISTRY key
--     "export_eligible":        boolean,  -- whether to include in v_benchmark_dataset
--     "anonymization_policy":   "full" | "model_only" | "none",
--     "required_capabilities":  string[], -- AI capability flags required for contenders
--     "dataset_schema_version": string    -- e.g. "1.0"
--   }

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS benchmark_config JSONB DEFAULT NULL;

COMMENT ON COLUMN battles.battles.benchmark_config IS
  'Benchmark game metadata. NULL = non-benchmark battle. '
  'Shape: { game_key, export_eligible, anonymization_policy, required_capabilities[], dataset_schema_version }.';

-- Partial index — only non-null rows are indexed (benchmark battles only).
-- Supports fast benchmark export and filtering queries.
CREATE INDEX IF NOT EXISTS idx_battles_benchmark_export
  ON battles.battles (((benchmark_config->>'game_key')))
  WHERE benchmark_config IS NOT NULL;

-- ── 3. Add normalized_score to battles.battles ──────────────────────────────
-- Nullable NUMERIC(5,4). NULL for non-benchmark battles.
-- Range: 0.0000 – 1.0000 (e.g. 0.8750 = 87.5%).
-- Populated by the scoring/judging service after battle finalization.

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS normalized_score NUMERIC(5, 4) DEFAULT NULL;

ALTER TABLE battles.battles
  DROP CONSTRAINT IF EXISTS battles_normalized_score_range;
ALTER TABLE battles.battles
  ADD CONSTRAINT battles_normalized_score_range
    CHECK (normalized_score IS NULL OR (normalized_score >= 0 AND normalized_score <= 1));

COMMENT ON COLUMN battles.battles.normalized_score IS
  'Normalized winner score 0.0–1.0 for benchmark dataset comparison. '
  'NULL for non-benchmark battles. Populated after finalization.';

-- ── 4. Benchmark dataset export view ────────────────────────────────────────
-- A safe, read-only view that joins battle + challenge + contender + submission
-- + execution telemetry into one flat benchmark dataset row per contender.
--
-- Privacy rules enforced:
--   - Only export_eligible = TRUE battles in terminal states are included.
--   - answer_key_encrypted is NEVER exposed (only answer_key_hash).
--   - model_id is NULL when anonymization_policy = 'full'.
--   - ai_judge_model_key is NULL when anonymization_policy = 'full'.
--   - lenser_battle_policy internals, BYOK keys, private instructions excluded.
--
-- RLS note: this view inherits RLS from the underlying tables. Rows visible
-- to a given role are determined by the most restrictive policy across all
-- joined tables. Service role sees all rows.

CREATE OR REPLACE VIEW battles.v_benchmark_dataset AS
SELECT
  -- ── Battle identity ────────────────────────────────────────────────────────
  b.id                                                   AS battle_id,
  b.title                                                AS battle_title,
  b.task_source,
  b.challenge_type,
  b.contender_structure,
  b.judging_mode,
  (b.benchmark_config->>'game_key')                      AS benchmark_game_key,
  (b.benchmark_config->>'dataset_schema_version')        AS dataset_schema_version,
  b.status                                               AS battle_status,
  b.created_at                                           AS battle_created_at,

  -- ── Generated challenge (challenge-source battles only) ───────────────────
  gc.id                                                  AS challenge_id,
  gc.challenge_type                                      AS challenge_game_type,
  gc.content_hash                                        AS challenge_hash,
  gc.difficulty,
  gc.language,
  gc.time_limit_seconds,
  gc.scoring_mode,
  gc.input_snapshot                                      AS challenge_input_params,
  gc.question_text                                       AS challenge_question,
  gc.question_payload                                    AS challenge_payload,
  gc.answer_key_hash,           -- hash only, never plaintext
  gc.generator_lens_id,
  gc.generator_version_id,
  gc.execution_run_id                                    AS generator_run_id,
  gc.locked_at                                           AS challenge_locked_at,

  -- ── Shared input snapshot (lens-source ai_vs_ai benchmarks) ───────────────
  b.shared_input_snapshot,

  -- ── Contender ─────────────────────────────────────────────────────────────
  co.id                                                  AS contender_id,
  co.slot                                                AS contender_slot,
  co.contender_type,

  -- ── Submission ────────────────────────────────────────────────────────────
  s.id                                                   AS submission_id,
  s.integrity_hash                                       AS submission_hash,
  s.output_modality,
  s.submitted_at,
  s.execution_run_id                                     AS contender_run_id,

  -- ── Execution telemetry ───────────────────────────────────────────────────
  er.latency_ms,
  er.token_input,
  er.token_output,
  er.credit_cost,
  CASE
    WHEN (b.benchmark_config->>'anonymization_policy') = 'full' THEN NULL
    ELSE er.model_id::text
  END                                                    AS model_id,

  -- ── Results ───────────────────────────────────────────────────────────────
  b.winner_contender_id,
  b.normalized_score,

  -- ── AI judge score ────────────────────────────────────────────────────────
  ajv.score                                              AS ai_judge_score,
  CASE
    WHEN (b.benchmark_config->>'anonymization_policy') = 'full' THEN NULL
    ELSE ajv.model_key
  END                                                    AS ai_judge_model_key,

  -- ── Privacy metadata ─────────────────────────────────────────────────────
  (b.benchmark_config->>'anonymization_policy')          AS anonymization_policy

FROM battles.battles b
LEFT JOIN battles.generated_challenges gc
  ON gc.id = b.generated_challenge_id
LEFT JOIN battles.contenders co
  ON co.battle_id = b.id
LEFT JOIN battles.submissions s
  ON s.battle_id = b.id
 AND s.contender_id = co.id
 AND s.is_final = TRUE
LEFT JOIN execution.runs er
  ON er.id = s.execution_run_id
LEFT JOIN battles.ai_judge_verdicts ajv
  ON ajv.battle_id = b.id
 AND ajv.contender_id = co.id
WHERE
  (b.benchmark_config->>'export_eligible')::boolean IS TRUE
  AND b.status IN ('closed', 'published', 'archived')
  AND b.deleted_at IS NULL;

COMMENT ON VIEW battles.v_benchmark_dataset IS
  'Safe benchmark dataset export view. '
  'Filters to export_eligible=true battles in closed/published/archived state. '
  'Masks model_id and ai_judge_model_key when anonymization_policy=full. '
  'Never exposes answer_key_encrypted, API keys, private instructions, or BYOK references.';

COMMIT;
