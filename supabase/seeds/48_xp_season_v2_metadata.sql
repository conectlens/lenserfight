-- =============================================================================
-- 48. XP SEASON V2 METADATA: descriptions, rewards, featured challenges,
--     and milestone badges for seed lensers
-- =============================================================================
-- Depends on: 30_scale_xp.sql (seasons created), user seeds

DO $$
DECLARE
  v_app_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_s7 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000007';
  v_s8 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000008';
  v_s9 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000009';
BEGIN

  -- =========================================================================
  -- STEP 1: Season metadata backfill (recent seasons)
  -- =========================================================================

  UPDATE xp.seasons SET
    description        = 'The Autumn Forge season. Builders focused on workflow composition, publishing first lenses, and CLI automation.',
    reward_description = 'Top 10 earners receive the "Autumn Forge" profile badge. Rank #1 earns "Season Champion S7".',
    featured_challenges = '[
      {"title": "First Lens Published", "description": "Publish your first lens to the public marketplace.", "xp_reward": 60, "rule_key": "LENS_CREATED"},
      {"title": "7-Day Streak", "description": "Log in for 7 consecutive days.", "xp_reward": 50, "rule_key": "STREAK_BONUS_7D"},
      {"title": "Workflow Builder", "description": "Create and publish 3 public workflows.", "xp_reward": 120, "rule_key": "WORKFLOW_PUBLISHED"}
    ]'::jsonb
  WHERE id = v_s7 AND app_id = v_app_id;

  UPDATE xp.seasons SET
    description        = 'The Winter Circuit season. Battles took center stage — rankings, tournaments, and quality votes defined the leaderboard.',
    reward_description = 'Top 5 earners receive the "Winter Circuit" badge and season title. Battle winners earn "Circuit Champion".',
    featured_challenges = '[
      {"title": "Battle Debut", "description": "Participate in your first public battle.", "xp_reward": 100, "rule_key": "BATTLE_PARTICIPATED"},
      {"title": "Vote Maestro", "description": "Cast 20 quality votes in battles.", "xp_reward": 80, "rule_key": "BATTLE_VOTED"},
      {"title": "Top 3 Finisher", "description": "Finish in the top 3 of any public battle.", "xp_reward": 150, "rule_key": "BATTLE_RANKED_TOP_3"}
    ]'::jsonb
  WHERE id = v_s8 AND app_id = v_app_id;

  UPDATE xp.seasons SET
    description        = 'The Spring Launch season — the first season open to the public. Contributions, tutorials, and community growth are rewarded.',
    reward_description = 'All top-10 earners receive the "Founding Spring" badge, marking them as early adopters. Rank #1 receives "Spring Champion".',
    featured_challenges = '[
      {"title": "Tutorial Graduate", "description": "Complete 3 tutorials or agent walkthroughs.", "xp_reward": 180, "rule_key": "TUTORIAL_COMPLETED"},
      {"title": "Community Thread", "description": "Post a public thread that receives 5+ reactions.", "xp_reward": 60, "rule_key": "THREAD_CREATED"},
      {"title": "Contributor", "description": "Submit a merged PR to any LenserFight repository.", "xp_reward": 200, "rule_key": "CONTRIB_PR_MERGED_COMMUNITY"},
      {"title": "Invite Friend", "description": "Invite a friend who completes their profile.", "xp_reward": 100, "rule_key": "INVITE_ACCEPTED"},
      {"title": "Multilingual Creator", "description": "Publish content in a language other than English.", "xp_reward": 90, "rule_key": "MULTILINGUAL_CONTENT_CREATED"}
    ]'::jsonb
  WHERE id = v_s9 AND app_id = v_app_id;

  -- =========================================================================
  -- STEP 2: Seed milestone badges for established lensers (human only)
  --         Based on realistic XP totals from seed 30
  -- =========================================================================

  -- Award xp_1k badge to lensers with total_xp >= 1000
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'xp_1k', '1K XP', 'Earned 1,000 total XP', '💡'
  FROM xp.totals t
  WHERE t.app_id    = v_app_id
    AND t.total_xp >= 1000
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- Award xp_10k badge to lensers with total_xp >= 10000
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'xp_10k', '10K XP', 'Earned 10,000 total XP', '🔥'
  FROM xp.totals t
  WHERE t.app_id    = v_app_id
    AND t.total_xp >= 10000
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- Award xp_50k badge to lensers with total_xp >= 50000
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'xp_50k', '50K XP', 'Earned 50,000 total XP', '💎'
  FROM xp.totals t
  WHERE t.app_id    = v_app_id
    AND t.total_xp >= 50000
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- Streak badges for lensers with meaningful historical streaks
  -- (synthetic: top 25% of lensers get a 7D badge, top 10% get 30D)
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'streak_7d', '7-Day Streak', 'Logged in 7 days in a row', '🔆'
  FROM xp.totals t
  WHERE t.app_id   = v_app_id
    AND t.total_xp >= 5000  -- proxy: active enough to have maintained a streak
  ON CONFLICT (lenser_id, type) DO NOTHING;

  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'streak_30d', '30-Day Streak', 'Logged in 30 days in a row', '☀️'
  FROM xp.totals t
  WHERE t.app_id   = v_app_id
    AND t.total_xp >= 25000  -- proxy: very active user
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- Level milestone badges derived from current_level in xp.totals
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'level_milestone_5', 'Newcomer', 'Reached Level 5', '🌱'
  FROM xp.totals t
  WHERE t.app_id        = v_app_id
    AND t.current_level >= 5
  ON CONFLICT (lenser_id, type) DO NOTHING;

  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'level_milestone_10', 'Builder', 'Reached Level 10', '🏗️'
  FROM xp.totals t
  WHERE t.app_id        = v_app_id
    AND t.current_level >= 10
  ON CONFLICT (lenser_id, type) DO NOTHING;

  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT t.lenser_id, 'level_milestone_25', 'Expert', 'Reached Level 25', '⚡'
  FROM xp.totals t
  WHERE t.app_id        = v_app_id
    AND t.current_level >= 25
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- Season champion badges — top XP per season
  -- S7 Champion
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT st.lenser_id, 'season_champion_s7', 'S7 Champion', 'Ranked #1 in Season 7 — Autumn Forge', '🏆'
  FROM xp.season_totals st
  WHERE st.season_id = v_s7
    AND st.app_id    = v_app_id
  ORDER BY st.total_xp DESC
  LIMIT 1
  ON CONFLICT (lenser_id, type) DO NOTHING;

  -- S8 Champion
  INSERT INTO lensers.badges (lenser_id, type, label, description, icon)
  SELECT st.lenser_id, 'season_champion_s8', 'S8 Champion', 'Ranked #1 in Season 8 — Winter Circuit', '🏆'
  FROM xp.season_totals st
  WHERE st.season_id = v_s8
    AND st.app_id    = v_app_id
  ORDER BY st.total_xp DESC
  LIMIT 1
  ON CONFLICT (lenser_id, type) DO NOTHING;

END;
$$;
