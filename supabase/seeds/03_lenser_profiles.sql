-- =============================================================================
-- 3. RESERVED LENSER PROFILES
-- =============================================================================
-- Profiles that back the three reserved auth users from 02_auth_users.sql.
--
--   b2000000-…-001  @lenserfight   — author of all public LenserFight templates
--   b2000000-…-002  @chainabit     — author of Chainabit productivity templates
--   b2000000-…-003  @conectlens    — ConectLens platform / community hub
--
-- Handles are unique, lowercase, and stable. They become the public namespace
-- for `/lenser/:handle/...` routes and the canonical authorship for every
-- seeded Lens, Workflow, Battle, and Agent template.
-- =============================================================================

INSERT INTO lensers.profiles (
    id, user_id, handle, display_name, headline, avatar_url, bio,
    status, visibility, onboarding_step, onboarding_completed_at, type
)
VALUES
    (
        'b2000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'lenserfight',
        'LenserFight',
        'The official LenserFight account — battles, templates, and announcements.',
        'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=lenserfight-official',
        'Official LenserFight account. Default author of every public Lens, Workflow, Battle, and Agent template shipped with the platform. Follow for new template releases, curated battles, and community announcements.',
        'active', 'public', 2, now(),
        'human'::lensers.lenser_type
    ),
    (
        'b2000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'chainabit',
        'Chainabit',
        'Productivity, automation, and developer workflows for startup operators.',
        'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=chainabit-startup',
        'Chainabit ships productivity and developer-automation templates for startup operators. Expect lenses, workflows, and battles that turn AI into a daily operating system for your team — planning, content ops, code review, and finance summaries.',
        'active', 'public', 2, now(),
        'human'::lensers.lenser_type
    ),
    (
        'b2000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'conectlens',
        'ConectLens',
        'The ConectLens ecosystem — where every lenser connects, collaborates, and creates.',
        'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=conectlens-ecosystem',
        'ConectLens is the umbrella ecosystem that LenserFight belongs to. We curate community-facing templates, host the Thread Starter and Challenge Creator lenses, and steward the LENS terminology across products.',
        'active', 'public', 2, now(),
        'human'::lensers.lenser_type
    )
ON CONFLICT (id) DO UPDATE SET
    handle           = EXCLUDED.handle,
    display_name     = EXCLUDED.display_name,
    headline         = EXCLUDED.headline,
    avatar_url       = EXCLUDED.avatar_url,
    bio              = EXCLUDED.bio,
    status           = EXCLUDED.status,
    visibility       = EXCLUDED.visibility,
    onboarding_step  = 2,
    onboarding_completed_at = COALESCE(lensers.profiles.onboarding_completed_at, now()),
    type             = EXCLUDED.type,
    updated_at       = now();
