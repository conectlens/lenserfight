-- =============================================================================
-- 30 (production subset). XP SEASON DEFINITIONS — CURRENT SEASON ONLY
-- =============================================================================
-- Seeds only the current active season (S9) so:
--   • the cron that toggles is_active has a valid row on first boot
--   • the UI can display the current season name and date range
--   • season leaderboard queries don't fail on an empty xp.seasons table
--
-- Past seasons (S1–S8) are intentionally excluded from production.
-- There is no historical XP to display for them, and seeding empty past
-- seasons creates misleading leaderboard periods with zero activity.
--
-- All production lensers start at XP 0. XP is earned organically from S9.
-- =============================================================================

DO $$
DECLARE
  v_app_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_s9     CONSTANT uuid := 'a0000000-0000-4000-8000-000000000009';
BEGIN
  INSERT INTO xp.seasons (id, app_id, slug, name, starts_at, ends_at, is_active) VALUES
    (v_s9, v_app_id, 's9_lenserfight', 'S9 Lenserfight', '2026-03-22 00:00:00+00', '2026-06-20 00:00:00+00', true)
  ON CONFLICT (slug) DO NOTHING;
END;
$$;
