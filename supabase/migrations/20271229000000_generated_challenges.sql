-- Generated Challenges Migration
--
-- Adds AI-generated challenge question support for Human-vs-Human battles.
-- A neutral AI generator (implemented via a Lens) creates an immutable question
-- that both contestants answer. Ensures fairness, auditability, and benchmark logging.

BEGIN;

-- ── 1. Generated Challenges table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.generated_challenges (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id             UUID NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  challenge_type        TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',

  -- Generator identity (which Lens + model produced the question)
  generator_lens_id     UUID NOT NULL,
  generator_version_id  UUID,
  generator_model_id    UUID NOT NULL,

  -- Generated content (sanitized — no chain-of-thought or private reasoning)
  question_text         TEXT,
  question_payload      JSONB DEFAULT '{}'::jsonb,

  -- Answer key (encrypted at rest, accessible only after scoring phase)
  answer_key_encrypted  BYTEA,
  answer_key_hash       TEXT,

  -- Challenge parameters
  difficulty            TEXT DEFAULT 'medium',
  language              TEXT DEFAULT 'en',
  time_limit_seconds    INTEGER,
  scoring_mode          TEXT,

  -- Integrity
  content_hash          TEXT,

  -- Execution link for benchmark reproducibility
  execution_run_id      UUID,
  input_snapshot        JSONB DEFAULT '{}'::jsonb,

  -- Lifecycle
  locked_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by            UUID,

  -- Constraints
  CONSTRAINT chk_generated_challenge_status
    CHECK (status IN ('pending', 'generating', 'ready', 'locked', 'failed')),
  CONSTRAINT chk_generated_challenge_difficulty
    CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard', 'expert')),
  CONSTRAINT chk_generated_challenge_scoring_mode
    CHECK (scoring_mode IS NULL OR scoring_mode IN ('auto_score', 'rubric_score', 'community_vote', 'ai_judge')),
  CONSTRAINT chk_generated_challenge_type
    CHECK (challenge_type IN (
      'writing_contest', 'math_calculation', 'grammar_quiz', 'hand_drawing',
      'fill_in_blanks', 'first_code_error', 'logic_puzzle', 'prompt_duel', 'debate'
    ))
);

ALTER TABLE battles.generated_challenges OWNER TO postgres;

COMMENT ON TABLE battles.generated_challenges IS
  'AI-generated challenge questions for human-friendly battle types. Immutable once locked.';

-- Indexes
CREATE INDEX idx_generated_challenges_battle
  ON battles.generated_challenges(battle_id);

CREATE UNIQUE INDEX uq_generated_challenges_locked_per_battle
  ON battles.generated_challenges(battle_id) WHERE status = 'locked';

-- ── 2. FK on battles.battles ────────────────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS generated_challenge_id UUID
    REFERENCES battles.generated_challenges(id);

COMMENT ON COLUMN battles.battles.generated_challenge_id IS
  'V2: reference to the locked AI-generated challenge for human contest battles.';

-- ── 3. Immutability trigger — prevent updates to locked challenges ──────────────

CREATE OR REPLACE FUNCTION battles.trg_generated_challenge_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'locked' AND NEW.status IS DISTINCT FROM 'locked' THEN
    RAISE EXCEPTION 'generated_challenge_immutable: cannot modify a locked challenge';
  END IF;
  IF OLD.status = 'locked' THEN
    -- Allow no content changes once locked
    IF NEW.question_text IS DISTINCT FROM OLD.question_text
       OR NEW.question_payload IS DISTINCT FROM OLD.question_payload
       OR NEW.answer_key_encrypted IS DISTINCT FROM OLD.answer_key_encrypted
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
       OR NEW.language IS DISTINCT FROM OLD.language
       OR NEW.time_limit_seconds IS DISTINCT FROM OLD.time_limit_seconds THEN
      RAISE EXCEPTION 'generated_challenge_immutable: locked challenge content cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generated_challenges_immutable
  BEFORE UPDATE ON battles.generated_challenges
  FOR EACH ROW
  EXECUTE FUNCTION battles.trg_generated_challenge_immutable();

-- ── 4. Extend events CHECK to include challenge lifecycle events ────────────────

ALTER TABLE battles.events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE battles.events ADD CONSTRAINT events_type_check CHECK (
  event_type = ANY (ARRAY[
    'status_change'::text, 'contender_joined'::text, 'submission_received'::text,
    'vote_cast'::text, 'finalized'::text, 'published'::text, 'archived'::text,
    'invitation_sent'::text, 'invitation_accepted'::text, 'adapter_connected'::text,
    'contender_withdrawn'::text, 'voting_opened'::text, 'voting_closed'::text,
    'scoring_started'::text, 'battle_cancelled'::text, 'funding_allocated'::text,
    'cost_recorded'::text, 'run_started'::text, 'run_completed'::text, 'run_failed'::text,
    'challenge_generated'::text, 'challenge_locked'::text, 'challenge_generation_failed'::text
  ])
);

-- ── 5. RLS Policies ────────────────────────────────────────────────────────────

ALTER TABLE battles.generated_challenges ENABLE ROW LEVEL SECURITY;

-- Public read for challenges on visible battles (voting+)
CREATE POLICY "generated_challenges_select_public"
  ON battles.generated_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id
        AND b.status IN ('open', 'executing', 'voting', 'scoring', 'closed', 'published', 'archived')
        AND b.deleted_at IS NULL
    )
  );

-- Creator can read own draft battle challenges
CREATE POLICY "generated_challenges_select_creator"
  ON battles.generated_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id
        AND b.creator_lenser_id = (SELECT auth.uid())
    )
  );

-- Insert/update only via service_role (challenge generation service)
CREATE POLICY "generated_challenges_service_insert"
  ON battles.generated_challenges FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "generated_challenges_service_update"
  ON battles.generated_challenges FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 6. Backend guard: prevent battle start without locked challenge ─────────────

CREATE OR REPLACE FUNCTION battles.trg_battle_start_requires_challenge()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce when transitioning from draft/open to executing
  IF OLD.status IN ('draft', 'open') AND NEW.status = 'executing' THEN
    IF NEW.task_source = 'challenge'
       AND NEW.contender_structure IN ('human_vs_human', 'human_vs_ai') THEN
      IF NEW.generated_challenge_id IS NULL THEN
        RAISE EXCEPTION 'battle_missing_generated_challenge: cannot start challenge battle without a locked generated challenge';
      END IF;
      -- Verify the challenge is actually locked
      IF NOT EXISTS (
        SELECT 1 FROM battles.generated_challenges gc
        WHERE gc.id = NEW.generated_challenge_id AND gc.status = 'locked'
      ) THEN
        RAISE EXCEPTION 'battle_challenge_not_locked: generated challenge must be locked before battle starts';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_battles_require_challenge_on_start
  BEFORE UPDATE ON battles.battles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION battles.trg_battle_start_requires_challenge();

COMMIT;
