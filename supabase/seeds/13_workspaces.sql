-- =============================================================================
-- 13. RESERVED-USER WORKSPACES (depends on 03_lenser_profiles)
-- =============================================================================
-- The trigger tenancy.fn_create_personal_workspace fires on INSERT OR UPDATE on
-- lensers.profiles and is idempotent — it guarantees every lenser has a personal
-- workspace. No general backfill is needed here.
--
-- This seed pins deterministic workspace IDs for the three reserved production
-- accounts (@lenserfight, @chainabit, @conectlens) so downstream seeds
-- (07_ai_lensers, 14_media_objects, etc.) can reference them by a stable UUID.
--
-- We DELETE then INSERT (not UPDATE) because workspace_members has
-- ON DELETE CASCADE but no ON UPDATE CASCADE — changing the workspace PK via
-- UPDATE violates the FK. The guard trigger is disabled only for this
-- delete+reinsert window; rows are recreated immediately.

ALTER TABLE tenancy.workspaces DISABLE TRIGGER trg_workspaces_guard_personal;

-- Sweep legacy demo slugs and any prior names for the reserved trio.
DELETE FROM tenancy.workspaces
WHERE slug IN ('alice_arena', 'bob_builder', 'carol_voter',
               'lenserfight', 'chainabit', 'conectlens');

INSERT INTO tenancy.workspaces (id, slug, type, display_name, owner_lenser_id)
VALUES
    ('c3000000-0000-0000-0000-000000000001', 'lenserfight', 'personal', 'LenserFight', 'b2000000-0000-0000-0000-000000000001'),
    ('c3000000-0000-0000-0000-000000000002', 'chainabit',   'personal', 'Chainabit',   'b2000000-0000-0000-0000-000000000002'),
    ('c3000000-0000-0000-0000-000000000003', 'conectlens',  'personal', 'ConectLens',  'b2000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
    slug          = EXCLUDED.slug,
    display_name  = EXCLUDED.display_name,
    owner_lenser_id = EXCLUDED.owner_lenser_id;

ALTER TABLE tenancy.workspaces ENABLE TRIGGER trg_workspaces_guard_personal;

INSERT INTO tenancy.workspace_members (workspace_id, lenser_id, role)
VALUES
    ('c3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'owner'),
    ('c3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'owner'),
    ('c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'owner')
ON CONFLICT (workspace_id, lenser_id) DO NOTHING;
