-- Battle Concept Separation Migration
--
-- Splits the monolithic battle_type_enum into three orthogonal axes:
-- 1. contender_structure — who competes (ai_vs_ai, human_vs_human, human_vs_ai)
-- 2. judging_mode — how the winner is decided (community_vote, ai_judge, rubric_score, auto_score)
-- 3. task_source / challenge_type — what the contest is about
--
-- The legacy battle_type column is unchanged. New battles dual-write both
-- the legacy column and the new columns. Existing rows are backfilled.

BEGIN;

-- ── 1. New ENUMs ────────────────────────────────────────────────────────────

CREATE TYPE battles.contender_structure_enum AS ENUM (
  'ai_vs_ai',
  'human_vs_human',
  'human_vs_ai'
);

COMMENT ON TYPE battles.contender_structure_enum IS
  'Who competes in a battle. Orthogonal to judging_mode.';

CREATE TYPE battles.judging_mode_enum AS ENUM (
  'community_vote',
  'ai_judge',
  'rubric_score',
  'auto_score'
);

COMMENT ON TYPE battles.judging_mode_enum IS
  'How the winner of a battle is decided. Orthogonal to contender_structure.';

-- ── 2. New columns ──────────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS contender_structure battles.contender_structure_enum DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS judging_mode       battles.judging_mode_enum DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS task_source        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS challenge_type     TEXT DEFAULT NULL;

COMMENT ON COLUMN battles.battles.contender_structure IS
  'V2: who competes — derived from or alongside battle_type.';
COMMENT ON COLUMN battles.battles.judging_mode IS
  'V2: how the winner is decided — derived from or alongside battle_type.';
COMMENT ON COLUMN battles.battles.task_source IS
  'V2: what the battle is about — lens, workflow, or challenge.';
COMMENT ON COLUMN battles.battles.challenge_type IS
  'V2: challenge game type ID for human contests (e.g. writing_contest, math_calculation).';

-- ── 3. CHECK constraints ────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD CONSTRAINT chk_task_source_values
    CHECK (task_source IS NULL OR task_source IN ('lens', 'workflow', 'challenge'));

ALTER TABLE battles.battles
  ADD CONSTRAINT chk_challenge_type_values
    CHECK (
      challenge_type IS NULL
      OR challenge_type IN (
        'writing_contest',
        'math_calculation',
        'grammar_quiz',
        'hand_drawing',
        'fill_in_blanks',
        'first_code_error',
        'logic_puzzle',
        'prompt_duel',
        'debate'
      )
    );

-- ── 4. Backfill existing rows ───────────────────────────────────────────────

UPDATE battles.battles
SET
  contender_structure = CASE battle_type
    WHEN 'ai_vs_ai'                  THEN 'ai_vs_ai'   ::battles.contender_structure_enum
    WHEN 'human_vs_ai'               THEN 'human_vs_ai' ::battles.contender_structure_enum
    WHEN 'human_vs_human_open_votes' THEN 'human_vs_human'::battles.contender_structure_enum
    WHEN 'human_vs_human_ai_votes'   THEN 'human_vs_human'::battles.contender_structure_enum
    WHEN 'workflow_battle'           THEN 'ai_vs_ai'   ::battles.contender_structure_enum
    WHEN 'lenser_battle'             THEN 'ai_vs_ai'   ::battles.contender_structure_enum
  END,
  judging_mode = CASE battle_type
    WHEN 'ai_vs_ai'                  THEN 'community_vote'::battles.judging_mode_enum
    WHEN 'human_vs_ai'               THEN 'community_vote'::battles.judging_mode_enum
    WHEN 'human_vs_human_open_votes' THEN 'community_vote'::battles.judging_mode_enum
    WHEN 'human_vs_human_ai_votes'   THEN 'ai_judge'      ::battles.judging_mode_enum
    WHEN 'workflow_battle'           THEN 'community_vote'::battles.judging_mode_enum
    WHEN 'lenser_battle'             THEN 'community_vote'::battles.judging_mode_enum
  END,
  task_source = CASE
    WHEN workflow_id IS NOT NULL THEN 'workflow'
    WHEN lens_id IS NOT NULL    THEN 'lens'
    ELSE 'lens'
  END
WHERE contender_structure IS NULL;

COMMIT;
