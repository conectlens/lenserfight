-- =============================================================================
-- 17. XP RULESET: Production-ready XP rules, levels, multipliers, apps, policy
-- =============================================================================
-- Fairness policy:
--   - Only public + published content earns creation XP
--   - Visibility changes trigger XP rollback (handled in migration)
--   - Self-interaction XP is blocked (handled in migration)
--   - Season caps prevent abuse within a 90-day window
--   - Daily caps + cooldowns prevent rapid-fire farming
--
-- Level targets (base=150, power=0.75):
--   Level 10  ≈   4,400 XP  (newcomer milestone)
--   Level 25  ≈  22,500 XP  (established user)
--   Level 50  ≈  92,000 XP  (active power user)
--   Level 75  ≈ 191,000 XP  (elite user)
--   Level 100 ≈ 330,000 XP  (champion, 5+ years)
--
-- Annual XP bands:
--   Casual  (1-2×/week): 5,000 – 15,000 XP/year
--   Regular (daily):    20,000 – 40,000 XP/year
--   Power   (intense):  40,000 – 80,000 XP/year
-- =============================================================================

DO $$
DECLARE
  v_forum_app   CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_battles_app CONSTANT uuid := '00000000-0000-0000-0000-000000000002';
BEGIN

  -- =========================================================================
  -- STEP 1: XP APPS
  -- =========================================================================
  INSERT INTO xp.apps (id, slug, name, difficulty, is_active)
  VALUES
    (v_forum_app,   'forum',   'LenserFight Forum',   'standard', true),
    (v_battles_app, 'battles', 'LenserFight Battles', 'hard',     true)
  ON CONFLICT (id) DO UPDATE SET
    name      = EXCLUDED.name,
    difficulty = EXCLUDED.difficulty,
    is_active  = EXCLUDED.is_active;

  -- =========================================================================
  -- STEP 2: DIFFICULTY MULTIPLIERS
  -- =========================================================================
  INSERT INTO xp.difficulty_multipliers (difficulty, multiplier, label)
  VALUES
    ('easy',      0.75, 'Easy'),
    ('standard',  1.00, 'Standard'),
    ('hard',      1.50, 'Hard'),
    ('legendary', 2.50, 'Legendary')
  ON CONFLICT (difficulty) DO UPDATE SET
    multiplier = EXCLUDED.multiplier,
    label      = EXCLUDED.label;

  -- =========================================================================
  -- STEP 3: XP LEVELS (100 levels, polynomial curve base=150 power=0.75)
  -- Uses existing xp.seed_default_curve(app_id, max_level, base, power)
  -- increment per level N = CEIL(150 * N^0.75)
  -- =========================================================================
  DELETE FROM xp.levels WHERE app_id IN (v_forum_app, v_battles_app);
  PERFORM xp.seed_default_curve(v_forum_app,   100, 150, 0.75);
  PERFORM xp.seed_default_curve(v_battles_app, 100, 150, 0.75);

  -- =========================================================================
  -- STEP 4: XP RULES — FORUM APP
  -- Unique constraint: (app_id, action_key) → xp_rules_app_action_key
  -- =========================================================================
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    -- -----------------------------------------------------------------------
    -- CONTENT CREATION (visibility-gated by triggers)
    -- -----------------------------------------------------------------------
    (v_forum_app, 'LENS_CREATED', 'Lens Published',
     'Award XP when a new lens is published with public visibility.',
     80, 3600, 5, 400, 2000, 'hard', NULL, true),

    (v_forum_app, 'THREAD_CREATED', 'Thread Posted',
     'Award XP when a new thread is published publicly.',
     30, 1800, 10, 200, 1500, 'standard', NULL, true),

    (v_forum_app, 'THREAD_REPLY_CREATED', 'Reply Posted',
     'Award XP when a reply is posted to a thread.',
     15, 300, 20, 200, 1200, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_CREATED', 'Workflow Created',
     'Award XP when a new public workflow is created.',
     60, 3600, 3, 180, 1500, 'hard', NULL, true),

    -- -----------------------------------------------------------------------
    -- SOCIAL ACTIONS — GIVING
    -- -----------------------------------------------------------------------
    (v_forum_app, 'REACTION_GIVEN', 'Reaction Given',
     'Award small XP for engaging with content via reactions.',
     5, 60, 30, 100, 500, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_LIKED', 'Workflow Liked',
     'Award XP for liking a workflow.',
     5, 120, 20, 80, 400, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_SAVED', 'Workflow Saved',
     'Award XP for saving a workflow (more intentional than a like).',
     8, 300, 10, 60, 300, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_FORKED', 'Workflow Forked',
     'Award XP for forking a workflow.',
     20, 1800, 5, 80, 400, 'standard', NULL, true),

    (v_forum_app, 'LENS_FORKED', 'Lens Forked',
     'Award XP for forking a lens.',
     20, 1800, 5, 80, 400, 'standard', NULL, true),

    -- -----------------------------------------------------------------------
    -- SOCIAL ACTIONS — RECEIVING (no cooldown; you don't control arrival)
    -- -----------------------------------------------------------------------
    (v_forum_app, 'REACTION_RECEIVED', 'Reaction Received',
     'Award XP when others react to your content. Self-reactions excluded.',
     8, NULL, 50, 300, 1500, 'easy', NULL, true),

    (v_forum_app, 'THREAD_REPLY_RECEIVED', 'Reply Received',
     'Award XP when others reply to your thread. Self-replies excluded.',
     10, NULL, 30, 200, 1200, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_LIKE_RECEIVED', 'Workflow Like Received',
     'Award XP when your workflow receives a like.',
     8, NULL, 30, 200, 1000, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_SAVE_RECEIVED', 'Workflow Save Received',
     'Award XP when your workflow is saved by another user.',
     12, NULL, 20, 200, 800, 'easy', NULL, true),

    (v_forum_app, 'WORKFLOW_FORK_RECEIVED', 'Workflow Fork Received',
     'Award XP when your workflow is forked — a quality signal.',
     25, NULL, 10, 200, 800, 'standard', NULL, true),

    (v_forum_app, 'LENS_FORK_RECEIVED', 'Lens Fork Received',
     'Award XP when your lens is forked.',
     25, NULL, 10, 200, 800, 'standard', NULL, true),

    -- -----------------------------------------------------------------------
    -- ENGAGEMENT (very low value; heavy caps to prevent view inflation)
    -- -----------------------------------------------------------------------
    (v_forum_app, 'THREAD_ENGAGED', 'Thread Viewed',
     'Award minimal XP for reading threads. Heavily capped.',
     3, 3600, 5, 10, 60, 'easy', NULL, true),

    -- -----------------------------------------------------------------------
    -- DAILY ACTIVITY + STREAKS
    -- 82800s cooldown = 23h (prevents timezone gaming while allowing daily use)
    -- -----------------------------------------------------------------------
    (v_forum_app, 'DAILY_LOGIN', 'Daily Login',
     'Award XP for logging in each day. 23h cooldown, streak-tracked.',
     10, 82800, 1, 10, 900, 'easy', 'daily', true),

    (v_forum_app, 'STREAK_BONUS_7D', '7-Day Streak Bonus',
     'Bonus XP for maintaining a 7-day login streak.',
     50, 604800, 1, 50, 400, 'standard', 'daily', true),

    (v_forum_app, 'STREAK_BONUS_30D', '30-Day Streak Bonus',
     'Bonus XP for maintaining a 30-day login streak.',
     150, 2592000, 1, 150, 600, 'hard', 'daily', true),

    -- -----------------------------------------------------------------------
    -- PROFILE
    -- max_events_per_day=1 guards same-session re-triggers;
    -- max_xp_per_season=100 caps the reward even across seasons.
    -- The trigger must additionally check for a prior positive event.
    -- -----------------------------------------------------------------------
    (v_forum_app, 'PROFILE_COMPLETED', 'Profile Completed',
     'One-time XP for completing your lenser profile.',
     100, NULL, 1, 100, 100, 'standard', NULL, true),

    (v_forum_app, 'FOLLOW_RECEIVED', 'New Follower',
     'Award XP when another lenser follows you.',
     5, NULL, 20, 80, 400, 'easy', NULL, true),

    -- -----------------------------------------------------------------------
    -- OPEN SOURCE CONTRIBUTIONS (verified externally via xp.grant_contribution_xp)
    -- Action keys must match xp.grant_contribution_xp CASE statement exactly.
    -- -----------------------------------------------------------------------
    (v_forum_app, 'CONTRIB_PR_MERGED_MAIN', 'Core PR Merged',
     'XP for a merged pull request to the main LenserFight repository.',
     500, NULL, 2, 1000, 3000, 'legendary', NULL, true),

    (v_forum_app, 'CONTRIB_PR_MERGED_COMMUNITY', 'Community PR Merged',
     'XP for a merged PR to a community plugin or infrastructure repo.',
     200, NULL, 3, 600, 2000, 'hard', NULL, true),

    (v_forum_app, 'CONTRIB_PR_MERGED_DOCS', 'Docs PR Merged',
     'XP for a merged documentation pull request.',
     100, NULL, 5, 400, 1500, 'standard', NULL, true),

    (v_forum_app, 'CONTRIB_ISSUE_FILED', 'Issue Filed',
     'XP for filing a verified bug report or feature request.',
     30, 3600, 5, 100, 500, 'easy', NULL, true),

    (v_forum_app, 'CONTRIB_REVIEW_GIVEN', 'Code Review Given',
     'XP for providing a code review on an open PR.',
     40, 1800, 5, 150, 600, 'standard', NULL, true)

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

  -- =========================================================================
  -- STEP 4B: XP RULES — BATTLES APP
  -- award_battle_xp() uses app_id 00000000-0000-0000-0000-000000000002
  -- =========================================================================
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    (v_battles_app, 'BATTLE_CREATED', 'Battle Created',
     'Award XP for launching a new battle (non-draft).',
     50, 7200, 2, 100, 800, 'standard', NULL, true),

    (v_battles_app, 'BATTLE_PARTICIPATED', 'Battle Participated',
     'Award XP to each human contender when a battle closes.',
     100, NULL, 5, 500, 2000, 'hard', NULL, true),

    (v_battles_app, 'BATTLE_WON', 'Battle Won',
     'Award bonus XP to the battle winner (legendary difficulty = 2.5× = 375 effective).',
     150, NULL, 5, 750, 2500, 'legendary', NULL, true),

    (v_battles_app, 'BATTLE_VOTED', 'Battle Voted',
     'Award XP for casting a vote in a battle. 10min cooldown.',
     10, 600, 20, 200, 1000, 'easy', NULL, true)

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

  -- =========================================================================
  -- STEP 5: XP POLICY DOCUMENT (audit record)
  -- =========================================================================
  INSERT INTO xp.policy (policy)
  VALUES ('{
    "version": "1.0.0",
    "created_at": "2026-03-28",
    "description": "LenserFight XP policy v1 — production ruleset.",
    "apps": {
      "forum":   "00000000-0000-0000-0000-000000000001",
      "battles": "00000000-0000-0000-0000-000000000002"
    },
    "difficulty_multipliers": {
      "easy": 0.75,
      "standard": 1.00,
      "hard": 1.50,
      "legendary": 2.50
    },
    "level_curve": {
      "function": "xp.seed_default_curve",
      "max_levels": 100,
      "base": 150,
      "power": 0.75,
      "checkpoints": {
        "level_10":  4400,
        "level_25":  22500,
        "level_50":  92000,
        "level_75":  191000,
        "level_100": 330000
      }
    },
    "season_duration_days": 90,
    "target_xp_ranges": {
      "casual_per_year":  [5000,  15000],
      "regular_per_year": [20000, 40000],
      "power_per_year":   [40000, 80000]
    },
    "fairness_rules": [
      "Only public+published content earns creation XP",
      "Visibility change to private/unlisted/archived triggers creation XP rollback",
      "Re-publishing re-awards creation XP only if no prior positive event exists",
      "Engagement XP (reactions, replies, votes, views) is never rolled back",
      "Self-reactions and self-replies do not earn received-type XP"
    ],
    "abuse_controls": [
      "Rule-level cooldowns on all giving actions",
      "max_events_per_day on high-frequency actions",
      "max_xp_per_season on every rule",
      "pg_advisory_xact_lock serializes concurrent xp.apply calls per lenser",
      "xp.events are immutable (prevent_event_mutations trigger)",
      "xp.rules is service_role-only (RLS policy xp_rules_service_only)"
    ]
  }'::jsonb);

END;
$$;
