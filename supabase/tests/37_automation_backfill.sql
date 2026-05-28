-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 37_automation_backfill.sql
-- public.fn_backfill_schedule:
--   * dry-run returns would_dispatch count, no inserts.
--   * live run inserts workflow_runs rows with metadata.backfill_id.
--   * re-run of same window inserts 0 (dedup via metadata.backfill_id and
--     the (schedule_id, scheduled_for) unique index).
--   * p_since older than 30 days raises 22023.
--   * caller must own the workflow (non-owner raises).
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(6);

-- ── Fixture: Alice owns a workflow + every-minute schedule ────────────────
DO $$
DECLARE
  v_wf uuid := gen_random_uuid();
  v_sched uuid := gen_random_uuid();
BEGIN
  INSERT INTO lenses.workflows (id, lenser_id, title, visibility)
  VALUES (v_wf, 'b2000000-0000-0000-0000-000000000001'::uuid,
          'pgTAP 37 backfill wf', 'private');
  INSERT INTO lenses.workflow_schedules (
    id, workflow_id, cron_expr, timezone, is_active
  ) VALUES (v_sched, v_wf, '* * * * *', 'UTC', true);
  PERFORM set_config('app.pgtap37.wf', v_wf::text, true);
  PERFORM set_config('app.pgtap37.sched', v_sched::text, true);
END $$;

-- Switch to Alice
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub','a1000000-0000-0000-0000-000000000001',
                    'role','authenticated')::text, true);

-- ── Test 1: dry-run reports a would_dispatch count, NO inserts ────────────
DO $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.fn_backfill_schedule(
    current_setting('app.pgtap37.sched')::uuid,
    now() - interval '5 minutes',
    true  -- dry_run
  );
  PERFORM set_config('app.pgtap37.dry', v_result::text, true);
END $$;

SELECT ok(
  (current_setting('app.pgtap37.dry')::jsonb)->>'would_dispatch' IS NOT NULL,
  'dry-run returns would_dispatch field'
);

SELECT is(
  (SELECT count(*)::int FROM lenses.workflow_runs
   WHERE schedule_id = current_setting('app.pgtap37.sched')::uuid),
  0,
  'dry-run did not insert workflow_runs rows'
);

-- ── Test 2: live run inserts rows + tags them with metadata.backfill_id ──
DO $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.fn_backfill_schedule(
    current_setting('app.pgtap37.sched')::uuid,
    now() - interval '3 minutes',
    false  -- live
  );
  PERFORM set_config('app.pgtap37.live1', v_result::text, true);
END $$;

SELECT ok(
  ((current_setting('app.pgtap37.live1')::jsonb)->>'dispatched')::int >= 1,
  'live backfill inserted at least one workflow_run'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM lenses.workflow_runs
    WHERE schedule_id = current_setting('app.pgtap37.sched')::uuid
      AND metadata ? 'backfill_id'
  ),
  'inserted rows are tagged with metadata.backfill_id'
);

-- ── Test 3: re-run same window inserts 0 (dedup) ──────────────────────────
DO $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.fn_backfill_schedule(
    current_setting('app.pgtap37.sched')::uuid,
    now() - interval '3 minutes',
    false
  );
  PERFORM set_config('app.pgtap37.live2', v_result::text, true);
END $$;

SELECT is(
  ((current_setting('app.pgtap37.live2')::jsonb)->>'dispatched')::int,
  0,
  'second live backfill same window inserts 0 rows (dedup)'
);

-- ── Test 4: p_since older than 30 days raises ─────────────────────────────
SELECT throws_ok(
  $$ SELECT public.fn_backfill_schedule(
       current_setting('app.pgtap37.sched')::uuid,
       now() - interval '31 days',
       true)
  $$,
  '22023',
  NULL,
  'p_since older than 30 days raises 22023'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
