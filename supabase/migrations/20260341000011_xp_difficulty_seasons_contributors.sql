-- =============================================================================
-- Migration: XP Difficulty, Seasons, Contributors
-- =============================================================================
-- Phases 0-5 of the XP system improvement plan:
--   0. Bug fixes (get_active_season_id, apply, update_daily_streak)
--   1. App registry & difficulty multiplier system
--   2. Per-app XP rules with difficulty-based scaling
--   3. Per-app level curves
--   4. Contributor XP system
--   5. Automatic season management
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: ENUM ADDITIONS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TYPE xp.source_enum ADD VALUE IF NOT EXISTS 'contribution';

CREATE TYPE xp.contribution_context_enum AS ENUM (
  'main_project',
  'community_plugin',
  'documentation',
  'infrastructure'
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: TABLE CREATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- 2A. App registry
CREATE TABLE IF NOT EXISTS xp.apps (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  difficulty xp.difficulty_enum NOT NULL DEFAULT 'standard',
  is_active  boolean     NOT NULL DEFAULT true,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xp.apps OWNER TO postgres;
ALTER TABLE xp.apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_apps_select_public"
  ON xp.apps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "xp_apps_manage_service"
  ON xp.apps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON xp.apps TO authenticated;
GRANT ALL    ON xp.apps TO service_role;


-- 2B. Difficulty multipliers
CREATE TABLE IF NOT EXISTS xp.difficulty_multipliers (
  difficulty xp.difficulty_enum PRIMARY KEY,
  multiplier numeric(4,2)      NOT NULL,
  label      text               NOT NULL
);

ALTER TABLE xp.difficulty_multipliers OWNER TO postgres;
ALTER TABLE xp.difficulty_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_difficulty_multipliers_select_public"
  ON xp.difficulty_multipliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "xp_difficulty_multipliers_manage_service"
  ON xp.difficulty_multipliers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON xp.difficulty_multipliers TO authenticated;
GRANT ALL    ON xp.difficulty_multipliers TO service_role;


-- 2C. Contributions tracking
CREATE TABLE IF NOT EXISTS xp.contributions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id         uuid        NOT NULL REFERENCES lensers.profiles(id) ON DELETE CASCADE,
  context           xp.contribution_context_enum NOT NULL,
  contribution_type text        NOT NULL,
  external_ref      text,
  title             text,
  verified_by       text,
  xp_event_id       uuid        REFERENCES xp.events(id) ON DELETE SET NULL,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xp.contributions OWNER TO postgres;
ALTER TABLE xp.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_contributions_select_own"
  ON xp.contributions FOR SELECT
  TO authenticated
  USING (lenser_id = auth.uid());

CREATE POLICY "xp_contributions_manage_service"
  ON xp.contributions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_contributions_lenser ON xp.contributions(lenser_id);
CREATE INDEX idx_contributions_context ON xp.contributions(context);

GRANT SELECT ON xp.contributions TO authenticated;
GRANT ALL    ON xp.contributions TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: CONSTRAINT CHANGES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 3A. Allow same action_key across different apps
ALTER TABLE xp.rules DROP CONSTRAINT IF EXISTS xp_rules_action_key_key;
ALTER TABLE xp.rules ADD CONSTRAINT xp_rules_app_action_key UNIQUE (app_id, action_key);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: COLUMN ADDITIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 4A. Add difficulty to rules (existing rules default to 'standard')
ALTER TABLE xp.rules ADD COLUMN IF NOT EXISTS difficulty xp.difficulty_enum DEFAULT 'standard';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5A. Seed apps (deterministic UUIDs for code references)
INSERT INTO xp.apps (id, slug, name, difficulty) VALUES
  ('00000000-0000-0000-0000-000000000000', 'global', 'LenserFight Global',  'standard'),
  ('00000000-0000-0000-0000-000000000001', 'forum',  'LenserFight Forum',   'easy'),
  ('00000000-0000-0000-0000-000000000002', 'arena',  'LenserFight Arena',   'hard'),
  ('00000000-0000-0000-0000-000000000003', 'cli',    'LenserFight CLI',     'hard'),
  ('00000000-0000-0000-0000-000000000004', 'auth',   'LenserFight Auth',    'easy')
ON CONFLICT (id) DO NOTHING;


-- 5B. Seed difficulty multipliers
INSERT INTO xp.difficulty_multipliers (difficulty, multiplier, label) VALUES
  ('easy',      0.80, 'Easy'),
  ('standard',  1.00, 'Standard'),
  ('hard',      1.50, 'Hard'),
  ('legendary', 3.00, 'Legendary')
ON CONFLICT (difficulty) DO UPDATE SET
  multiplier = EXCLUDED.multiplier,
  label      = EXCLUDED.label;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: FUNCTION FIXES & UPDATES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6A. Fix get_active_season_id: xp_internal.xp_seasons -> xp.seasons
CREATE OR REPLACE FUNCTION xp.get_active_season_id(p_app_id uuid)
RETURNS uuid
LANGUAGE sql STABLE
SET search_path TO 'xp', 'public'
AS $$
  SELECT id
  FROM xp.seasons
  WHERE app_id = p_app_id
    AND is_active = true
    AND now() BETWEEN starts_at AND ends_at
  LIMIT 1;
$$;

ALTER FUNCTION xp.get_active_season_id(uuid) OWNER TO postgres;


-- 6B. Fix update_daily_streak: restructure malformed exception block
CREATE OR REPLACE FUNCTION xp.update_daily_streak(
  p_lenser_id  uuid,
  p_app_id     uuid,
  p_streak_type text,
  p_event_date date
) RETURNS void
LANGUAGE plpgsql
SET search_path TO 'xp', 'lensers', 'public'
AS $$
DECLARE
  v_current  integer := 0;
  v_longest  integer := 0;
  v_last     date    := NULL;
  v_new_current integer;
  v_new_longest integer;
BEGIN
  -- Fetch existing streak (may not exist)
  BEGIN
    SELECT current_streak, longest_streak, last_occurrence_at
    INTO v_current, v_longest, v_last
    FROM xp.streaks
    WHERE lenser_id  = p_lenser_id
      AND app_id     = p_app_id
      AND streak_type = p_streak_type
    FOR UPDATE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      v_current := 0;
      v_longest := 0;
      v_last    := NULL;
  END;

  -- Calculate new streak
  IF v_last IS NULL THEN
    v_new_current := 1;
  ELSIF p_event_date = v_last THEN
    v_new_current := v_current;  -- same day, keep
  ELSIF p_event_date = v_last + 1 THEN
    v_new_current := v_current + 1;
  ELSE
    v_new_current := 1;  -- streak broken
  END IF;

  v_new_longest := GREATEST(COALESCE(v_longest, 0), v_new_current);

  -- Upsert streak record
  INSERT INTO xp.streaks (
    lenser_id, app_id, streak_type,
    current_streak, longest_streak, last_occurrence_at, updated_at
  )
  VALUES (
    p_lenser_id, p_app_id, p_streak_type,
    v_new_current, v_new_longest, p_event_date, now()
  )
  ON CONFLICT (lenser_id, app_id, streak_type)
  DO UPDATE SET
    current_streak    = EXCLUDED.current_streak,
    longest_streak    = EXCLUDED.longest_streak,
    last_occurrence_at = EXCLUDED.last_occurrence_at,
    updated_at        = EXCLUDED.updated_at;
END;
$$;

ALTER FUNCTION xp.update_daily_streak(uuid, uuid, text, date) OWNER TO postgres;


-- 6C. Rewrite xp.apply() with difficulty multiplier, level update, season & streak calls
CREATE OR REPLACE FUNCTION xp.apply(
  p_lenser_id       uuid,
  p_rule_key        text,
  p_source          xp.source_enum,
  p_source_ref_type text,
  p_source_ref_id   uuid,
  p_app_id          uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xp', 'lensers', 'content', 'public', 'auth'
AS $$
DECLARE
  v_rule          RECORD;
  v_multiplier    numeric(4,2);
  v_effective_xp  integer;
  v_daily_xp      integer;
  v_daily_events  integer;
  v_season_xp     integer;
  v_last_event    timestamptz;
  v_now           timestamptz := now();
  v_new_total     bigint;
  v_new_level     integer;
BEGIN
  -------------------------------------------------------------------
  -- Load rule
  -------------------------------------------------------------------
  SELECT *
  INTO v_rule
  FROM xp.rules
  WHERE action_key = p_rule_key
    AND is_active  = true
    AND (app_id = p_app_id OR app_id = '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY
    CASE WHEN app_id = p_app_id THEN 0 ELSE 1 END  -- prefer exact app match
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- Compute effective XP with difficulty multiplier
  -------------------------------------------------------------------
  SELECT COALESCE(multiplier, 1.0)
  INTO v_multiplier
  FROM xp.difficulty_multipliers
  WHERE difficulty = v_rule.difficulty;

  IF v_multiplier IS NULL THEN
    v_multiplier := 1.0;
  END IF;

  v_effective_xp := CEIL(v_rule.base_xp * v_multiplier);

  -------------------------------------------------------------------
  -- Rule-level cooldown
  -------------------------------------------------------------------
  IF v_rule.cooldown_seconds IS NOT NULL THEN
    SELECT created_at
    INTO v_last_event
    FROM xp.events
    WHERE lenser_id  = p_lenser_id
      AND action_key = p_rule_key
      AND app_id     = p_app_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_event IS NOT NULL
       AND EXTRACT(EPOCH FROM (v_now - v_last_event)) < v_rule.cooldown_seconds THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Max events per day
  -------------------------------------------------------------------
  IF v_rule.max_events_per_day IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_daily_events
    FROM xp.events
    WHERE lenser_id  = p_lenser_id
      AND action_key = p_rule_key
      AND app_id     = p_app_id
      AND created_at >= date_trunc('day', v_now);

    IF v_daily_events >= v_rule.max_events_per_day THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Max XP per day (using effective XP)
  -------------------------------------------------------------------
  IF v_rule.max_xp_per_day IS NOT NULL THEN
    SELECT COALESCE(SUM(xp), 0)
    INTO v_daily_xp
    FROM xp.events
    WHERE lenser_id  = p_lenser_id
      AND action_key = p_rule_key
      AND app_id     = p_app_id
      AND created_at >= date_trunc('day', v_now);

    IF v_daily_xp + v_effective_xp > v_rule.max_xp_per_day THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Season XP cap
  -------------------------------------------------------------------
  IF v_rule.max_xp_per_season IS NOT NULL THEN
    SELECT COALESCE(SUM(xp), 0)
    INTO v_season_xp
    FROM xp.events
    WHERE lenser_id  = p_lenser_id
      AND action_key = p_rule_key
      AND app_id     = p_app_id;

    IF v_season_xp + v_effective_xp > v_rule.max_xp_per_season THEN
      RETURN;
    END IF;
  END IF;

  -------------------------------------------------------------------
  -- Insert event (effective_xp as xp, raw as base_xp)
  -------------------------------------------------------------------
  INSERT INTO xp.events (
    id, lenser_id, app_id, rule_id, action_key,
    xp, base_xp, source, source_ref_type, source_ref_id, created_at
  )
  VALUES (
    gen_random_uuid(),
    p_lenser_id,
    p_app_id,
    v_rule.id,
    p_rule_key,
    v_effective_xp,     -- actual XP awarded (base * multiplier)
    v_rule.base_xp,     -- raw base_xp for audit
    p_source,
    p_source_ref_type,
    p_source_ref_id,
    v_now
  );

  -------------------------------------------------------------------
  -- Update totals + current_level
  -------------------------------------------------------------------
  INSERT INTO xp.totals (lenser_id, app_id, total_xp, current_level)
  VALUES (p_lenser_id, p_app_id, v_effective_xp, 1)
  ON CONFLICT (lenser_id, app_id)
  DO UPDATE SET
    total_xp = xp.totals.total_xp + EXCLUDED.total_xp,
    updated_at = v_now;

  -- Fetch new total and compute level
  SELECT total_xp INTO v_new_total
  FROM xp.totals
  WHERE lenser_id = p_lenser_id AND app_id = p_app_id;

  v_new_level := xp.compute_level_from(p_app_id, v_new_total);

  UPDATE xp.totals
  SET current_level = v_new_level
  WHERE lenser_id = p_lenser_id AND app_id = p_app_id
    AND current_level IS DISTINCT FROM v_new_level;

  -------------------------------------------------------------------
  -- Update season totals
  -------------------------------------------------------------------
  PERFORM xp.update_season_totals(p_app_id, p_lenser_id, v_effective_xp::bigint);

  -------------------------------------------------------------------
  -- Update streak (if rule has streak_type)
  -------------------------------------------------------------------
  IF v_rule.streak_type IS NOT NULL THEN
    PERFORM xp.update_daily_streak(
      p_lenser_id,
      p_app_id,
      v_rule.streak_type,
      v_now::date
    );
  END IF;

END;
$$;

ALTER FUNCTION xp.apply(uuid, text, xp.source_enum, text, uuid, uuid) OWNER TO postgres;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: TRIGGER FUNCTION UPDATES (pass correct p_app_id)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Forum app UUID constant
-- '00000000-0000-0000-0000-000000000001'

CREATE OR REPLACE FUNCTION xp.on_thread_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'THREAD_CREATED',
    p_source          := 'content'::xp.source_enum,
    p_source_ref_type := 'thread',
    p_source_ref_id   := NEW.id,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_thread_created() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_prompt_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'PROMPT_CREATED',
    p_source          := 'content'::xp.source_enum,
    p_source_ref_type := 'prompt',
    p_source_ref_id   := NEW.id,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_prompt_created() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_reply_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'THREAD_REPLY_CREATED',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'thread_reply',
    p_source_ref_id   := NEW.id,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_reply_created() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_reply_received() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT lenser_id INTO v_owner
  FROM content.threads
  WHERE id = NEW.thread_id;

  IF v_owner IS NOT NULL THEN
    PERFORM xp.apply(
      p_lenser_id       := v_owner,
      p_rule_key        := 'THREAD_REPLY_RECEIVED',
      p_source          := 'social'::xp.source_enum,
      p_source_ref_type := 'thread_reply',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_reply_received() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_reaction_given() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.lenser_id,
    p_rule_key        := 'REACTION_GIVEN',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'reaction',
    p_source_ref_id   := NEW.id,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_reaction_given() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_reaction_received() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT lenser_id INTO v_owner
  FROM content.threads
  WHERE id = NEW.target_id;

  IF v_owner IS NOT NULL THEN
    PERFORM xp.apply(
      p_lenser_id       := v_owner,
      p_rule_key        := 'REACTION_RECEIVED',
      p_source          := 'social'::xp.source_enum,
      p_source_ref_type := 'reaction',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_reaction_received() OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.on_thread_engaged() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'xp'
AS $$
BEGIN
  PERFORM xp.apply(
    p_lenser_id       := NEW.viewer_id,
    p_rule_key        := 'THREAD_ENGAGED',
    p_source          := 'social'::xp.source_enum,
    p_source_ref_type := 'thread_view',
    p_source_ref_id   := NEW.thread_id,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION xp.on_thread_engaged() OWNER TO postgres;


-- Arena app UUID: '00000000-0000-0000-0000-000000000002'
CREATE OR REPLACE FUNCTION battles.award_battle_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'battles', 'xp', 'lensers'
AS $$
DECLARE
  v_contender RECORD;
  v_voter     RECORD;
BEGIN
  -- Only fire when status transitions to 'closed'
  IF NEW.status <> 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;

  -- Award XP to all human contenders
  FOR v_contender IN
    SELECT c.contender_ref_id AS lenser_id
    FROM battles.contenders c
    WHERE c.battle_id = NEW.id
      AND c.contender_type = 'human'
  LOOP
    PERFORM xp.apply(
      p_lenser_id       := v_contender.lenser_id,
      p_rule_key        := 'BATTLE_PARTICIPATED',
      p_source          := 'battle'::xp.source_enum,
      p_source_ref_type := 'battle',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
    );
  END LOOP;

  -- Award XP to the winner (if human)
  IF NEW.winner_contender_id IS NOT NULL THEN
    DECLARE
      v_winner RECORD;
    BEGIN
      SELECT c.contender_ref_id AS lenser_id, c.contender_type
      INTO v_winner
      FROM battles.contenders c
      WHERE c.id = NEW.winner_contender_id;

      IF v_winner.contender_type = 'human' THEN
        PERFORM xp.apply(
          p_lenser_id       := v_winner.lenser_id,
          p_rule_key        := 'BATTLE_WON',
          p_source          := 'battle'::xp.source_enum,
          p_source_ref_type := 'battle',
          p_source_ref_id   := NEW.id,
          p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
        );
      END IF;
    END;
  END IF;

  -- Award XP to all voters
  FOR v_voter IN
    SELECT v.voter_lenser_id AS lenser_id
    FROM battles.votes v
    WHERE v.battle_id = NEW.id
  LOOP
    PERFORM xp.apply(
      p_lenser_id       := v_voter.lenser_id,
      p_rule_key        := 'BATTLE_VOTED',
      p_source          := 'battle'::xp.source_enum,
      p_source_ref_type := 'battle',
      p_source_ref_id   := NEW.id,
      p_app_id          := '00000000-0000-0000-0000-000000000002'::uuid
    );
  END LOOP;

  RETURN NEW;
END;
$$;

ALTER FUNCTION battles.award_battle_xp() OWNER TO postgres;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: XP RULES PER APP
-- ═══════════════════════════════════════════════════════════════════════════════

-- Deactivate old lowercase battle rules (safe zero-downtime migration)
UPDATE xp.rules SET is_active = false
WHERE action_key IN ('battle_participated', 'battle_won', 'battle_voted');

-- Forum rules (app_id: 00000000-0000-0000-0000-000000000001)
INSERT INTO xp.rules (id, app_id, action_key, name, description, base_xp, max_xp_per_day, max_events_per_day, cooldown_seconds, difficulty, streak_type, is_active)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'THREAD_CREATED',
   'Thread Created', 'Create a new discussion thread', 25, 200, 10, 60, 'easy', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'THREAD_REPLY_CREATED',
   'Reply Created', 'Reply to a thread', 15, 200, 20, 30, 'easy', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'THREAD_REPLY_RECEIVED',
   'Reply Received', 'Receive a reply on your thread', 5, 150, 50, NULL, 'easy', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'PROMPT_CREATED',
   'Prompt Created', 'Create a new prompt template', 30, 150, 5, 120, 'standard', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'TAG_CREATED',
   'Tag Created', 'Create a new tag', 10, 30, 3, 300, 'easy', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'REACTION_GIVEN',
   'Reaction Given', 'React to content', 5, 100, 30, 5, 'easy', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'REACTION_RECEIVED',
   'Reaction Received', 'Receive a reaction on your content', 3, 200, 100, NULL, 'easy', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'THREAD_ENGAGED',
   'Thread Engaged', 'Engage with a thread (view)', 3, 50, 20, 10, 'easy', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'DAILY_LOGIN',
   'Daily Login', 'Log in to the platform', 10, 10, 1, 86400, 'easy', 'daily_login', true)
ON CONFLICT (app_id, action_key) DO UPDATE SET
  base_xp            = EXCLUDED.base_xp,
  max_xp_per_day     = EXCLUDED.max_xp_per_day,
  max_events_per_day = EXCLUDED.max_events_per_day,
  cooldown_seconds   = EXCLUDED.cooldown_seconds,
  difficulty         = EXCLUDED.difficulty,
  streak_type        = EXCLUDED.streak_type,
  is_active          = EXCLUDED.is_active;


-- Arena rules (app_id: 00000000-0000-0000-0000-000000000002)
INSERT INTO xp.rules (id, app_id, action_key, name, description, base_xp, max_xp_per_day, max_events_per_day, cooldown_seconds, difficulty, streak_type, is_active)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'BATTLE_CREATED',
   'Battle Created', 'Create a new arena battle', 200, 600, 3, 600, 'hard', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'BATTLE_PARTICIPATED',
   'Battle Participated', 'Join a battle as a contender', 150, 600, 5, NULL, 'hard', 'daily_xp', true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'BATTLE_WON',
   'Battle Won', 'Win a battle', 300, 1000, 5, NULL, 'legendary', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'BATTLE_VOTED',
   'Battle Voted', 'Vote on a battle', 20, 200, 20, 10, 'standard', 'daily_xp', true)
ON CONFLICT (app_id, action_key) DO UPDATE SET
  base_xp            = EXCLUDED.base_xp,
  max_xp_per_day     = EXCLUDED.max_xp_per_day,
  max_events_per_day = EXCLUDED.max_events_per_day,
  cooldown_seconds   = EXCLUDED.cooldown_seconds,
  difficulty         = EXCLUDED.difficulty,
  streak_type        = EXCLUDED.streak_type,
  is_active          = EXCLUDED.is_active;


-- CLI rules (app_id: 00000000-0000-0000-0000-000000000003)
INSERT INTO xp.rules (id, app_id, action_key, name, description, base_xp, max_xp_per_day, max_events_per_day, cooldown_seconds, difficulty, streak_type, is_active)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'CLI_INIT',
   'CLI Initialized', 'Initialize the LenserFight CLI', 100, 100, 1, NULL, 'hard', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'CLI_DEPLOY',
   'CLI Deploy', 'Deploy via the CLI', 75, 300, 5, 300, 'hard', 'daily_xp', true)
ON CONFLICT (app_id, action_key) DO UPDATE SET
  base_xp            = EXCLUDED.base_xp,
  max_xp_per_day     = EXCLUDED.max_xp_per_day,
  max_events_per_day = EXCLUDED.max_events_per_day,
  cooldown_seconds   = EXCLUDED.cooldown_seconds,
  difficulty         = EXCLUDED.difficulty,
  streak_type        = EXCLUDED.streak_type,
  is_active          = EXCLUDED.is_active;


-- Auth rules (app_id: 00000000-0000-0000-0000-000000000004)
INSERT INTO xp.rules (id, app_id, action_key, name, description, base_xp, max_xp_per_day, max_events_per_day, cooldown_seconds, difficulty, streak_type, is_active)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 'ACCOUNT_CREATED',
   'Account Created', 'Create a LenserFight account', 5, 5, 1, NULL, 'easy', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', 'PROFILE_COMPLETED',
   'Profile Completed', 'Complete your profile setup', 20, 20, 1, NULL, 'easy', NULL, true)
ON CONFLICT (app_id, action_key) DO UPDATE SET
  base_xp            = EXCLUDED.base_xp,
  max_xp_per_day     = EXCLUDED.max_xp_per_day,
  max_events_per_day = EXCLUDED.max_events_per_day,
  cooldown_seconds   = EXCLUDED.cooldown_seconds,
  difficulty         = EXCLUDED.difficulty,
  streak_type        = EXCLUDED.streak_type,
  is_active          = EXCLUDED.is_active;


-- Contributor rules (app_id: forum — contributions tracked under community)
INSERT INTO xp.rules (id, app_id, action_key, name, description, base_xp, max_xp_per_day, max_events_per_day, cooldown_seconds, max_xp_per_season, difficulty, streak_type, is_active)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CONTRIB_PR_MERGED_MAIN',
   'PR Merged (Main Project)', 'Merge a pull request to the main LenserFight repo', 500, 1500, 3, NULL, 15000, 'legendary', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CONTRIB_PR_MERGED_COMMUNITY',
   'PR Merged (Community)', 'Merge a pull request to a community plugin', 200, 800, 5, NULL, 8000, 'hard', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CONTRIB_PR_MERGED_DOCS',
   'PR Merged (Docs)', 'Merge a pull request to documentation', 100, 500, 5, NULL, 5000, 'standard', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CONTRIB_ISSUE_FILED',
   'Issue Filed', 'File a new issue or bug report', 30, 150, 5, 300, 1500, 'standard', NULL, true),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CONTRIB_REVIEW_GIVEN',
   'Code Review Given', 'Review a pull request', 50, 250, 5, 60, 2500, 'hard', NULL, true)
ON CONFLICT (app_id, action_key) DO UPDATE SET
  base_xp            = EXCLUDED.base_xp,
  max_xp_per_day     = EXCLUDED.max_xp_per_day,
  max_events_per_day = EXCLUDED.max_events_per_day,
  cooldown_seconds   = EXCLUDED.cooldown_seconds,
  max_xp_per_season  = EXCLUDED.max_xp_per_season,
  difficulty         = EXCLUDED.difficulty,
  streak_type        = EXCLUDED.streak_type,
  is_active          = EXCLUDED.is_active;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: PER-APP LEVEL CURVES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Only generate curves if the app has no levels yet (idempotent)

DO $$
BEGIN
  -- Forum: easy progression
  IF NOT EXISTS (SELECT 1 FROM xp.levels WHERE app_id = '00000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    PERFORM xp.seed_default_curve(
      '00000000-0000-0000-0000-000000000001'::uuid, 100, 30, 1.3
    );
  END IF;

  -- Arena: hard progression
  IF NOT EXISTS (SELECT 1 FROM xp.levels WHERE app_id = '00000000-0000-0000-0000-000000000002' LIMIT 1) THEN
    PERFORM xp.seed_default_curve(
      '00000000-0000-0000-0000-000000000002'::uuid, 100, 80, 1.6
    );
  END IF;

  -- CLI: medium-hard progression
  IF NOT EXISTS (SELECT 1 FROM xp.levels WHERE app_id = '00000000-0000-0000-0000-000000000003' LIMIT 1) THEN
    PERFORM xp.seed_default_curve(
      '00000000-0000-0000-0000-000000000003'::uuid, 100, 60, 1.5
    );
  END IF;

  -- Auth: easy, short curve
  IF NOT EXISTS (SELECT 1 FROM xp.levels WHERE app_id = '00000000-0000-0000-0000-000000000004' LIMIT 1) THEN
    PERFORM xp.seed_default_curve(
      '00000000-0000-0000-0000-000000000004'::uuid, 20, 20, 1.2
    );
  END IF;

  -- Global: default curve (only if empty)
  IF NOT EXISTS (SELECT 1 FROM xp.levels WHERE app_id = '00000000-0000-0000-0000-000000000000' LIMIT 1) THEN
    PERFORM xp.seed_default_curve(
      '00000000-0000-0000-0000-000000000000'::uuid, 100, 50, 1.5
    );
  END IF;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: CONTRIBUTOR XP FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION xp.grant_contribution_xp(
  p_lenser_id         uuid,
  p_context           xp.contribution_context_enum,
  p_contribution_type text,
  p_external_ref      text    DEFAULT NULL,
  p_title             text    DEFAULT NULL,
  p_metadata          jsonb   DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xp', 'lensers', 'public'
AS $$
DECLARE
  v_rule_key    text;
  v_event_id    uuid;
  v_contrib_id  uuid;
BEGIN
  -- Map (context, contribution_type) to rule key
  CASE
    WHEN p_contribution_type = 'pr_merged' AND p_context = 'main_project' THEN
      v_rule_key := 'CONTRIB_PR_MERGED_MAIN';
    WHEN p_contribution_type = 'pr_merged' AND p_context = 'community_plugin' THEN
      v_rule_key := 'CONTRIB_PR_MERGED_COMMUNITY';
    WHEN p_contribution_type = 'pr_merged' AND p_context = 'documentation' THEN
      v_rule_key := 'CONTRIB_PR_MERGED_DOCS';
    WHEN p_contribution_type = 'pr_merged' AND p_context = 'infrastructure' THEN
      v_rule_key := 'CONTRIB_PR_MERGED_COMMUNITY';  -- treat infra same as community
    WHEN p_contribution_type = 'issue_filed' THEN
      v_rule_key := 'CONTRIB_ISSUE_FILED';
    WHEN p_contribution_type = 'review_given' THEN
      v_rule_key := 'CONTRIB_REVIEW_GIVEN';
    ELSE
      RAISE EXCEPTION 'Unknown contribution type: % / %', p_context, p_contribution_type;
  END CASE;

  -- Award XP via the standard pipeline (source = 'contribution', tracked under forum app)
  PERFORM xp.apply(
    p_lenser_id       := p_lenser_id,
    p_rule_key        := v_rule_key,
    p_source          := 'contribution'::xp.source_enum,
    p_source_ref_type := 'contribution',
    p_source_ref_id   := NULL,
    p_app_id          := '00000000-0000-0000-0000-000000000001'::uuid
  );

  -- Fetch the event just created (most recent for this lenser + rule)
  SELECT id INTO v_event_id
  FROM xp.events
  WHERE lenser_id  = p_lenser_id
    AND action_key = v_rule_key
  ORDER BY created_at DESC
  LIMIT 1;

  -- Record the contribution
  INSERT INTO xp.contributions (
    lenser_id, context, contribution_type,
    external_ref, title, verified_by,
    xp_event_id, metadata
  )
  VALUES (
    p_lenser_id, p_context, p_contribution_type,
    p_external_ref, p_title, 'system',
    v_event_id, p_metadata
  )
  RETURNING id INTO v_contrib_id;

  RETURN v_contrib_id;
END;
$$;

ALTER FUNCTION xp.grant_contribution_xp(uuid, xp.contribution_context_enum, text, text, text, jsonb) OWNER TO postgres;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: AUTOMATIC SEASON MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION xp.auto_create_next_season(
  p_app_id        uuid,
  p_duration_days int DEFAULT 90
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xp', 'public'
AS $$
DECLARE
  v_latest       RECORD;
  v_new_id       uuid;
  v_season_num   int;
  v_app_slug     text;
  v_new_slug     text;
  v_starts_at    timestamptz;
BEGIN
  -- Get the latest season for this app (active or not)
  SELECT id, starts_at, ends_at, is_active, slug
  INTO v_latest
  FROM xp.seasons
  WHERE app_id = p_app_id
  ORDER BY ends_at DESC
  LIMIT 1;

  -- If active season not yet ended, nothing to do
  IF v_latest IS NOT NULL AND v_latest.is_active AND v_latest.ends_at > now() THEN
    RETURN NULL;
  END IF;

  -- Deactivate the latest season if it was still marked active
  IF v_latest IS NOT NULL AND v_latest.is_active THEN
    UPDATE xp.seasons SET is_active = false WHERE id = v_latest.id;
  END IF;

  -- Compute next season number
  SELECT COUNT(*) + 1 INTO v_season_num
  FROM xp.seasons WHERE app_id = p_app_id;

  -- Get app slug for naming
  SELECT slug INTO v_app_slug FROM xp.apps WHERE id = p_app_id;
  v_new_slug := 's' || v_season_num || '_' || COALESCE(v_app_slug, 'app');

  -- Determine start time: after previous season, or now if gap > 7 days
  IF v_latest IS NOT NULL AND (now() - v_latest.ends_at) < interval '7 days' THEN
    v_starts_at := v_latest.ends_at;
  ELSE
    v_starts_at := now();
  END IF;

  -- Create the new season
  INSERT INTO xp.seasons (id, app_id, slug, name, starts_at, ends_at, is_active)
  VALUES (
    gen_random_uuid(),
    p_app_id,
    v_new_slug,
    initcap(replace(v_new_slug, '_', ' ')),
    v_starts_at,
    v_starts_at + (p_duration_days || ' days')::interval,
    true
  )
  RETURNING id INTO v_new_id;

  RAISE NOTICE 'Created season % for app %', v_new_slug, p_app_id;
  RETURN v_new_id;
END;
$$;

ALTER FUNCTION xp.auto_create_next_season(uuid, int) OWNER TO postgres;


CREATE OR REPLACE FUNCTION xp.check_all_seasons() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xp', 'public'
AS $$
DECLARE
  v_app RECORD;
BEGIN
  FOR v_app IN
    SELECT id FROM xp.apps WHERE is_active = true
  LOOP
    PERFORM xp.auto_create_next_season(v_app.id);
  END LOOP;
END;
$$;

ALTER FUNCTION xp.check_all_seasons() OWNER TO postgres;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: SEED INITIAL SEASONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create Season 1 for each app (idempotent)
DO $$
DECLARE
  v_app RECORD;
BEGIN
  FOR v_app IN
    SELECT id, slug FROM xp.apps WHERE is_active = true
  LOOP
    IF NOT EXISTS (SELECT 1 FROM xp.seasons WHERE app_id = v_app.id LIMIT 1) THEN
      INSERT INTO xp.seasons (id, app_id, slug, name, starts_at, ends_at, is_active)
      VALUES (
        gen_random_uuid(),
        v_app.id,
        's1_' || v_app.slug,
        'Season 1 ' || initcap(v_app.slug),
        now(),
        now() + interval '90 days',
        true
      );
    END IF;
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 13: PG_CRON SCHEDULE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Daily midnight check for season rollover (idempotent)
DO $cron_block$
BEGIN
  -- Only schedule if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'xp-season-check',
      '0 0 * * *',
      'SELECT xp.check_all_seasons()'
    );
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available, skipping season automation scheduling';
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping season automation scheduling';
END;
$cron_block$;
