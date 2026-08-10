-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 110_workspace_record_null_defaults.sql (issue #478)
--
--   1. fn_create_workspace_record succeeds when the caller sends an explicit
--      JSON null for team_members.responsibility (NOT NULL DEFAULT '') —
--      previously raised 23502.
--   2. The inserted row gets the column's actual default value ('') rather
--      than some other placeholder.
--   3. An explicit null for team_members.role (NOT NULL DEFAULT 'operator',
--      a second NOT-NULL-DEFAULT column on the same table) is handled the
--      same way — confirms the fix is general, not special-cased to one
--      column.
--   4. A genuinely required column with NO default (team_members.team_id)
--      explicitly nulled still fails — the fix does not paper over missing
--      required data, only columns that have a real DEFAULT to fall back to.
--
-- Uses the 08_lenser_family seed fixture (Alice b2...0001 owns AI lenser
-- LENSO, ai_lensers.id = d5...0001).
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(4);

-- ─── Fixture setup ──────────────────────────────────────────────────────────
UPDATE lensers.profiles SET status = 'active' WHERE id = 'b2000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO agents.teams (id, ai_lenser_id, name, description, status, is_active)
VALUES (
  '99999999-1110-0000-0000-000000000001'::uuid,
  'd5000000-0000-0000-0000-000000000001'::uuid,
  'pgtap110-team',
  'fixture team',
  'active', true
)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true);

-- ── Test 1: explicit null for responsibility no longer raises 23502 ────────
SELECT lives_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'team_members',
    jsonb_build_object(
      'team_id', '99999999-1110-0000-0000-000000000001'::uuid,
      'agent_id', 'd5000000-0000-0000-0000-000000000002'::uuid,
      'role', 'leader',
      'responsibility', NULL,
      'lane', 1,
      'sort_order', 0,
      'is_active', true
    )
  )
  $$,
  'fn_create_workspace_record: explicit null for responsibility no longer raises NOT NULL violation'
);

-- ── Test 2: the column falls back to its real default ('') ─────────────────
SELECT is(
  (SELECT responsibility FROM agents.team_members
   WHERE team_id = '99999999-1110-0000-0000-000000000001'::uuid
     AND agent_id = 'd5000000-0000-0000-0000-000000000002'::uuid),
  '',
  'fn_create_workspace_record: responsibility falls back to its column default (empty string)'
);

-- ── Test 3: a second NOT-NULL-DEFAULT column (role) is handled the same way ─
SELECT lives_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'team_members',
    jsonb_build_object(
      'team_id', '99999999-1110-0000-0000-000000000001'::uuid,
      'agent_id', 'd5000000-0000-0000-0000-000000000003'::uuid,
      'role', NULL,
      'lane', 2,
      'sort_order', 1,
      'is_active', true
    )
  )
  $$,
  'fn_create_workspace_record: explicit null for role (a second NOT-NULL-DEFAULT column) also falls back to its default'
);

-- ── Test 4: a required column with NO default still fails when nulled ──────
SELECT throws_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'team_members',
    jsonb_build_object(
      'team_id', NULL,
      'agent_id', 'd5000000-0000-0000-0000-000000000004'::uuid,
      'role', 'operator'
    )
  )
  $$,
  '23502',
  NULL,
  'fn_create_workspace_record: nulling a required column with no default still raises NOT NULL (23502)'
);

SELECT * FROM finish();
ROLLBACK;
