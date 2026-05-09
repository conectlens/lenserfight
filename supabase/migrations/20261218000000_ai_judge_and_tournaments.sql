-- Phase 21: AI Judge + Tournament System
-- Adds AI judge scoring, recurring battle templates, and N-way tournament brackets.

-- ─── 1. AI Judge columns on battles ─────────────────────────────────────────

ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS ai_judge_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_judge_model_key  TEXT    DEFAULT 'claude-sonnet-4-6',
  ADD COLUMN IF NOT EXISTS ai_judge_prompt     TEXT;

-- ─── 2. AI judge verdicts table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.ai_judge_verdicts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id       UUID        NOT NULL REFERENCES battles.battles(id) ON DELETE CASCADE,
  contender_id    UUID        NOT NULL REFERENCES battles.contenders(id) ON DELETE CASCADE,
  criterion_id    UUID        REFERENCES battles.rubric_criteria(id),
  score           NUMERIC(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  rationale       TEXT,
  model_key       TEXT        NOT NULL,
  run_id          UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_judge_verdicts_battle
  ON battles.ai_judge_verdicts (battle_id, contender_id);

ALTER TABLE battles.ai_judge_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_judge_verdicts_service_all"
  ON battles.ai_judge_verdicts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "ai_judge_verdicts_public_read"
  ON battles.ai_judge_verdicts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles.battles b
      WHERE b.id = battle_id AND b.status IN ('published', 'closed')
    )
  );

-- ─── 3. fn_record_ai_judge_verdict ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_record_ai_judge_verdict(
  p_battle_id UUID,
  p_verdicts  JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  v        JSONB;
  inserted INT := 0;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(p_verdicts)
  LOOP
    INSERT INTO battles.ai_judge_verdicts
      (battle_id, contender_id, criterion_id, score, rationale, model_key, run_id)
    VALUES (
      p_battle_id,
      (v->>'contender_id')::UUID,
      CASE WHEN v->>'criterion_id' IS NOT NULL THEN (v->>'criterion_id')::UUID ELSE NULL END,
      (v->>'score')::NUMERIC,
      v->>'rationale',
      COALESCE(v->>'model_key', 'claude-sonnet-4-6'),
      CASE WHEN v->>'run_id' IS NOT NULL THEN (v->>'run_id')::UUID ELSE NULL END
    );
    inserted := inserted + 1;
  END LOOP;

  -- Trigger finalization when ai_judge_enabled
  IF EXISTS (
    SELECT 1 FROM battles.battles
    WHERE id = p_battle_id AND ai_judge_enabled = TRUE AND status IN ('scoring', 'voting')
  ) THEN
    PERFORM public.fn_battles_finalize(p_battle_id);
  END IF;

  RETURN inserted;
END;
$$;

-- ─── 4. Modify fn_auto_finalize_battles to route ai_judge battles ─────────────
-- When ai_judge_enabled=TRUE, fire edge function instead of direct finalization.

CREATE OR REPLACE FUNCTION battles.fn_auto_finalize_battles()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  r           RECORD;
  finalized   INT := 0;
BEGIN
  FOR r IN
    SELECT b.id, b.ai_judge_enabled
    FROM   battles.battles b
    WHERE  b.status = 'scoring'
    AND    b.voting_closes_at < now()
  LOOP
    IF r.ai_judge_enabled AND
       EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') AND
       current_setting('app.supabase_url', true) IS NOT NULL
    THEN
      PERFORM net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/ai-judge-battle',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := jsonb_build_object('battle_id', r.id)
      );
    ELSE
      PERFORM public.fn_battles_finalize(r.id);
    END IF;
    finalized := finalized + 1;
  END LOOP;
  RETURN finalized;
END;
$$;

-- ─── 5. Recurring templates ───────────────────────────────────────────────────

ALTER TABLE battles.templates
  ADD COLUMN IF NOT EXISTS recurrence_rule        TEXT,
  ADD COLUMN IF NOT EXISTS next_run_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_start_delay_hours INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_templates_recurrence_due
  ON battles.templates (next_run_at ASC)
  WHERE recurrence_rule IS NOT NULL AND next_run_at IS NOT NULL;

-- ─── 6. fn_dispatch_recurring_battle_templates ───────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_dispatch_recurring_battle_templates()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  t           RECORD;
  new_battle  battles.battles;
  dispatched  INT := 0;
BEGIN
  FOR t IN
    SELECT * FROM battles.templates
    WHERE  recurrence_rule IS NOT NULL
    AND    next_run_at     IS NOT NULL
    AND    next_run_at     <= now()
  LOOP
    -- Create battle from template
    INSERT INTO battles.battles (
      title, task_prompt, battle_type, voter_eligibility,
      status, slug, execution_starts_at, auto_publish,
      voting_duration_hours, creator_lenser_id
    )
    SELECT
      t.title,
      t.task_prompt,
      t.battle_type,
      t.voter_eligibility,
      'open',
      lower(regexp_replace(t.title, '[^a-zA-Z0-9]', '-', 'g')) || '-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
      now() + (t.auto_start_delay_hours || ' hours')::INTERVAL,
      TRUE,
      COALESCE(t.voting_duration_hours, 24),
      t.creator_lenser_id
    RETURNING * INTO new_battle;

    -- Advance next_run_at by a simple daily/weekly interval parsed from recurrence_rule.
    -- Full RRULE parsing is left to application layer; here we support FREQ=DAILY and FREQ=WEEKLY.
    UPDATE battles.templates
    SET next_run_at = CASE
      WHEN recurrence_rule LIKE '%FREQ=DAILY%'  THEN next_run_at + INTERVAL '1 day'
      WHEN recurrence_rule LIKE '%FREQ=WEEKLY%' THEN next_run_at + INTERVAL '7 days'
      WHEN recurrence_rule LIKE '%FREQ=HOURLY%' THEN next_run_at + INTERVAL '1 hour'
      ELSE NULL
    END
    WHERE id = t.id;

    dispatched := dispatched + 1;
  END LOOP;
  RETURN dispatched;
END;
$$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'dispatch-recurring-battles',
      '0 * * * *',
      $$SELECT battles.fn_dispatch_recurring_battle_templates()$$
    );
  END IF;
END;
$do$;

-- ─── 7. Tournament schema ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles.tournaments (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT        NOT NULL,
  slug               TEXT        NOT NULL UNIQUE,
  creator_lenser_id  UUID        REFERENCES lensers.profiles(id) ON DELETE SET NULL,
  format             TEXT        NOT NULL DEFAULT 'single_elimination'
                                  CHECK (format IN ('single_elimination','round_robin','swiss')),
  status             TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','registration','active','completed','cancelled')),
  max_contenders     INT         NOT NULL DEFAULT 8,
  battle_type        TEXT        NOT NULL DEFAULT 'ai_vs_ai',
  ai_judge_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battles.tournament_contenders (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID        NOT NULL REFERENCES battles.tournaments(id) ON DELETE CASCADE,
  lenser_id      UUID        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  seed           INT,
  status         TEXT        NOT NULL DEFAULT 'registered'
                               CHECK (status IN ('registered','active','eliminated','winner')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, lenser_id)
);

CREATE TABLE IF NOT EXISTS battles.tournament_rounds (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID        NOT NULL REFERENCES battles.tournaments(id) ON DELETE CASCADE,
  round_number   INT         NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','active','completed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round_number)
);

CREATE TABLE IF NOT EXISTS battles.tournament_matches (
  id                               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id                    UUID  NOT NULL REFERENCES battles.tournaments(id) ON DELETE CASCADE,
  round_id                         UUID  NOT NULL REFERENCES battles.tournament_rounds(id) ON DELETE CASCADE,
  battle_id                        UUID  REFERENCES battles.battles(id),
  contender_a_id                   UUID  REFERENCES battles.tournament_contenders(id),
  contender_b_id                   UUID  REFERENCES battles.tournament_contenders(id),
  winner_tournament_contender_id   UUID  REFERENCES battles.tournament_contenders(id),
  next_match_id                    UUID  REFERENCES battles.tournament_matches(id),
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_battle
  ON battles.tournament_matches (battle_id)
  WHERE battle_id IS NOT NULL;

ALTER TABLE battles.tournaments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles.tournament_contenders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles.tournament_rounds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles.tournament_matches      ENABLE ROW LEVEL SECURITY;

-- Service role — full access
CREATE POLICY "tournaments_service_all"           ON battles.tournaments            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tournament_contenders_service_all" ON battles.tournament_contenders  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tournament_rounds_service_all"     ON battles.tournament_rounds      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tournament_matches_service_all"    ON battles.tournament_matches     FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read
CREATE POLICY "tournaments_public_read"           ON battles.tournaments            FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournament_contenders_public_read" ON battles.tournament_contenders  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournament_rounds_public_read"     ON battles.tournament_rounds      FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournament_matches_public_read"    ON battles.tournament_matches     FOR SELECT TO authenticated USING (true);

-- Creator can update their tournament
CREATE POLICY "tournaments_creator_update"
  ON battles.tournaments FOR UPDATE TO authenticated
  USING (creator_lenser_id = auth.uid());

-- ─── 8. fn_create_tournament ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_create_tournament(
  p_title            TEXT,
  p_format           TEXT    DEFAULT 'single_elimination',
  p_max_contenders   INT     DEFAULT 8,
  p_battle_type      TEXT    DEFAULT 'ai_vs_ai',
  p_ai_judge_enabled BOOLEAN DEFAULT FALSE
)
RETURNS battles.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_tournament battles.tournaments;
  v_slug       TEXT;
BEGIN
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]', '-', 'g')) || '-' || to_char(now(), 'YYYYMMDD-HH24MI');

  INSERT INTO battles.tournaments
    (title, slug, creator_lenser_id, format, status, max_contenders, battle_type, ai_judge_enabled)
  VALUES
    (p_title, v_slug, auth.uid(), p_format, 'registration', p_max_contenders, p_battle_type, p_ai_judge_enabled)
  RETURNING * INTO v_tournament;

  RETURN v_tournament;
END;
$$;

-- ─── 9. fn_register_tournament_contender ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_register_tournament_contender(
  p_tournament_id UUID,
  p_lenser_id     UUID DEFAULT NULL
)
RETURNS battles.tournament_contenders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_lenser_id UUID;
  v_row       battles.tournament_contenders;
  v_count     INT;
  v_max       INT;
BEGIN
  v_lenser_id := COALESCE(p_lenser_id, auth.uid());

  SELECT max_contenders INTO v_max FROM battles.tournaments WHERE id = p_tournament_id;
  SELECT COUNT(*) INTO v_count FROM battles.tournament_contenders WHERE tournament_id = p_tournament_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Tournament is full (% max contenders)', v_max;
  END IF;

  INSERT INTO battles.tournament_contenders (tournament_id, lenser_id)
  VALUES (p_tournament_id, v_lenser_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ─── 10. fn_start_tournament (single_elimination seeding) ────────────────────

CREATE OR REPLACE FUNCTION public.fn_start_tournament(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_tournament    battles.tournaments;
  v_contenders    battles.tournament_contenders[];
  v_round         battles.tournament_rounds;
  i               INT;
  v_a             battles.tournament_contenders;
  v_b             battles.tournament_contenders;
  v_battle        battles.battles;
  v_match         battles.tournament_matches;
BEGIN
  SELECT * INTO v_tournament FROM battles.tournaments WHERE id = p_tournament_id;

  IF v_tournament.status <> 'registration' THEN
    RAISE EXCEPTION 'Tournament must be in registration status to start';
  END IF;

  -- Collect contenders (assign seeds by registration order)
  SELECT array_agg(tc ORDER BY tc.created_at)
  INTO   v_contenders
  FROM   battles.tournament_contenders tc
  WHERE  tc.tournament_id = p_tournament_id;

  IF array_length(v_contenders, 1) < 2 THEN
    RAISE EXCEPTION 'Need at least 2 contenders to start';
  END IF;

  -- Update seeds
  FOR i IN 1..array_length(v_contenders, 1) LOOP
    UPDATE battles.tournament_contenders
    SET seed = i, status = 'active'
    WHERE id = v_contenders[i].id;
  END LOOP;

  -- Create round 1
  INSERT INTO battles.tournament_rounds (tournament_id, round_number, status)
  VALUES (p_tournament_id, 1, 'active')
  RETURNING * INTO v_round;

  -- Pair contenders (1 vs N, 2 vs N-1, …) — standard bracket seeding
  i := 1;
  WHILE i <= array_length(v_contenders, 1) / 2 LOOP
    v_a := v_contenders[i];
    v_b := v_contenders[array_length(v_contenders, 1) - i + 1];

    -- Create an auto-starting battle for this match
    INSERT INTO battles.battles (
      title, task_prompt, battle_type, voter_eligibility, status, slug,
      execution_starts_at, auto_publish, voting_duration_hours,
      ai_judge_enabled, ai_judge_model_key,
      creator_lenser_id
    )
    SELECT
      v_tournament.title || ' — Round 1 Match ' || i,
      'Tournament match between ' || v_a.lenser_id || ' and ' || v_b.lenser_id,
      v_tournament.battle_type,
      'open',
      'open',
      lower(regexp_replace(v_tournament.title, '[^a-zA-Z0-9]', '-', 'g')) || '-r1m' || i,
      now() + INTERVAL '5 minutes',
      TRUE,
      24,
      v_tournament.ai_judge_enabled,
      CASE WHEN v_tournament.ai_judge_enabled THEN 'claude-sonnet-4-6' ELSE NULL END,
      v_tournament.creator_lenser_id
    RETURNING * INTO v_battle;

    -- Create match record
    INSERT INTO battles.tournament_matches
      (tournament_id, round_id, battle_id, contender_a_id, contender_b_id)
    VALUES
      (p_tournament_id, v_round.id, v_battle.id, v_a.id, v_b.id)
    RETURNING * INTO v_match;

    i := i + 1;
  END LOOP;

  -- Update tournament status
  UPDATE battles.tournaments
  SET status = 'active', updated_at = now()
  WHERE id = p_tournament_id;
END;
$$;

-- ─── 11. fn_advance_tournament ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_advance_tournament(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles, public
AS $$
DECLARE
  v_match       battles.tournament_matches;
  v_battle      battles.battles;
  v_winner_tc   battles.tournament_contenders;
  v_contender_a battles.contenders;
  v_contender_b battles.contenders;
  v_winner_id   UUID;
  v_pending     INT;
  v_round       battles.tournament_rounds;
BEGIN
  SELECT * INTO v_match FROM battles.tournament_matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found: %', p_match_id; END IF;

  SELECT * INTO v_battle FROM battles.battles WHERE id = v_match.battle_id;

  -- Determine winner from battle result
  IF v_battle.winner_contender_id IS NOT NULL THEN
    -- Find which tournament contender maps to the winner
    SELECT tc.id INTO v_winner_id
    FROM   battles.tournament_contenders tc
    JOIN   battles.contenders c ON c.battle_id = v_battle.id
    WHERE  c.id = v_battle.winner_contender_id
    AND    tc.tournament_id = v_match.tournament_id
    LIMIT 1;
  END IF;

  IF v_winner_id IS NOT NULL THEN
    UPDATE battles.tournament_matches
    SET winner_tournament_contender_id = v_winner_id
    WHERE id = p_match_id;

    UPDATE battles.tournament_contenders
    SET status = 'eliminated'
    WHERE tournament_id = v_match.tournament_id
    AND   id IN (v_match.contender_a_id, v_match.contender_b_id)
    AND   id <> v_winner_id;
  END IF;

  -- Check if round is complete
  SELECT * INTO v_round FROM battles.tournament_rounds WHERE id = v_match.round_id;

  SELECT COUNT(*) INTO v_pending
  FROM   battles.tournament_matches
  WHERE  round_id    = v_match.round_id
  AND    winner_tournament_contender_id IS NULL;

  IF v_pending = 0 THEN
    UPDATE battles.tournament_rounds SET status = 'completed' WHERE id = v_match.round_id;

    -- Check if tournament is complete (only one non-eliminated contender)
    SELECT COUNT(*) INTO v_pending
    FROM   battles.tournament_contenders
    WHERE  tournament_id = v_match.tournament_id
    AND    status        = 'active';

    IF v_pending <= 1 THEN
      UPDATE battles.tournament_contenders
      SET status = 'winner'
      WHERE tournament_id = v_match.tournament_id AND status = 'active';

      UPDATE battles.tournaments
      SET status = 'completed', updated_at = now()
      WHERE id = v_match.tournament_id;
    ELSE
      -- Create next round (simple: pair remaining active contenders)
      PERFORM battles.fn_create_next_tournament_round(v_match.tournament_id, v_round.round_number + 1);
    END IF;
  END IF;
END;
$$;

-- ─── 12. fn_create_next_tournament_round ─────────────────────────────────────

CREATE OR REPLACE FUNCTION battles.fn_create_next_tournament_round(
  p_tournament_id UUID,
  p_round_number  INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = battles
AS $$
DECLARE
  v_tournament  battles.tournaments;
  v_contenders  battles.tournament_contenders[];
  v_round       battles.tournament_rounds;
  i             INT;
  v_a           battles.tournament_contenders;
  v_b           battles.tournament_contenders;
  v_battle      battles.battles;
BEGIN
  SELECT * INTO v_tournament FROM battles.tournaments WHERE id = p_tournament_id;

  SELECT array_agg(tc ORDER BY tc.seed)
  INTO   v_contenders
  FROM   battles.tournament_contenders tc
  WHERE  tc.tournament_id = p_tournament_id AND tc.status = 'active';

  IF array_length(v_contenders, 1) < 2 THEN RETURN; END IF;

  INSERT INTO battles.tournament_rounds (tournament_id, round_number, status)
  VALUES (p_tournament_id, p_round_number, 'active')
  RETURNING * INTO v_round;

  i := 1;
  WHILE i <= array_length(v_contenders, 1) / 2 LOOP
    v_a := v_contenders[i * 2 - 1];
    v_b := v_contenders[i * 2];

    INSERT INTO battles.battles (
      title, task_prompt, battle_type, voter_eligibility, status, slug,
      execution_starts_at, auto_publish, voting_duration_hours,
      ai_judge_enabled, ai_judge_model_key, creator_lenser_id
    )
    SELECT
      v_tournament.title || ' — Round ' || p_round_number || ' Match ' || i,
      'Tournament match',
      v_tournament.battle_type,
      'open', 'open',
      lower(regexp_replace(v_tournament.title, '[^a-zA-Z0-9]', '-', 'g')) || '-r' || p_round_number || 'm' || i,
      now() + INTERVAL '5 minutes',
      TRUE, 24,
      v_tournament.ai_judge_enabled,
      CASE WHEN v_tournament.ai_judge_enabled THEN 'claude-sonnet-4-6' ELSE NULL END,
      v_tournament.creator_lenser_id
    RETURNING * INTO v_battle;

    INSERT INTO battles.tournament_matches
      (tournament_id, round_id, battle_id, contender_a_id, contender_b_id)
    VALUES
      (p_tournament_id, v_round.id, v_battle.id, v_a.id, v_b.id);

    i := i + 1;
  END LOOP;
END;
$$;

-- ─── 13. RPC: fn_get_tournament_bracket ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_tournament_bracket(p_tournament_id UUID)
RETURNS TABLE (
  round_number  INT,
  round_status  TEXT,
  match_id      UUID,
  battle_id     UUID,
  battle_slug   TEXT,
  contender_a_lenser_id UUID,
  contender_b_lenser_id UUID,
  winner_lenser_id      UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = battles, public
AS $$
  SELECT
    tr.round_number,
    tr.status::TEXT AS round_status,
    tm.id           AS match_id,
    tm.battle_id,
    b.slug          AS battle_slug,
    tca.lenser_id   AS contender_a_lenser_id,
    tcb.lenser_id   AS contender_b_lenser_id,
    tcw.lenser_id   AS winner_lenser_id
  FROM battles.tournament_rounds tr
  JOIN battles.tournament_matches tm ON tm.round_id = tr.id
  LEFT JOIN battles.battles b               ON b.id = tm.battle_id
  LEFT JOIN battles.tournament_contenders tca ON tca.id = tm.contender_a_id
  LEFT JOIN battles.tournament_contenders tcb ON tcb.id = tm.contender_b_id
  LEFT JOIN battles.tournament_contenders tcw ON tcw.id = tm.winner_tournament_contender_id
  WHERE tr.tournament_id = p_tournament_id
  ORDER BY tr.round_number, tm.created_at;
$$;
