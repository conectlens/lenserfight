-- =============================================================================
-- 3. LENSER PROFILES
-- =============================================================================

INSERT INTO lensers.profiles (
    id, user_id, handle, display_name, bio, status, visibility,
    onboarding_step, onboarding_completed_at
)
VALUES
    (
        'b2000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'alice_arena', 'Alice Arena',
        'Battle arena enthusiast and prompt engineer.',
        'active', 'public', 2, now()
    ),
    (
        'b2000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'bob_builder', 'Bob Builder',
        'AI researcher and competitive coder.',
        'active', 'public', 2, now()
    ),
    (
        'b2000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'carol_voter', 'Carol Voter',
        'Community judge and feedback specialist.',
        'active', 'public', 2, now()
    )
ON CONFLICT (id) DO UPDATE SET
    onboarding_step = 2,
    onboarding_completed_at = COALESCE(lensers.profiles.onboarding_completed_at, now()),
    updated_at = now();
