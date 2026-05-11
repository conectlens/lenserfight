-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 34_automation_authz.sql
-- Authorization & GRANT surface for the automation RPCs.
--
--   * lenses.workflow_schedules — RLS blocks direct INSERT/UPDATE/DELETE by
--     authenticated. Owners can SELECT their own rows.
--   * public.fn_upsert_workflow_schedule — non-owner caller raises 42501.
--   * agents.fn_start_team_run — REVOKEd from anon + authenticated; only
--     service_role can execute.
--   * lenses.fn_claim_scheduled_workflow_run — REVOKEd from anon + authenticated.
--   * battles.fn_claim_battle_execution_job — REVOKEd from anon + authenticated.
--   * agents.fn_claim_team_run — REVOKEd from anon + authenticated.
--   * public.fn_list_automation_rules — returns only the caller's rules.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(11);

-- ── Test 1: RLS denies authenticated direct INSERT into workflow_schedules ──
-- The Phase 2 migration disables direct write; callers must use the upsert RPC.
DO $$ BEGIN PERFORM 1; END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub','a1000000-0000-0000-0000-000000000001',
                    'role','authenticated')::text, true);

-- Pick one of Alice's seeded workflows
SELECT throws_ok(
  $$
  INSERT INTO lenses.workflow_schedules (
    workflow_id, cron_expr, timezone, is_active
  ) VALUES (
    (SELECT id FROM lenses.workflows
      WHERE lenser_id='b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    '0 * * * *', 'UTC', true
  )
  $$,
  '42501',
  NULL,
  'authenticated cannot direct-INSERT into lenses.workflow_schedules'
);

SELECT throws_ok(
  $$
  DELETE FROM lenses.workflow_schedules
  WHERE workflow_id = (
    SELECT id FROM lenses.workflows
    WHERE lenser_id='b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1
  )
  $$,
  '42501',
  NULL,
  'authenticated cannot direct-DELETE from lenses.workflow_schedules'
);

RESET ROLE;

-- ── Test 2: fn_upsert_workflow_schedule rejects non-owner caller ──────────
-- Bob (a1...0002) tries to schedule one of Alice's workflows.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub','a1000000-0000-0000-0000-000000000002',
                    'role','authenticated')::text, true);

SELECT throws_ok(
  $$
  SELECT public.fn_upsert_workflow_schedule(
    p_workflow_id := (
      SELECT id FROM lenses.workflows
      WHERE lenser_id='b2000000-0000-0000-0000-000000000001'::uuid LIMIT 1
    ),
    p_schedule_id := NULL,
    p_cron_expr   := '0 * * * *',
    p_timezone    := 'UTC',
    p_description := NULL,
    p_approval_policy := NULL,
    p_is_active   := false,
    p_global_model_id := NULL,
    p_assignee_id := NULL,
    p_workflow_assignment_id := NULL,
    p_retry_policy := NULL,
    p_failure_policy := NULL,
    p_queue_policy := NULL,
    p_inputs_template := NULL
  )
  $$,
  NULL,
  NULL,
  'fn_upsert_workflow_schedule rejects non-owner caller (raises)'
);

RESET ROLE;

-- ── Test 3: fn_list_automation_rules scoping ──────────────────────────────
-- Insert two trigger_rules: one for Alice (a1...0001), one for Bob (a1...0002).
-- Then call as Alice and assert only Alice's row returns.
DO $$
BEGIN
  INSERT INTO automation.trigger_rules (
    lenser_id, name, match_event_type, match_filter,
    action_kind, action_config, is_active
  ) VALUES
    ('a1000000-0000-0000-0000-000000000001'::uuid, 'pgtap34-rule-alice',
     'workflow.run.completed', '{}'::jsonb, 'notify', '{}'::jsonb, true),
    ('a1000000-0000-0000-0000-000000000002'::uuid, 'pgtap34-rule-bob',
     'workflow.run.completed', '{}'::jsonb, 'notify', '{}'::jsonb, true);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub','a1000000-0000-0000-0000-000000000001',
                    'role','authenticated')::text, true);

SELECT ok(
  EXISTS(
    SELECT 1 FROM public.fn_list_automation_rules(p_limit := 50, p_cursor := NULL)
    WHERE name = 'pgtap34-rule-alice'
  ),
  'fn_list_automation_rules returns the caller''s own rule'
);

SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM public.fn_list_automation_rules(p_limit := 50, p_cursor := NULL)
    WHERE name = 'pgtap34-rule-bob'
  ),
  'fn_list_automation_rules does NOT return another caller''s rule'
);

RESET ROLE;

-- ── Test 4: anon/authenticated cannot execute service-role-only RPCs ─────
SELECT ok(
  NOT has_function_privilege('authenticated',
    'agents.fn_start_team_run(uuid,uuid,jsonb,text)', 'EXECUTE'),
  'authenticated does NOT have EXECUTE on agents.fn_start_team_run'
);

SELECT ok(
  NOT has_function_privilege('anon',
    'agents.fn_start_team_run(uuid,uuid,jsonb,text)', 'EXECUTE'),
  'anon does NOT have EXECUTE on agents.fn_start_team_run'
);

SELECT ok(
  has_function_privilege('service_role',
    'agents.fn_start_team_run(uuid,uuid,jsonb,text)', 'EXECUTE'),
  'service_role HAS EXECUTE on agents.fn_start_team_run'
);

SELECT ok(
  NOT has_function_privilege('authenticated',
    'lenses.fn_claim_scheduled_workflow_run(text)', 'EXECUTE'),
  'authenticated does NOT have EXECUTE on lenses.fn_claim_scheduled_workflow_run'
);

SELECT ok(
  NOT has_function_privilege('authenticated',
    'battles.fn_claim_battle_execution_job(text)', 'EXECUTE'),
  'authenticated does NOT have EXECUTE on battles.fn_claim_battle_execution_job'
);

SELECT ok(
  NOT has_function_privilege('authenticated',
    'agents.fn_claim_team_run(text)', 'EXECUTE'),
  'authenticated does NOT have EXECUTE on agents.fn_claim_team_run'
);

SELECT * FROM finish();
ROLLBACK;
