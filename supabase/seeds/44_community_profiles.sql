-- =============================================================================
-- 44. COMMUNITY PROFILES
-- =============================================================================
-- Seeds three community / organization lenser accounts:
--
--   ConnectLens           — the platform's community hub
--   Chainabit             — developer-focused community
--   LenserFight Community — official LenserFight community space
--
-- Each community IS a lenser (GRASP Polymorphism: communities reuse the
-- existing profile type rather than a separate entity). They are seeded as
-- human-type profiles backed by their own auth.users so they can log in,
-- own public lenses, and be followed by other lensers.
--
-- ConnectLens is also set as a co-author on the Thread Starter and Challenge
-- Creator lenses (via lenses.lenses.lenser_id update) so the public template
-- library appears multi-authored.
--
-- UUID ranges:
--   auth.users   ids: a4000000-0000-0000-0000-00000000000N
--   profile ids:      b4000000-0000-0000-0000-00000000000N
--
-- Idempotent: ON CONFLICT guards on both auth.users and lensers.profiles.
-- =============================================================================

-- ── 1. Auth users ────────────────────────────────────────────────────────────

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
  -- ConnectLens
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'system@connectlens.local',
    extensions.crypt('ConnectLens#2026!', extensions.gen_salt('bf')),
    now(), now(), now(), now(),
    '', NULL, '', NULL,
    '', '', '', NULL, 0,
    '', NULL,
    false, false, NULL, false,
    NULL, NULL, '', '', NULL,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"ConnectLens"}'
  ),
  -- Chainabit
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'system@chainabit.local',
    extensions.crypt('Chainabit#2026!', extensions.gen_salt('bf')),
    now(), now(), now(), now(),
    '', NULL, '', NULL,
    '', '', '', NULL, 0,
    '', NULL,
    false, false, NULL, false,
    NULL, NULL, '', '', NULL,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Chainabit"}'
  ),
  -- LenserFight Community
  (
    '00000000-0000-0000-0000-000000000000',
    'a4000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'community@lenserfight.local',
    extensions.crypt('LFCommunity#2026!', extensions.gen_salt('bf')),
    now(), now(), now(), now(),
    '', NULL, '', NULL,
    '', '', '', NULL, 0,
    '', NULL,
    false, false, NULL, false,
    NULL, NULL, '', '', NULL,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"LenserFight Community"}'
  )
ON CONFLICT (id) DO NOTHING;

-- ── 2. Lenser profiles ───────────────────────────────────────────────────────

INSERT INTO lensers.profiles (
  id, user_id, handle, display_name, headline, avatar_url, bio,
  status, visibility, onboarding_step, onboarding_completed_at, type,
  created_at, updated_at
)
VALUES
  -- ConnectLens — the platform hub
  (
    'b4000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000001',
    'connectlens',
    'ConnectLens',
    'Where every lenser connects, collaborates, and creates.',
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=connectlens-community-hub',
    'ConnectLens is the community hub of LenserFight — a space where lensers of every kind (human, AI, and beyond) share templates, run workflows, and build together. Every lenser is welcome here.',
    'active', 'public', 2, now(),
    'human'::lensers.lenser_type,
    now(), now()
  ),
  -- Chainabit — developer community
  (
    'b4000000-0000-0000-0000-000000000002',
    'a4000000-0000-0000-0000-000000000002',
    'chainabit',
    'Chainabit',
    'Developer-first community for AI-powered workflows and code lenses.',
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=chainabit-developer-community',
    'Chainabit is a developer-focused community on LenserFight. We publish code review lenses, SQL builders, test generators, and workflow templates to help developers ship faster with AI. Open source at heart.',
    'active', 'public', 2, now(),
    'human'::lensers.lenser_type,
    now(), now()
  ),
  -- LenserFight Community — official space
  (
    'b4000000-0000-0000-0000-000000000003',
    'a4000000-0000-0000-0000-000000000003',
    'lenserfight_community',
    'LenserFight Community',
    'The official LenserFight community — battles, challenges, and announcements.',
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=lenserfight-official-community',
    'The official LenserFight community profile. Follow for new challenges, community announcements, template highlights, and curated workflows from the team and top lensers.',
    'active', 'public', 2, now(),
    'human'::lensers.lenser_type,
    now(), now()
  )
ON CONFLICT (id) DO UPDATE SET
  display_name   = EXCLUDED.display_name,
  headline       = EXCLUDED.headline,
  bio            = EXCLUDED.bio,
  status         = EXCLUDED.status,
  visibility     = EXCLUDED.visibility,
  updated_at     = now();

-- ── 3. Re-attribute two community lenses to ConnectLens ─────────────────────
-- Thread Starter and Challenge Creator are the most community-facing lenses.
-- We re-attribute them from the AI system author to the ConnectLens profile
-- so the public template library reflects a multi-authored library.
-- Only executes if those lenses exist and ConnectLens profile was just seeded.

DO $$
DECLARE
  v_connectlens_id uuid := 'b4000000-0000-0000-0000-000000000001';
  v_thread_lens    uuid := '41000000-0001-000c-0001-000000000001';
  v_challenge_lens uuid := '41000000-0001-000d-0001-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM lensers.profiles WHERE id = v_connectlens_id)
  AND EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_thread_lens)
  THEN
    UPDATE lenses.lenses
    SET lenser_id = v_connectlens_id
    WHERE id IN (v_thread_lens, v_challenge_lens)
    AND lenser_id != v_connectlens_id;

    RAISE NOTICE '44_community_profiles: re-attributed Thread Starter and Challenge Creator to ConnectLens.';
  END IF;
END
$$;

ANALYZE lensers.profiles;
