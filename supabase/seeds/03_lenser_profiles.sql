-- =============================================================================
-- 3. LENSER PROFILES
-- =============================================================================

INSERT INTO lensers.profiles (
    id, user_id, handle, display_name, bio, status, visibility
)
VALUES
    (
        'b2000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'alice_arena', 'Alice Arena',
        'Battle arena enthusiast and prompt engineer.',
        'active', 'public'
    ),
    (
        'b2000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'bob_builder', 'Bob Builder',
        'AI researcher and competitive coder.',
        'active', 'public'
    ),
    (
        'b2000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'carol_voter', 'Carol Voter',
        'Community judge and feedback specialist.',
        'active', 'public'
    )
ON CONFLICT (id) DO NOTHING;
