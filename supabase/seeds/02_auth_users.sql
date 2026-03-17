-- =============================================================================
-- 2. TEST AUTH USERS
-- Fixed UUIDs for reproducible local development.
-- =============================================================================

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated',
        'alice@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Alice Arena"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated',
        'bob@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Bob Builder"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated',
        'carol@lenserfight.local',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(), '', '',
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Carol Voter"}'
    )
ON CONFLICT (id) DO NOTHING;

-- Identity records (required by Supabase auth)
INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'email', 'alice@lenserfight.local'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000002', 'email', 'bob@lenserfight.local'),
        'email', now(), now(), now()
    ),
    (
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        jsonb_build_object('sub', 'a1000000-0000-0000-0000-000000000003', 'email', 'carol@lenserfight.local'),
        'email', now(), now(), now()
    )
ON CONFLICT (provider_id, provider) DO NOTHING;
