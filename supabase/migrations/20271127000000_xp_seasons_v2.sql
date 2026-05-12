-- =============================================================================
-- Phase CB — XP & Seasons v2: expanded rules, season metadata, streak/level-up
--            RPCs, badge milestone trigger, XP freeze for moderation
-- =============================================================================
-- Changes:
--   1. xp.seasons: add description, reward_description, featured_challenges
--   2. New XP rules for missing actions across Forum + Battles apps
--   3. fn_xp_get_streak(p_lenser_id)         — caller or target streak summary
--   4. fn_xp_get_level_ups(p_lenser_id, p_limit) — level-up history
--   5. fn_xp_get_seasons(p_app_id)           — all seasons with computed status
--   6. fn_badge_check_and_award(p_lenser_id) — milestone badge awards
--   7. fn_xp_freeze_content(p_source_ref_type, p_source_ref_id)  — moderation freeze
--   8. trg_xp_levelup_badge_check            — auto badge check on new level_ups row
--   9. GRANT / RLS additions for new functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. xp.seasons — add metadata columns
-- ---------------------------------------------------------------------------

ALTER TABLE xp.seasons
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS reward_description TEXT,
  ADD COLUMN IF NOT EXISTS featured_challenges JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN xp.seasons.description         IS 'CB: Human-readable season narrative shown in the season dashboard.';
COMMENT ON COLUMN xp.seasons.reward_description  IS 'CB: Description of seasonal rewards (badges, titles, bonuses).';
COMMENT ON COLUMN xp.seasons.featured_challenges IS 'CB: Array of {title, description, xp_reward, rule_key} objects.';

-- ---------------------------------------------------------------------------
-- 2. New XP rules — upserted into existing apps
--    All new rules follow same (app_id, action_key) unique constraint.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_forum_app   CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_battles_app CONSTANT uuid := '00000000-0000-0000-0000-000000000002';
BEGIN

  -- ---- Forum App — new rules -----------------------------------------------
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    -- Workflow explicitly published (visibility set to public for the first time)
    (v_forum_app, 'WORKFLOW_PUBLISHED', 'Workflow Published',
     'One-time XP when a workflow transitions from private/draft to public.',
     40, 7200, 2, 80, 800, 'standard', NULL, true),

    -- User explicitly runs a public workflow created by another lenser
    (v_forum_app, 'WORKFLOW_RUN_RECEIVED', 'Workflow Run Received',
     'Award XP when your public workflow is run by another lenser.',
     6, NULL, 50, 200, 1500, 'easy', NULL, true),

    -- Tutorial completed (verified server-side by tutorial progress tracker)
    (v_forum_app, 'TUTORIAL_COMPLETED', 'Tutorial Completed',
     'One-time XP per tutorial when the final step is marked complete.',
     60, NULL, 3, 180, 600, 'standard', NULL, true),

    -- Agent walkthrough completed (structured guide with checkpoints)
    (v_forum_app, 'WALKTHROUGH_COMPLETED', 'Walkthrough Completed',
     'XP for completing a multi-step agent walkthrough guide.',
     80, NULL, 2, 160, 480, 'standard', NULL, true),

    -- Seasonal challenge completed (featured challenge in active season)
    (v_forum_app, 'CHALLENGE_COMPLETED', 'Seasonal Challenge Completed',
     'Bonus XP for completing a featured seasonal challenge.',
     200, NULL, 5, 1000, 2000, 'hard', NULL, true),

    -- 14-day streak (between 7D and 30D)
    (v_forum_app, 'STREAK_BONUS_14D', '14-Day Streak Bonus',
     'Bonus XP for maintaining a 14-consecutive-day login streak.',
     80, 1209600, 1, 80, 320, 'standard', 'daily', true),

    -- Multilingual content creation (lens or thread published in a non-English locale)
    (v_forum_app, 'MULTILINGUAL_CONTENT_CREATED', 'Multilingual Content Published',
     'XP for publishing a lens or thread tagged with a non-English locale.',
     30, 3600, 5, 120, 600, 'standard', NULL, true),

    -- Generative media artifact created and published
    (v_forum_app, 'GENERATIVE_MEDIA_CREATED', 'Generative Media Published',
     'XP for publishing a battle or lens output that includes an AI-generated media artifact (image, audio, video).',
     25, 1800, 5, 100, 500, 'standard', NULL, true),

    -- Invite accepted (referred user completes profile)
    (v_forum_app, 'INVITE_ACCEPTED', 'Invite Accepted',
     'XP when a lenser you invited completes their profile setup.',
     100, NULL, 5, 500, 1000, 'hard', NULL, true),

    -- Invite sent (one-time small bonus per valid invite sent)
    (v_forum_app, 'INVITE_SENT', 'Invite Sent',
     'Small XP for sending a platform invite. Caps prevent invite spam.',
     10, 3600, 3, 30, 150, 'easy', NULL, true),

    -- Agent created by user (first agent connected to account)
    (v_forum_app, 'AGENT_CREATED', 'Agent Created',
     'One-time XP when a lenser creates and configures their first AI agent.',
     80, NULL, 1, 80, 80, 'standard', NULL, true),

    -- Prompt / Lens created (explicit prompt-first creation, separate from LENS_CREATED which is publish)
    (v_forum_app, 'PROMPT_CREATED', 'Prompt Created',
     'XP for creating a new prompt/lens (draft saved; distinct from publish XP).',
     15, 1800, 5, 60, 400, 'easy', NULL, true),

    -- CLI init (first time lf init is run, linked to account)
    (v_forum_app, 'CLI_INIT', 'CLI Initialized',
     'One-time XP for initializing the LenserFight CLI with a valid account.',
     50, NULL, 1, 50, 50, 'standard', NULL, true),

    -- Account created (welcome bonus; one-time)
    (v_forum_app, 'ACCOUNT_CREATED', 'Account Created',
     'One-time welcome XP when a new account is created and email is verified.',
     25, NULL, 1, 25, 25, 'easy', NULL, true)

  ON CONFLICT (app_id, action_key) DO UPDATE SET
    name               = EXCLUDED.name,
    description        = EXCLUDED.description,
    base_xp            = EXCLUDED.base_xp,
    cooldown_seconds   = EXCLUDED.cooldown_seconds,
    max_events_per_day = EXCLUDED.max_events_per_day,
    max_xp_per_day     = EXCLUDED.max_xp_per_day,
    max_xp_per_season  = EXCLUDED.max_xp_per_season,
    difficulty         = EXCLUDED.difficulty,
    streak_type        = EXCLUDED.streak_type,
    is_active          = EXCLUDED.is_active;

  -- ---- Battles App — new rules ---------------------------------------------
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    -- Explicit battle join before participation closes
    (v_battles_app, 'BATTLE_JOINED', 'Battle Joined',
     'XP for joining a public battle as a contender (before submission deadline).',
     20, 3600, 5, 100, 500, 'easy', NULL, true),

    -- Battle ranked top 3 (distinct from BATTLE_WON — covers 2nd/3rd place)
    (v_battles_app, 'BATTLE_RANKED_TOP_3', 'Battle Top 3 Finish',
     'Bonus XP for finishing in the top 3 of a public battle with 4+ contestants.',
     75, NULL, 3, 225, 1500, 'hard', NULL, true),

    -- Battle result published to public profile
    (v_battles_app, 'BATTLE_RESULT_PUBLISHED', 'Battle Result Published',
     'XP for publishing a battle result to your public profile.',
     20, 7200, 3, 60, 300, 'easy', NULL, true),

    -- Submission evaluated and accepted by judge
    (v_battles_app, 'BATTLE_SUBMISSION_COMPLETED', 'Battle Submission Evaluated',
     'XP when a battle submission passes judge evaluation. Rewarded once per submission.',
     30, NULL, 5, 150, 750, 'standard', NULL, true),

    -- Fair evaluation provided (voting quality signal)
    (v_battles_app, 'FAIR_EVALUATION_COMPLETED', 'Fair Evaluation Cast',
     'XP for casting a vote that aligns with consensus (quality signal from judge).',
     15, 600, 10, 150, 750, 'standard', NULL, true)

  ON CONFLICT (app_id, action_key) DO UPDATE SET
    name               = EXCLUDED.name,
    description        = EXCLUDED.description,
    base_xp            = EXCLUDED.base_xp,
    cooldown_seconds   = EXCLUDED.cooldown_seconds,
    max_events_per_day = EXCLUDED.max_events_per_day,
    max_xp_per_day     = EXCLUDED.max_xp_per_day,
    max_xp_per_season  = EXCLUDED.max_xp_per_season,
    difficulty         = EXCLUDED.difficulty,
    streak_type        = EXCLUDED.streak_type,
    is_active          = EXCLUDED.is_active;

END;
$$;

-- ---------------------------------------------------------------------------
-- 3. fn_xp_get_streak — public RPC, returns caller's streak for a streak_type
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_xp_get_streak(
  p_lenser_id   UUID,
  p_streak_type TEXT DEFAULT 'daily'
)
RETURNS TABLE(
  lenser_id      UUID,
  streak_type    TEXT,
  current_streak INT,
  best_streak    INT,
  last_update_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = xp, public
AS $$
BEGIN
  -- RLS: callers may only read own streak; service_role reads any
  IF auth.uid() IS DISTINCT FROM p_lenser_id
     AND current_setting('role', true) NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'permission_denied'
      USING ERRCODE = '42501',
            DETAIL  = 'You may only read your own streak.',
            HINT    = 'permission_denied';
  END IF;

  RETURN QUERY
  SELECT
    s.lenser_id,
    s.streak_type,
    s.current_streak,
    s.best_streak,
    s.last_update_at
  FROM xp.streaks s
  WHERE s.lenser_id    = p_lenser_id
    AND s.streak_type  = p_streak_type;
END;
$$;

COMMENT ON FUNCTION public.fn_xp_get_streak IS
  'CB: Returns streak info for a lenser. SECURITY DEFINER — callers may only read own streak.';

-- ---------------------------------------------------------------------------
-- 4. fn_xp_get_level_ups — public RPC, recent level-up history
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_xp_get_level_ups(
  p_lenser_id UUID,
  p_limit     INT DEFAULT 20
)
RETURNS TABLE(
  id           UUID,
  old_level    INT,
  new_level    INT,
  total_xp_at  BIGINT,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = xp, public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_lenser_id
     AND current_setting('role', true) NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'permission_denied'
      USING ERRCODE = '42501',
            DETAIL  = 'You may only read your own level-up history.',
            HINT    = 'permission_denied';
  END IF;

  RETURN QUERY
  SELECT
    lu.id,
    lu.old_level,
    lu.new_level,
    lu.total_xp_at,
    lu.created_at
  FROM xp.level_ups lu
  WHERE lu.lenser_id = p_lenser_id
  ORDER BY lu.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$;

COMMENT ON FUNCTION public.fn_xp_get_level_ups IS
  'CB: Returns level-up history for a lenser. SECURITY DEFINER — callers may only read own history.';

-- ---------------------------------------------------------------------------
-- 5. fn_xp_get_seasons — returns all seasons for an app with computed status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_xp_get_seasons(
  p_app_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS TABLE(
  id                   UUID,
  slug                 TEXT,
  name                 TEXT,
  description          TEXT,
  reward_description   TEXT,
  featured_challenges  JSONB,
  starts_at            TIMESTAMPTZ,
  ends_at              TIMESTAMPTZ,
  is_active            BOOLEAN,
  status               TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = xp, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.slug,
    s.name,
    s.description,
    s.reward_description,
    s.featured_challenges,
    s.starts_at,
    s.ends_at,
    s.is_active,
    CASE
      WHEN s.is_active                    THEN 'active'
      WHEN s.starts_at > now()            THEN 'upcoming'
      ELSE                                     'ended'
    END AS status
  FROM xp.seasons s
  WHERE s.app_id = p_app_id
  ORDER BY s.starts_at DESC;
END;
$$;

COMMENT ON FUNCTION public.fn_xp_get_seasons IS
  'CB: Returns all seasons for an app with computed status (active/upcoming/ended).';

-- ---------------------------------------------------------------------------
-- 6. fn_badge_check_and_award — checks XP milestones and awards badges
--    Called by service_role after XP is applied; also wired to level_ups trigger.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_badge_check_and_award(
  p_lenser_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lensers, xp, public
AS $$
DECLARE
  v_total_xp   BIGINT;
  v_level      INT;
  v_streak     INT;
  v_forum_app  CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Fetch current XP + level
  SELECT total_xp, current_level
    INTO v_total_xp, v_level
    FROM xp.totals
   WHERE lenser_id = p_lenser_id
     AND app_id    = v_forum_app;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Fetch daily streak
  SELECT current_streak
    INTO v_streak
    FROM xp.streaks
   WHERE lenser_id   = p_lenser_id
     AND streak_type = 'daily';

  -- ---- Level milestone badges -------------------------------------------
  -- Newcomer  (level 5)
  IF v_level >= 5 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_5', 'Newcomer', 'Reached Level 5', '🌱')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Builder (level 10)
  IF v_level >= 10 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_10', 'Builder', 'Reached Level 10', '🏗️')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Expert (level 25)
  IF v_level >= 25 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_25', 'Expert', 'Reached Level 25', '⚡')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Architect (level 50)
  IF v_level >= 50 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_50', 'Architect', 'Reached Level 50', '🏛️')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Legend (level 75)
  IF v_level >= 75 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_75', 'Legend', 'Reached Level 75', '🌟')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Champion (level 100)
  IF v_level >= 100 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'level_milestone_100', 'Champion', 'Reached Level 100 — all-time elite', '🏆')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---- XP milestone badges -----------------------------------------------
  IF v_total_xp >= 1000 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'xp_1k', '1K XP', 'Earned 1,000 total XP', '💡')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total_xp >= 10000 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'xp_10k', '10K XP', 'Earned 10,000 total XP', '🔥')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total_xp >= 50000 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'xp_50k', '50K XP', 'Earned 50,000 total XP', '💎')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ---- Streak milestone badges -------------------------------------------
  IF v_streak >= 7 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'streak_7d', '7-Day Streak', 'Logged in 7 days in a row', '🔆')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_streak >= 30 THEN
    INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
    VALUES (p_lenser_id, 'streak_30d', '30-Day Streak', 'Logged in 30 days in a row', '☀️')
    ON CONFLICT DO NOTHING;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: badge award errors must not roll back the parent XP transaction
  RAISE NOTICE 'fn_badge_check_and_award: % (lenser=%)', SQLERRM, p_lenser_id;
END;
$$;

COMMENT ON FUNCTION public.fn_badge_check_and_award IS
  'CB: Awards milestone badges based on XP totals, level, and streak. SECURITY DEFINER. Non-fatal on error.';

-- Unique constraint on (lenser_id, type) so ON CONFLICT DO NOTHING works
ALTER TABLE lensers.badges
  ADD CONSTRAINT badges_lenser_type_unique UNIQUE (lenser_id, type);

-- ---------------------------------------------------------------------------
-- 7. Trigger: auto-check badge milestones when a new level_up is recorded
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION xp.fn_trigger_badge_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xp, public
AS $$
BEGIN
  PERFORM public.fn_badge_check_and_award(NEW.lenser_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fn_trigger_badge_check: % (lenser=%)', SQLERRM, NEW.lenser_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_levelup_badge_check ON xp.level_ups;
CREATE TRIGGER trg_xp_levelup_badge_check
  AFTER INSERT ON xp.level_ups
  FOR EACH ROW
  EXECUTE FUNCTION xp.fn_trigger_badge_check();

COMMENT ON TRIGGER trg_xp_levelup_badge_check ON xp.level_ups IS
  'CB: Fires fn_badge_check_and_award after each level-up insert.';

-- ---------------------------------------------------------------------------
-- 8. fn_xp_freeze_content — marks XP events for a content item as frozen
--    (moderated/deleted content). Does NOT delete events; marks meta->frozen.
--    Called by service_role only via moderation workflows.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_xp_freeze_content(
  p_source_ref_type TEXT,
  p_source_ref_id   UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xp, public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Restrict to service_role / supabase_admin
  IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'permission_denied'
      USING ERRCODE = '42501',
            DETAIL  = 'fn_xp_freeze_content is restricted to service_role.',
            HINT    = 'permission_denied';
  END IF;

  -- Mark XP events as frozen in their meta JSONB without deleting the audit trail
  UPDATE xp.events
  SET meta = COALESCE(meta, '{}'::jsonb) || '{"frozen": true, "freeze_reason": "moderated_content"}'::jsonb
  WHERE source_ref_type = p_source_ref_type
    AND source_ref_id   = p_source_ref_id
    AND NOT COALESCE((meta->>'frozen')::boolean, false);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RAISE NOTICE 'fn_xp_freeze_content: froze % events for %/%', v_count, p_source_ref_type, p_source_ref_id;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_xp_freeze_content IS
  'CB: Marks XP events for moderated/deleted content as frozen. Preserves audit trail; service_role only.';

-- ---------------------------------------------------------------------------
-- 9. GRANTs for new public functions
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.fn_xp_get_streak         TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_xp_get_level_ups      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_xp_get_seasons        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_badge_check_and_award TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_xp_freeze_content     TO service_role;

-- ---------------------------------------------------------------------------
-- 10. Update xp.policy version to 2.0.0
-- ---------------------------------------------------------------------------

UPDATE xp.policy
SET policy = policy || '{
  "version": "2.0.0",
  "updated_at": "2026-05-12",
  "changes_v2": [
    "Added 19 new XP rules: WORKFLOW_PUBLISHED, WORKFLOW_RUN_RECEIVED, TUTORIAL_COMPLETED, WALKTHROUGH_COMPLETED, CHALLENGE_COMPLETED, STREAK_BONUS_14D, MULTILINGUAL_CONTENT_CREATED, GENERATIVE_MEDIA_CREATED, INVITE_ACCEPTED, INVITE_SENT, AGENT_CREATED, PROMPT_CREATED, CLI_INIT, ACCOUNT_CREATED, BATTLE_JOINED, BATTLE_RANKED_TOP_3, BATTLE_RESULT_PUBLISHED, BATTLE_SUBMISSION_COMPLETED, FAIR_EVALUATION_COMPLETED",
    "xp.seasons: added description, reward_description, featured_challenges columns",
    "Added fn_xp_get_streak, fn_xp_get_level_ups, fn_xp_get_seasons public RPCs",
    "Added fn_badge_check_and_award milestone badge system with 11 badge types",
    "Added trg_xp_levelup_badge_check auto-trigger on level_ups",
    "Added fn_xp_freeze_content for moderation workflows",
    "Added unique constraint on lensers.badges(lenser_id, type)"
  ]
}'::jsonb;
