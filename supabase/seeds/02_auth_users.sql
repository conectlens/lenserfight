-- =============================================================================
-- 2. RESERVED PRODUCTION USERS
-- =============================================================================
-- Three reserved, production-facing accounts that own every public template
-- shipped with the platform:
--
--   hey@lenserfight.com   @lenserfight   — default author of public templates
--   lets@conectlens.com   @conectlens    — ConectLens platform / community hub
--   bit@chainabit.com     @chainabit     — Chainabit productivity templates
--
-- The auth.user UUIDs are deterministic so that downstream seeds (battles,
-- lens templates, workflows, analytics) can reference them safely.
--
-- Passwords are seeded for local development and CI ONLY. They are rotated by
-- the deployment pipeline before any production environment is exposed to the
-- public. NEVER commit real production credentials here.
-- =============================================================================

INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at, last_sign_in_at,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change, email_change_token_new, email_change_token_current, email_change_sent_at, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    is_super_admin, is_sso_user, deleted_at, is_anonymous,
    phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
    raw_app_meta_data, raw_user_meta_data
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated',
        'hey@lenserfight.com',
        extensions.crypt('LenserFight#DevSeed2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"LenserFight"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated',
        'bit@chainabit.com',
        extensions.crypt('Chainabit#DevSeed2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Chainabit"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated',
        'lets@conectlens.com',
        extensions.crypt('ConectLens#DevSeed2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"ConectLens"}'
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    email_change = EXCLUDED.email_change,
    email_change_token_new = EXCLUDED.email_change_token_new,
    email_change_token_current = EXCLUDED.email_change_token_current,
    updated_at = now();

-- Identity records (required by Supabase auth)
INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'email', 'hey@lenserfight.com'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000002', 'email', 'bit@chainabit.com'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000003', 'email', 'lets@conectlens.com'),
        'email', now(), now(), now()
    )
ON CONFLICT (id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();
