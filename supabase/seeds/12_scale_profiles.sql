-- =============================================================================
-- 12. SCALE LENSER PROFILES (150K from 300K users)
-- 50% of users become active lensers. Power-law creator weights assigned later.
-- =============================================================================

INSERT INTO lensers.profiles (
  id, user_id, handle, display_name, bio,
  status, visibility, preferred_language, country, created_at
)
SELECT
  ('b2' || lpad(to_hex(rn), 6, '0') || '-0001-4000-8000-000000000000')::uuid,
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
  CASE
    WHEN random() < 0.25 THEN 'US'
    WHEN random() < 0.40 THEN 'TR'
    WHEN random() < 0.50 THEN 'ES'
    WHEN random() < 0.58 THEN 'FR'
    WHEN random() < 0.65 THEN 'DE'
    WHEN random() < 0.72 THEN 'GB'
    WHEN random() < 0.77 THEN 'JP'
    WHEN random() < 0.82 THEN 'KR'
    WHEN random() < 0.87 THEN 'BR'
    WHEN random() < 0.91 THEN 'SA'
    WHEN random() < 0.94 THEN 'IT'
    WHEN random() < 0.96 THEN 'MX'
    WHEN random() < 0.98 THEN 'IN'
    ELSE 'CA'
  END,
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
