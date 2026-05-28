-- ─────────────────────────────────────────────────────────────────────────────
-- pgTAP: 39_automation_purge.sql (D6 verification)
-- Verifies agents.fn_purge_stale_blocked_team_runs:
--   * Blocked + pending + created_at < cutoff → cancelled / timed_out.
--   * Recently-blocked rows untouched.
--   * Already-approved rows untouched.
--   * Emits approval_timed_out event for each purged row.
--
-- All changes rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
SELECT plan(6);

DO $$
DECLARE
  v_ail uuid;
  v_old uuid; v_recent uuid; v_approved uuid;
BEGIN
  SELECT id INTO v_ail FROM agents.ai_lensers LIMIT 1;

  -- Old blocked (40 days) — should be purged
  INSERT INTO agents.team_runs (
    ai_lenser_id, status, approval_status, created_at
  ) VALUES (v_ail, 'blocked', 'pending', now() - interval '40 days')
  RETURNING id INTO v_old;

  -- Recent blocked (1 day) — should NOT be purged
  INSERT INTO agents.team_runs (
    ai_lenser_id, status, approval_status, created_at
  ) VALUES (v_ail, 'blocked', 'pending', now() - interval '1 day')
  RETURNING id INTO v_recent;

  -- Old but already approved — should NOT be purged
  INSERT INTO agents.team_runs (
    ai_lenser_id, status, approval_status, created_at
  ) VALUES (v_ail, 'queued', 'approved', now() - interval '40 days')
  RETURNING id INTO v_approved;

  PERFORM set_config('app.pgtap39.old', v_old::text, true);
  PERFORM set_config('app.pgtap39.recent', v_recent::text, true);
  PERFORM set_config('app.pgtap39.approved', v_approved::text, true);
END $$;

-- ── Test 1: function returns the count of purged rows ─────────────────────
SELECT is(
  (SELECT agents.fn_purge_stale_blocked_team_runs())::int,
  1,
  'fn_purge_stale_blocked_team_runs returns 1 (one stale row)'
);

-- ── Test 2: old blocked row transitioned to cancelled / timed_out ─────────
SELECT is(
  (SELECT status FROM agents.team_runs
   WHERE id = current_setting('app.pgtap39.old')::uuid),
  'cancelled',
  'stale blocked row → status=cancelled'
);

SELECT is(
  (SELECT approval_status FROM agents.team_runs
   WHERE id = current_setting('app.pgtap39.old')::uuid),
  'timed_out',
  'stale blocked row → approval_status=timed_out'
);

-- ── Test 3: recent blocked row untouched ──────────────────────────────────
SELECT is(
  (SELECT status FROM agents.team_runs
   WHERE id = current_setting('app.pgtap39.recent')::uuid),
  'blocked',
  'recent blocked row remains blocked'
);

-- ── Test 4: already-approved row untouched ────────────────────────────────
SELECT is(
  (SELECT status FROM agents.team_runs
   WHERE id = current_setting('app.pgtap39.approved')::uuid),
  'queued',
  'approved row not purged'
);

-- ── Test 5: approval_timed_out event emitted ──────────────────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM agents.agent_run_events
    WHERE team_run_id = current_setting('app.pgtap39.old')::uuid
      AND event_type = 'approval_timed_out'
  ),
  'approval_timed_out event emitted for the purged row'
);

SELECT * FROM finish();
ROLLBACK;
