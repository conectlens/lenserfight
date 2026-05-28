-- =============================================================================
-- 14. MEDIA OBJECTS (depends on 13_workspaces)
-- =============================================================================
-- Sample media objects for testing upload lifecycle and attachment bindings.

INSERT INTO media.objects (
    id, workspace_id, owner_lenser_id,
    content_text, media_type, name,
    visibility, lifecycle_state, created_by
)
VALUES
    (
        'd4000000-0000-0000-0000-000000000001',
        'c3000000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        'This is a sample inline text resource for testing.',
        'text', 'sample-text-resource.txt',
        'private', 'active',
        'b2000000-0000-0000-0000-000000000001'
    ),
    (
        'd4000000-0000-0000-0000-000000000002',
        'c3000000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000001',
        NULL, 'image', 'sample-image.png',
        'public', 'pending',
        'b2000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (id) DO NOTHING;
