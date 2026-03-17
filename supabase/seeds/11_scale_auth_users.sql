-- =============================================================================
-- 11. SCALE AUTH USERS (300K users + identities)
-- Batched in 50K chunks to avoid memory pressure.
-- =============================================================================

DO $$
DECLARE
  batch_start int;
  batch_size  int := 50000;
  total       int := 300000;
BEGIN
  FOR batch_start IN 0..total-1 BY batch_size LOOP
    RAISE NOTICE 'auth.users batch %/% ...', batch_start / batch_size + 1, total / batch_size;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    )
    SELECT
      '00000000-0000-0000-0000-000000000000'::uuid,
      ('a1' || lpad(to_hex(batch_start + gs), 6, '0') || '-0001-4000-8000-000000000000')::uuid,
      'authenticated', 'authenticated',
      'seed_user_' || (batch_start + gs) || '@lenserfight.seed',
      public.seed_password_hash(),
      now() - (random() * interval '365 days'),
      now() - (random() * interval '365 days'),
      now(),
      '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'display_name', 'Seed User ' || (batch_start + gs),
        'preferred_language', public.seed_pick_language(random())
      )
    FROM generate_series(0, LEAST(batch_size - 1, total - batch_start - 1)) AS gs
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Identity records for all seed users
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  u.id, u.id, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', u.created_at, u.created_at, u.created_at
FROM auth.users u
WHERE u.email LIKE '%@lenserfight.seed'
ON CONFLICT (provider_id, provider) DO NOTHING;
