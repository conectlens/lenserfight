-- =============================================================================
-- 46. CONNECTORS (depends on 13_workspaces)
-- =============================================================================
-- One inactive demo connector for Alice's personal workspace, so that
-- `lenserfight connectors list` returns non-empty output in dev. The
-- token_hash is sha256 of the literal string 'lf_demo_inactive_token_2026'
-- (the connector is is_active=false so it cannot authenticate anything).

INSERT INTO connectors.connectors
    (id, workspace_id, slug, name, description, kind, is_active, created_by, created_at)
VALUES
    (
        'c4000000-0000-0000-0000-000000000001',
        'c3000000-0000-0000-0000-000000000001',
        'chainabit-demo',
        'Chainabit Demo (inactive)',
        'Reference connector seeded for the OSS quickstart. Activate via lenserfight connectors add.',
        'api',
        false,
        'b2000000-0000-0000-0000-000000000001',
        '2026-05-01T00:00:00Z'
    )
ON CONFLICT (workspace_id, slug) DO NOTHING;

INSERT INTO connectors.connector_tokens
    (id, connector_id, token_hash, token_prefix, scopes, revoked_at, created_at)
VALUES
    (
        'c4100000-0000-0000-0000-000000000001',
        'c4000000-0000-0000-0000-000000000001',
        encode(digest('lf_demo_inactive_token_2026', 'sha256'), 'hex'),
        'lf_demo_in',
        ARRAY['lenses:read']::text[],
        '2026-05-02T00:00:00Z',
        '2026-05-01T00:00:00Z'
    )
ON CONFLICT (token_hash) DO NOTHING;
