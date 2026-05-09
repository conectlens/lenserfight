-- =============================================================================
-- 13. WORKSPACES (depends on 03_lenser_profiles)
-- =============================================================================
-- The trigger tenancy.fn_create_personal_workspace fires on INSERT OR UPDATE on
-- lensers.profiles and is idempotent — it guarantees every lenser has a personal
-- workspace. No general backfill is needed here.
--
-- This seed only pins deterministic workspace IDs for alice/bob/carol so that
-- downstream seeds (07_ai_lensers, 14_media_objects, etc.) can reference them
-- by a stable UUID.
--
-- We must DELETE then INSERT (not UPDATE) because workspace_members has
-- ON DELETE CASCADE but no ON UPDATE CASCADE — changing the workspace PK
-- via UPDATE violates the FK constraint. The guard trigger is disabled only
-- for this delete+reinsert window; we immediately recreate the rows.

ALTER TABLE tenancy.workspaces DISABLE TRIGGER trg_workspaces_guard_personal;

DELETE FROM tenancy.workspaces
WHERE slug IN ('alice_arena', 'bob_builder', 'carol_voter');

INSERT INTO tenancy.workspaces (id, slug, type, display_name, owner_lenser_id)
VALUES
    ('c3000000-0000-0000-0000-000000000001', 'alice_arena', 'personal', 'Alice Arena', 'b2000000-0000-0000-0000-000000000001'),
    ('c3000000-0000-0000-0000-000000000002', 'bob_builder', 'personal', 'Bob Builder', 'b2000000-0000-0000-0000-000000000002'),
    ('c3000000-0000-0000-0000-000000000003', 'carol_voter', 'personal', 'Carol Voter', 'b2000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE tenancy.workspaces ENABLE TRIGGER trg_workspaces_guard_personal;

INSERT INTO tenancy.workspace_members (workspace_id, lenser_id, role)
VALUES
    ('c3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'owner'),
    ('c3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'owner'),
    ('c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'owner')
ON CONFLICT (workspace_id, lenser_id) DO NOTHING;
