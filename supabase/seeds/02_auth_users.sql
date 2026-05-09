-- =============================================================================
-- 2. TEST AUTH USERS
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
        'alice@lenserfight.local',
        extensions.crypt('Alice#Lenser2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Alice Arena"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated',
        'bob@lenserfight.local',
        extensions.crypt('Bob#Lenser2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Bob Builder"}'
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a1000000-0000-0000-0000-000000000003',
        'authenticated', 'authenticated',
        'carol@lenserfight.local',
        extensions.crypt('Carol#Lenser2026!', extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        '', NULL,
        '', NULL,
        '', '', '', NULL, 0,
        '', NULL,
        false, false, NULL, false,
        NULL, NULL, '', '', NULL,
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"Carol Voter"}'
    )
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
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
ON CONFLICT (id) DO NOTHING;
