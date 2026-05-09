-- =============================================================================
-- 30. SCALE XP: 2-YEAR SIMULATION
-- =============================================================================
-- Seeds:
--   1. 9 seasons (8 historical + 1 current, 90 days each)
--   2. XP totals for all lensers (human + AI) with realistic 2-year range
--   3. Season totals for every lenser in every season
--   4. Monthly rollup (24 months: 2024-04 through 2026-03)
--   5. AI lensers guaranteed to WIN at least 3 historical seasons
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Constants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_app_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  -- Deterministic season UUIDs (s1..s9)
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
  -- =========================================================================
  -- STEP 1: CREATE 9 SEASONS (8 historical + 1 current)
  -- =========================================================================
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

  -- =========================================================================
  -- STEP 2A: XP TOTALS — HUMAN LENSERS (realistic 2-year range: 50–55,050)
  -- =========================================================================
  INSERT INTO xp.totals (lenser_id, app_id, total_xp, updated_at)
  SELECT
    p.id,
    v_app_id,
    (50 + floor(pow(random(), 0.25) * 55000))::bigint,
    now()
  FROM lensers.profiles p
  WHERE p.handle LIKE 'lenser_%'
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- STEP 2B: XP TOTALS — AI LENSERS (competitive top 20%: 20,000–55,000)
  -- =========================================================================
  INSERT INTO xp.totals (lenser_id, app_id, total_xp, updated_at)
  SELECT
    p.id,
    v_app_id,
    (20000 + floor(random() * 35000))::bigint,
    now()
  FROM lensers.profiles p
  WHERE p.type = 'ai'
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- STEP 3: SEASON TOTALS — distribute XP across all 9 seasons
  -- =========================================================================
  -- Each lenser gets a weighted share per season with growth curve
  -- (recent seasons have more XP). Uses series 1..9 with weight = season_num^1.3

  INSERT INTO xp.season_totals (season_id, lenser_id, app_id, total_xp, updated_at)
  SELECT
    s.season_id,
    t.lenser_id,
    v_app_id,
    -- Weighted distribution: season_weight / total_weight * total_xp * jitter
    GREATEST(1, floor(
      t.total_xp
      * (pow(s.season_num::numeric, 1.3) / s.total_weight)
      * (0.7 + random() * 0.6)  -- jitter: 0.7x to 1.3x
    ))::bigint,
    now()
  FROM xp.totals t
  CROSS JOIN (
    SELECT
      unnest(ARRAY[v_s1, v_s2, v_s3, v_s4, v_s5, v_s6, v_s7, v_s8, v_s9]) AS season_id,
      unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9]) AS season_num,
      -- Precompute total weight: sum of i^1.3 for i=1..9
      (SELECT SUM(pow(i::numeric, 1.3)) FROM generate_series(1, 9) AS i) AS total_weight
  ) s
  WHERE t.app_id = v_app_id
  ON CONFLICT (season_id, lenser_id, app_id) DO NOTHING;

  -- =========================================================================
  -- STEP 4: AI LENSERS WIN SPECIFIC SEASONS
  -- =========================================================================
  -- gpt-4o wins S2, S5, S8 (deterministic profile_id = model_id from ai.models)
  -- claude-sonnet-4-6 wins S1, S4, S7
  -- gemini-2.5-flash wins S3, S6

  -- First, find the AI lenser profile IDs by model key
  -- (profile_id = ai_model_id from 07_ai_lensers.sql)
  UPDATE xp.season_totals st
  SET total_xp = 99999
  FROM lensers.profiles p
  JOIN ai.models m ON m.id = p.ai_model_id
  WHERE st.lenser_id = p.id
    AND st.app_id = v_app_id
    AND p.type = 'ai'
    AND (
      (m.key = 'gpt-4o'            AND st.season_id IN (v_s2, v_s5, v_s8))
      OR (m.key = 'claude-sonnet-4-6' AND st.season_id IN (v_s1, v_s4, v_s7))
      OR (m.key = 'gemini-2.5-flash'  AND st.season_id IN (v_s3, v_s6))
    );

  -- =========================================================================
  -- STEP 5: MONTHLY ROLLUP (24 months: 2024-04 through 2026-03)
  -- =========================================================================
  INSERT INTO xp.monthly_rollup (lenser_id, year, month, xp)
  SELECT
    t.lenser_id,
    m.yr,
    m.mo,
    -- Growth curve: more recent months have more XP
    GREATEST(1, floor(
      t.total_xp
      * (pow(m.month_idx::numeric, 1.2) / m.total_weight)
      * (0.7 + random() * 0.6)
    ))::bigint
  FROM xp.totals t
  CROSS JOIN (
    SELECT
      yr, mo, month_idx,
      (SELECT SUM(pow(i::numeric, 1.2)) FROM generate_series(1, 24) AS i) AS total_weight
    FROM (
      SELECT
        2024 AS yr, m AS mo, (m - 3) AS month_idx  -- Apr=1, May=2, ..., Dec=9
      FROM generate_series(4, 12) AS m
      UNION ALL
      SELECT
        2025, m, (m + 9)  -- Jan=10, Feb=11, ..., Dec=21
      FROM generate_series(1, 12) AS m
      UNION ALL
      SELECT
        2026, m, (m + 21)  -- Jan=22, Feb=23, Mar=24
      FROM generate_series(1, 3) AS m
    ) months
  ) m
  WHERE t.app_id = v_app_id
  ON CONFLICT (lenser_id, year, month) DO NOTHING;

END;
$$;
