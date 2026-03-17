-- =============================================================================
-- 12. SCALE LENSER PROFILES (150K from 300K users)
-- 50% of users become active lensers. Power-law creator weights assigned later.
-- =============================================================================

INSERT INTO lensers.profiles (
  id, user_id, handle, display_name, bio,
  status, visibility, preferred_language, country, created_at
)
SELECT
  ('b2' || lpad(to_hex(rn), 12, '0') || '-0001-4000-8000-000000000000')::uuid,
  u.id,
  'lenser_' || lpad(to_hex(rn), 8, '0'),
  COALESCE(u.raw_user_meta_data->>'display_name', 'Lenser ' || rn),
  CASE WHEN random() < 0.3
    THEN 'Bio for seed lenser #' || rn || '. Exploring AI, creativity, and community.'
    ELSE NULL
  END,
  'active'::"lensers"."lenser_status",
  'public'::"lensers"."lenser_visibility",
  COALESCE(u.raw_user_meta_data->>'preferred_language', 'en'),
  pg_temp.seed_pick_country(random()),
  u.created_at
FROM (
  SELECT id, raw_user_meta_data, created_at,
    row_number() OVER (ORDER BY id) AS rn
  FROM auth.users
  WHERE email LIKE '%@lenserfight.seed'
  ORDER BY id
  LIMIT 150000
) u
ON CONFLICT (id) DO NOTHING;
