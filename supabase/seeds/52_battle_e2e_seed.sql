-- =============================================================================
-- 52. BATTLE E2E SEED — Phase BI
-- =============================================================================
-- Two test lensers (e2e_alice / e2e_bob), one published template (e2e-default),
-- and one battle (slug e2e-open-battle) in 'open' status with both contenders
-- enrolled. Loaded ONLY by scripts/e2e-battle.sh — kept out of seed.manifest
-- so production resets stay clean.
--
-- All UUIDs are deterministic in the e2e0* range so test scripts can address
-- rows by literal id without a discovery RPC.
-- =============================================================================

BEGIN;

-- Auth users -----------------------------------------------------------------
-- E2E password injected at apply time via `PGOPTIONS="-c seed.e2e_password=..."`.
-- Falls back to a random UUID per row so accounts exist but cannot be guessed.
INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at, last_sign_in_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous
)
VALUES
    ('00000000-0000-0000-0000-000000000000',
     'e2e00001-0000-0000-0000-000000000001',
     'authenticated', 'authenticated',
     'e2e_alice@lenserfight.local',
     extensions.crypt(coalesce(nullif(current_setting('seed.e2e_password', true), ''), gen_random_uuid()::text), extensions.gen_salt('bf')),
     now(), now(), now(), now(),
     '', '', '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"e2e_alice"}',
     false, false, false),
    ('00000000-0000-0000-0000-000000000000',
     'e2e00001-0000-0000-0000-000000000002',
     'authenticated', 'authenticated',
     'e2e_bob@lenserfight.local',
     extensions.crypt(coalesce(nullif(current_setting('seed.e2e_password', true), ''), gen_random_uuid()::text), extensions.gen_salt('bf')),
     now(), now(), now(), now(),
     '', '', '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"e2e_bob"}',
     false, false, false),
    ('00000000-0000-0000-0000-000000000000',
     'e2e00001-0000-0000-0000-000000000003',
     'authenticated', 'authenticated',
     'e2e_voter1@lenserfight.local',
     extensions.crypt(coalesce(nullif(current_setting('seed.e2e_password', true), ''), gen_random_uuid()::text), extensions.gen_salt('bf')),
     now(), now(), now(), now(),
     '', '', '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"e2e_voter1"}',
     false, false, false),
    ('00000000-0000-0000-0000-000000000000',
     'e2e00001-0000-0000-0000-000000000004',
     'authenticated', 'authenticated',
     'e2e_voter2@lenserfight.local',
     extensions.crypt(coalesce(nullif(current_setting('seed.e2e_password', true), ''), gen_random_uuid()::text), extensions.gen_salt('bf')),
     now(), now(), now(), now(),
     '', '', '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"e2e_voter2"}',
     false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Lenser profiles ------------------------------------------------------------
INSERT INTO lensers.profiles (id, user_id, handle, display_name, type)
VALUES
    ('e2e00001-0000-0000-0000-000000000001',
     'e2e00001-0000-0000-0000-000000000001',
     'e2e_alice', 'E2E Alice', 'human'),
    ('e2e00001-0000-0000-0000-000000000002',
     'e2e00001-0000-0000-0000-000000000002',
     'e2e_bob',   'E2E Bob',   'human'),
    ('e2e00001-0000-0000-0000-000000000003',
     'e2e00001-0000-0000-0000-000000000003',
     'e2e_voter1','E2E Voter 1','human'),
    ('e2e00001-0000-0000-0000-000000000004',
     'e2e00001-0000-0000-0000-000000000004',
     'e2e_voter2','E2E Voter 2','human')
ON CONFLICT (id) DO NOTHING;

-- Template -------------------------------------------------------------------
INSERT INTO battles.templates (
    id, creator_lenser_id, title, description, task_prompt,
    category, max_contenders, is_public
)
VALUES (
    'e2e0e2e0-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000001',
    'E2E Default Template',
    'Used by scripts/e2e-battle.sh — do not delete.',
    'Write a haiku about the LenserFight build system.',
    'creative', 2, true
)
ON CONFLICT (id) DO NOTHING;

-- Battle ---------------------------------------------------------------------
INSERT INTO battles.battles (
    id, creator_lenser_id, title, slug, task_prompt,
    status, max_contenders, template_id
)
VALUES (
    'e2eba771-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000001',
    'E2E Open Battle',
    'e2e-open-battle',
    'Write a haiku about the LenserFight build system.',
    'open', 2, 'e2e0e2e0-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Contenders -----------------------------------------------------------------
INSERT INTO battles.contenders (
    id, battle_id, slot, contender_type, contender_ref_id,
    display_name, entry_mode, contender_status, accepted_at
)
VALUES
    ('e2ec0000-0000-0000-0000-00000000000a',
     'e2eba771-0000-0000-0000-000000000001', 'A',
     'human', 'e2e00001-0000-0000-0000-000000000001',
     'E2E Alice', 'direct', 'accepted', now()),
    ('e2ec0000-0000-0000-0000-00000000000b',
     'e2eba771-0000-0000-0000-000000000001', 'B',
     'human', 'e2e00001-0000-0000-0000-000000000002',
     'E2E Bob',   'direct', 'accepted', now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
