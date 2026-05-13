-- =============================================================================
-- 30 (production subset). XP SEASON DEFINITIONS ONLY
-- =============================================================================
-- Extracted from 30_scale_xp.sql for the production seed manifest.
-- Creates the 9 season rows (S1–S9) so that:
--   • the cron that toggles is_active can run on first boot
--   • the UI can display the current season name and date range
--   • season leaderboard queries don't fail on an empty xp.seasons table
--
-- EXCLUDED from this file (present only in 30_scale_xp.sql):
--   • xp.totals          — synthetic XP per lenser (up to 55,000 on day 0)
--   • xp.season_totals   — per-lenser per-season XP distribution
--   • xp.monthly_rollup  — 24-month activity simulation
--   • AI season winner overrides (UPDATE to 99999 XP)
--
-- All production lensers start at XP 0. XP is earned organically.
-- =============================================================================

DO $$
DECLARE
  v_app_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_s1 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000001';
  v_s2 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000002';
  v_s3 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000003';
  v_s4 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000004';
  v_s5 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000005';
  v_s6 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000006';
  v_s7 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000007';
  v_s8 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000008';
  v_s9 CONSTANT uuid := 'a0000000-0000-4000-8000-000000000009';
BEGIN
  INSERT INTO xp.seasons (id, app_id, slug, name, starts_at, ends_at, is_active) VALUES
    (v_s1, v_app_id, 's1_lenserfight', 'S1 Lenserfight', '2024-04-01 00:00:00+00', '2024-06-30 00:00:00+00', false),
    (v_s2, v_app_id, 's2_lenserfight', 'S2 Lenserfight', '2024-06-30 00:00:00+00', '2024-09-28 00:00:00+00', false),
    (v_s3, v_app_id, 's3_lenserfight', 'S3 Lenserfight', '2024-09-28 00:00:00+00', '2024-12-27 00:00:00+00', false),
    (v_s4, v_app_id, 's4_lenserfight', 'S4 Lenserfight', '2024-12-27 00:00:00+00', '2025-03-27 00:00:00+00', false),
    (v_s5, v_app_id, 's5_lenserfight', 'S5 Lenserfight', '2025-03-27 00:00:00+00', '2025-06-25 00:00:00+00', false),
    (v_s6, v_app_id, 's6_lenserfight', 'S6 Lenserfight', '2025-06-25 00:00:00+00', '2025-09-23 00:00:00+00', false),
    (v_s7, v_app_id, 's7_lenserfight', 'S7 Lenserfight', '2025-09-23 00:00:00+00', '2025-12-22 00:00:00+00', false),
    (v_s8, v_app_id, 's8_lenserfight', 'S8 Lenserfight', '2025-12-22 00:00:00+00', '2026-03-22 00:00:00+00', false),
    (v_s9, v_app_id, 's9_lenserfight', 'S9 Lenserfight', '2026-03-22 00:00:00+00', '2026-06-20 00:00:00+00', true)
  ON CONFLICT (slug) DO NOTHING;
END;
$$;
