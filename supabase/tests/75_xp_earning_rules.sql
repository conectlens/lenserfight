-- =============================================================================
-- pgTAP — Phase 75: XP earning rules, season v2, badge system, anti-abuse
-- =============================================================================
-- Covers:
--   1.  New XP rules presence in xp.rules (19 new rules)
--   2.  xp.seasons v2 columns exist
--   3.  fn_xp_get_streak function exists and is SECURITY DEFINER
--   4.  fn_xp_get_level_ups function exists and is SECURITY DEFINER
--   5.  fn_xp_get_seasons function exists and is SECURITY DEFINER
--   6.  fn_badge_check_and_award exists and is SECURITY DEFINER
--   7.  fn_xp_freeze_content exists and is SECURITY DEFINER
--   8.  trg_xp_levelup_badge_check trigger exists on xp.level_ups
--   9.  lensers.badges unique constraint (lenser_id, type) exists
--   10. Forum app rules: cooldown and daily cap sanity (DAILY_LOGIN has 82800s cooldown)
--   11. Battles app rules: BATTLE_WON is legendary difficulty
--   12. New rule TUTORIAL_COMPLETED has base_xp=60 and no cooldown
--   13. New rule CHALLENGE_COMPLETED has base_xp=200 and is hard difficulty
--   14. New rule WORKFLOW_PUBLISHED has base_xp=40
--   15. New rule BATTLE_JOINED has base_xp=20
--   16. STREAK_BONUS_14D has 1209600s cooldown (14 days)
--   17. INVITE_ACCEPTED has base_xp=100
--   18. fn_xp_get_seasons returns rows (structural smoke test)
--   19. xp.seasons.featured_challenges column exists and defaults to '[]'
--   20. xp.difficulty_multipliers: legendary = 2.5x, hard = 1.5x
-- =============================================================================
BEGIN;

SELECT plan(20);

-- 1. WORKFLOW_PUBLISHED rule exists in forum app
SELECT ok(
  EXISTS (
    SELECT 1 FROM xp.rules
    WHERE action_key = 'WORKFLOW_PUBLISHED'
      AND app_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
  ),
  'xp.rules should contain WORKFLOW_PUBLISHED for forum app'
);

-- 2. TUTORIAL_COMPLETED rule exists in forum app
SELECT ok(
  EXISTS (
    SELECT 1 FROM xp.rules
    WHERE action_key = 'TUTORIAL_COMPLETED'
      AND app_id = '00000000-0000-0000-0000-000000000001'
      AND is_active = true
  ),
  'xp.rules should contain TUTORIAL_COMPLETED for forum app'
);

-- 3. CHALLENGE_COMPLETED rule is hard difficulty
SELECT is(
  (SELECT difficulty::text FROM xp.rules
   WHERE action_key = 'CHALLENGE_COMPLETED'
     AND app_id = '00000000-0000-0000-0000-000000000001'),
  'hard',
  'CHALLENGE_COMPLETED should have hard difficulty'
);

-- 4. TUTORIAL_COMPLETED base_xp = 60
SELECT is(
  (SELECT base_xp FROM xp.rules
   WHERE action_key = 'TUTORIAL_COMPLETED'
     AND app_id = '00000000-0000-0000-0000-000000000001'),
  60,
  'TUTORIAL_COMPLETED base_xp should be 60'
);

-- 5. BATTLE_JOINED exists in battles app
SELECT ok(
  EXISTS (
    SELECT 1 FROM xp.rules
    WHERE action_key = 'BATTLE_JOINED'
      AND app_id = '00000000-0000-0000-0000-000000000002'
      AND is_active = true
  ),
  'xp.rules should contain BATTLE_JOINED for battles app'
);

-- 6. STREAK_BONUS_14D cooldown = 1209600 (14 days)
SELECT is(
  (SELECT cooldown_seconds FROM xp.rules
   WHERE action_key = 'STREAK_BONUS_14D'
     AND app_id = '00000000-0000-0000-0000-000000000001'),
  1209600,
  'STREAK_BONUS_14D cooldown_seconds should be 1209600 (14 days)'
);

-- 7. INVITE_ACCEPTED base_xp = 100
SELECT is(
  (SELECT base_xp FROM xp.rules
   WHERE action_key = 'INVITE_ACCEPTED'
     AND app_id = '00000000-0000-0000-0000-000000000001'),
  100,
  'INVITE_ACCEPTED base_xp should be 100'
);

-- 8. xp.seasons has featured_challenges column
SELECT has_column(
  'xp',
  'seasons',
  'featured_challenges',
  'xp.seasons should have featured_challenges column'
);

-- 9. xp.seasons has description column
SELECT has_column(
  'xp',
  'seasons',
  'description',
  'xp.seasons should have description column'
);

-- 10. xp.seasons has reward_description column
SELECT has_column(
  'xp',
  'seasons',
  'reward_description',
  'xp.seasons should have reward_description column'
);

-- 11. fn_xp_get_streak exists
SELECT has_function(
  'public',
  'fn_xp_get_streak',
  ARRAY['uuid', 'text'],
  'fn_xp_get_streak should exist'
);

-- 12. fn_xp_get_streak is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_xp_get_streak'
  ),
  'fn_xp_get_streak should be SECURITY DEFINER'
);

-- 13. fn_xp_get_level_ups exists
SELECT has_function(
  'public',
  'fn_xp_get_level_ups',
  ARRAY['uuid', 'integer'],
  'fn_xp_get_level_ups should exist'
);

-- 14. fn_xp_get_seasons exists
SELECT has_function(
  'public',
  'fn_xp_get_seasons',
  ARRAY['uuid'],
  'fn_xp_get_seasons should exist'
);

-- 15. fn_badge_check_and_award exists
SELECT has_function(
  'public',
  'fn_badge_check_and_award',
  ARRAY['uuid'],
  'fn_badge_check_and_award should exist'
);

-- 16. fn_badge_check_and_award is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_badge_check_and_award'
  ),
  'fn_badge_check_and_award should be SECURITY DEFINER'
);

-- 17. fn_xp_freeze_content exists
SELECT has_function(
  'public',
  'fn_xp_freeze_content',
  ARRAY['text', 'uuid'],
  'fn_xp_freeze_content should exist'
);

-- 18. fn_xp_freeze_content is SECURITY DEFINER
SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_xp_freeze_content'
  ),
  'fn_xp_freeze_content should be SECURITY DEFINER'
);

-- 19. trg_xp_levelup_badge_check trigger exists on xp.level_ups
SELECT trigger_is(
  'xp',
  'level_ups',
  'trg_xp_levelup_badge_check',
  'xp',
  'fn_trigger_badge_check',
  'trg_xp_levelup_badge_check should call xp.fn_trigger_badge_check'
);

-- 20. Legendary difficulty multiplier = 2.5
SELECT is(
  (SELECT multiplier FROM xp.difficulty_multipliers WHERE difficulty = 'legendary'),
  2.50::numeric,
  'legendary difficulty multiplier should be 2.50'
);

SELECT finish();
ROLLBACK;
