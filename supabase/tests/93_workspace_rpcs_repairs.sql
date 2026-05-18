-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 93_workspace_rpcs_repairs.sql
-- Regression coverage for 20271222000000_fix_workspace_rpcs_and_schedule_owner.sql.
--
--   1. fn_delete_workspace_item / fn_upsert_workspace_item dispatch a per-table
--      ownership predicate. Tables without owner_lenser_id / ai_lenser_id
--      (team_members, team_edges, …) used to raise 42703 "column does not exist".
--   2. fn_create_workspace_record strips id from the payload so
--      gen_random_uuid() default fires on team_members and similar tables
--      (was 23502 NOT NULL).
--   3. fn_upsert_workflow_schedule accepts the human workflow owner after a
--      workspace switch (was 42501 'not the owner of workflow ...').
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(8);


-- ─── Fixture setup ──────────────────────────────────────────────────────────
-- @lenserfight (b2...0001) owns AI lenser d5...0001 via 08_lenser_family seed.
-- The seed deactivates @lenserfight, but lensers.get_auth_human_lenser_id()
-- only resolves active profiles. Reactivate inside this transaction (rolled
-- back at the end) so the resolver returns b2...0001 for our session JWT.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM agents.ownerships
    WHERE ai_lenser_id    = 'd5000000-0000-0000-0000-000000000001'::uuid
      AND owner_lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'seed fixture missing: ownership 0001/b2...0001';
  END IF;
END $$;

UPDATE lensers.profiles
SET    status = 'active'
WHERE  id = 'b2000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO agents.teams (id, ai_lenser_id, name, description, status, is_active)
VALUES (
  '99999999-1111-0000-0000-000000000001'::uuid,
  'd5000000-0000-0000-0000-000000000001'::uuid,
  'pgtap93-team',
  'fixture team',
  'active', true
);


-- ── Test 1: fn_create_workspace_record populates default id ─────────────────
-- All RPCs are SECURITY DEFINER, but the JWT claim is what auth.uid() reads
-- inside lensers.get_auth_human_lenser_id(). Lookups outside the function
-- happen as the superuser role so RLS doesn't hide our verification.

SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub','a1000000-0000-0000-0000-000000000001',
    'role','authenticated'
  )::text, true);

SELECT public.fn_create_workspace_record(
  'team_members',
  jsonb_build_object(
    'team_id',   '99999999-1111-0000-0000-000000000001'::uuid,
    'agent_id',  'd5000000-0000-0000-0000-000000000002'::uuid,
    'role',      'reviewer',
    'lane',      1,
    'sort_order', 0,
    'is_active', true
  )
);

SELECT isnt(
  (SELECT id FROM agents.team_members
   WHERE team_id  = '99999999-1111-0000-0000-000000000001'::uuid
     AND agent_id = 'd5000000-0000-0000-0000-000000000002'::uuid
   LIMIT 1),
  NULL,
  'fn_create_workspace_record: team_members.id populated by gen_random_uuid()'
);


-- ── Test 2: fn_upsert_workspace_item updates team_members without 42703 ─────

SELECT public.fn_upsert_workspace_item(
  'team_members',
  (SELECT id FROM agents.team_members
   WHERE team_id  = '99999999-1111-0000-0000-000000000001'::uuid
     AND agent_id = 'd5000000-0000-0000-0000-000000000002'::uuid
   LIMIT 1),
  '{"role":"operator"}'::jsonb
);

SELECT ok(true, 'fn_upsert_workspace_item: ran without column-not-exists error');


-- ── Test 3: fn_delete_workspace_item deletes the row without 42703 ─────────

SELECT public.fn_delete_workspace_item(
  'team_members',
  (SELECT id FROM agents.team_members
   WHERE team_id  = '99999999-1111-0000-0000-000000000001'::uuid
     AND agent_id = 'd5000000-0000-0000-0000-000000000002'::uuid
   LIMIT 1)
);

SELECT is(
  (SELECT count(*)::int FROM agents.team_members
   WHERE team_id = '99999999-1111-0000-0000-000000000001'::uuid),
  0,
  'fn_delete_workspace_item: team_members row was deleted'
);


-- ── Test 4: fn_create_workspace_record allowlist still rejects bad table ────

SELECT throws_ok(
  $$
  SELECT public.fn_create_workspace_record(
    'pg_authid',
    '{}'::jsonb
  )
  $$,
  '42501',
  NULL,
  'fn_create_workspace_record rejects tables outside the allowlist'
);


-- ── Test 5: fn_create_workspace_record with empty payload reaches NOT NULL ─

SELECT throws_ok(
  $$
  SELECT public.fn_create_workspace_record('team_members', '{}'::jsonb)
  $$,
  '23502',
  NULL,
  'fn_create_workspace_record: empty payload reaches NOT NULL guard (not a function error)'
);


-- ── Test 6: fn_upsert_workflow_schedule succeeds for the workflow owner ────

INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
VALUES (
  '99999999-3333-0000-0000-000000000001'::uuid,
  'b2000000-0000-0000-0000-000000000001'::uuid,
  'pgtap93-workflow',
  'fixture workflow',
  'private'
);

-- Active session is still Alice's human profile here.
SELECT lives_ok(
  $$
  SELECT public.fn_upsert_workflow_schedule(
    p_workflow_id     := '99999999-3333-0000-0000-000000000001'::uuid,
    p_schedule_id     := NULL,
    p_cron_expr       := '0 9 * * 1',
    p_timezone        := 'UTC',
    p_description     := NULL,
    p_approval_policy := '{"requiresApproval":true}'::jsonb,
    p_is_active       := false,
    p_global_model_id := NULL,
    p_assignee_id     := NULL,
    p_workflow_assignment_id := NULL,
    p_retry_policy    := '{"maxRetries":1}'::jsonb,
    p_failure_policy  := '{"mode":"isolate"}'::jsonb,
    p_queue_policy    := '{"mode":"parallel"}'::jsonb,
    p_inputs_template := '{}'::jsonb
  )
  $$,
  'fn_upsert_workflow_schedule: human owner accepted'
);


-- ── Test 7: non-owner still rejected (security boundary preserved) ─────────

SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub','a1000000-0000-0000-0000-000000000002',
    'role','authenticated'
  )::text, true);

SELECT throws_ok(
  $$
  SELECT public.fn_upsert_workflow_schedule(
    p_workflow_id     := '99999999-3333-0000-0000-000000000001'::uuid,
    p_schedule_id     := NULL,
    p_cron_expr       := '0 9 * * 1',
    p_timezone        := 'UTC',
    p_description     := NULL,
    p_approval_policy := '{"requiresApproval":true}'::jsonb,
    p_is_active       := false,
    p_global_model_id := NULL,
    p_assignee_id     := NULL,
    p_workflow_assignment_id := NULL,
    p_retry_policy    := '{"maxRetries":1}'::jsonb,
    p_failure_policy  := '{"mode":"isolate"}'::jsonb,
    p_queue_policy    := '{"mode":"parallel"}'::jsonb,
    p_inputs_template := '{}'::jsonb
  )
  $$,
  '42501',
  NULL,
  'fn_upsert_workflow_schedule: non-owner caller still rejected'
);


-- ── Test 8: ownership helper EXECUTE granted to authenticated ─────────────

SELECT ok(
  has_function_privilege('authenticated',
    'public.fn__workspace_ownership_predicate(text)', 'EXECUTE'),
  'fn__workspace_ownership_predicate: authenticated may execute'
);


SELECT * FROM finish();
ROLLBACK;
