-- =============================================================================
-- 20. SCALE XP TOTALS (150K entries)
-- Simulated XP distribution matching creator activity levels.
-- =============================================================================

INSERT INTO xp.totals (lenser_id, app_id, total_xp, updated_at)
SELECT
  p.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  -- Power-law XP: heavy creators get more XP
  (50 + floor(pow(random(), 0.3) * 5000))::int,
  now()
FROM lensers.profiles p
WHERE p.handle LIKE 'lenser_%'
ON CONFLICT DO NOTHING;
