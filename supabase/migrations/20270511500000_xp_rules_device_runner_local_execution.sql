-- Phase 39: XP rules for device registration, local runner, and trusted local execution.
-- Adds a third app (platform/system actions) plus new battle-trust rules.
-- LENS_FORK_RECEIVED / WORKFLOW_FORK_RECEIVED already exist in seed; not re-inserted.
-- Uses ON CONFLICT DO NOTHING — safe to re-run.

DO $$
DECLARE
  v_forum_app     CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_battles_app   CONSTANT uuid := '00000000-0000-0000-0000-000000000002';
  v_platform_app  CONSTANT uuid := '00000000-0000-0000-0000-000000000003';
BEGIN

  -- =========================================================================
  -- Platform app (system/account/device actions)
  -- =========================================================================
  INSERT INTO xp.apps (id, slug, name, difficulty, is_active)
  VALUES (v_platform_app, 'platform', 'LenserFight Platform', 'standard', true)
  ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    difficulty = EXCLUDED.difficulty,
    is_active  = EXCLUDED.is_active;

  PERFORM xp.seed_default_curve(v_platform_app, 100, 150, 0.75);

  -- =========================================================================
  -- Platform app rules — account, agent, device, runner
  -- =========================================================================
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    -- Account lifecycle
    (v_platform_app, 'ACCOUNT_CREATED', 'Account Created',
     'One-time XP award when the developer creates their first account.',
     25, NULL, 1, 25, 25, 'easy', NULL, true),

    -- Agent creation
    (v_platform_app, 'AGENT_CREATED', 'AI Agent Created',
     'Award XP for creating and publishing a new AI agent.',
     50, 3600, 5, 250, 1000, 'standard', NULL, true),

    (v_platform_app, 'AGENT_TEAM_CREATED', 'Agent Team Created',
     'Award XP for assembling a new agent team.',
     30, 3600, 3, 90, 600, 'easy', NULL, true),

    -- Device and runner trust
    (v_platform_app, 'DEVICE_REGISTERED', 'Local Device Registered',
     'Award XP when a developer registers a new local device.',
     40, 86400, 3, 120, 400, 'standard', NULL, true),

    (v_platform_app, 'DEVICE_VERIFIED', 'Local Device Verified',
     'Award XP when a registered device reaches the trusted state.',
     60, 86400, 3, 180, 500, 'hard', NULL, true),

    (v_platform_app, 'RUNNER_CONNECTED', 'Local Runner Connected',
     'Award XP when a runner is connected and bound to a trusted device.',
     50, 3600, 3, 150, 600, 'standard', NULL, true),

    -- Referrals
    (v_platform_app, 'INVITE_SENT', 'Battle Invitation Sent',
     'Award XP for sending a battle invitation. 1-hour cooldown to prevent spam.',
     20, 3600, 10, 200, 800, 'easy', NULL, true),

    (v_platform_app, 'INVITE_ACCEPTED', 'Invitation Accepted',
     'Award XP when an invited user joins and completes their first battle.',
     50, NULL, 20, 1000, 3000, 'standard', NULL, true),

    -- Content publishing
    (v_platform_app, 'WORKFLOW_PUBLISHED', 'Workflow Published',
     'Award XP when a workflow is published publicly (distinct from created).',
     100, 3600, 3, 300, 2000, 'hard', NULL, true),

    (v_platform_app, 'AGENT_USED_BY_OTHER_USER', 'Agent Used by Others',
     'Award XP when another user runs your published agent.',
     20, 300, 50, 1000, 5000, 'easy', NULL, true)

  ON CONFLICT (app_id, action_key) DO NOTHING;

  -- =========================================================================
  -- Battles app additions — submission quality and execution trust
  -- =========================================================================
  INSERT INTO xp.rules (
    app_id, action_key, name, description,
    base_xp, cooldown_seconds, max_events_per_day, max_xp_per_day,
    max_xp_per_season, difficulty, streak_type, is_active
  ) VALUES

    (v_battles_app, 'BATTLE_SUBMISSION_COMPLETED', 'Battle Submission Completed',
     'Award XP when a contender completes and submits their battle entry.',
     25, NULL, 5, 125, 1000, 'easy', NULL, true),

    (v_battles_app, 'VERIFIED_LOCAL_EXECUTION_COMPLETED', 'Verified Local Execution',
     'Award bonus XP for a fully-trusted local execution submission. '
     'Requires account, agent, device, runner, workflow, lens, and policy checks to pass.',
     100, NULL, 5, 500, 3000, 'hard', NULL, true),

    (v_battles_app, 'BATTLE_RANKED_TOP_3', 'Top-3 Battle Finish',
     'Award XP for finishing in the top 3 of a ranked battle.',
     150, NULL, 5, 750, 3000, 'hard', NULL, true),

    (v_battles_app, 'BATTLE_RESULT_PUBLISHED', 'Battle Result Published',
     'Award XP when a completed battle result is published publicly.',
     30, 3600, 5, 150, 600, 'easy', NULL, true),

    (v_battles_app, 'FAIR_EVALUATION_COMPLETED', 'Fair Evaluation Completed',
     'Award XP for submitting a well-calibrated vote within the judge tolerance window.',
     15, 600, 20, 300, 1200, 'easy', NULL, true)

  ON CONFLICT (app_id, action_key) DO NOTHING;

END;
$$;
