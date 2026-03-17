-- =============================================================================
-- 20. SCALE XP TOTALS (150K entries)
-- Simulated XP distribution matching creator activity levels.
-- =============================================================================

INSERT INTO xp.totals (lenser_id, app_id, total_xp, created_at, updated_at)
SELECT
  p.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  -- Power-law XP: heavy creators get more XP
  (50 + floor(pow(random(), 0.3) * 5000))::int,
  p_created_at,
  now()
FROM (
  SELECT id,
    (SELECT created_at FROM lensers.profiles WHERE id = seed_profile_index.id) AS p_created_at
  FROM seed_profile_index
) p
ON CONFLICT DO NOTHING;
