-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D6: blocked team_runs (approval_status='pending') never age out.
--
-- A workflow can request approval via fn_start_team_run(p_policy=approval_
-- required), which leaves the row at status='blocked', approval_status=
-- 'pending'. If the approver never responds, the row sits forever, cluttering
-- dashboards and inflating queue counts.
--
-- Fix:
--   1. Add agents.fn_purge_stale_blocked_team_runs(p_max_age interval default 30d)
--      that transitions blocked + approval_status='pending' rows older than
--      p_max_age to status='cancelled', approval_status='timed_out', and
--      emits an 'approval_timed_out' event.
--   2. Register a pg_cron job to call it daily at 03:17 UTC.
--
-- The function is SECURITY DEFINER + service_role only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.fn_purge_stale_blocked_team_runs(
  p_max_age interval DEFAULT interval '30 days'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'agents', 'public'
AS $function$
DECLARE
  v_cutoff timestamptz := now() - GREATEST(p_max_age, interval '1 hour');
  v_purged integer := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM   agents.team_runs
    WHERE  status          = 'blocked'
      AND  approval_status = 'pending'
      AND  created_at     <  v_cutoff
    FOR UPDATE SKIP LOCKED
    LIMIT  500   -- bounded sweep; cron re-runs daily
  LOOP
    UPDATE agents.team_runs
    SET    status          = 'cancelled',
           approval_status = 'timed_out',
           completed_at    = now(),
           updated_at      = now()
    WHERE  id = r.id;

    INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
    VALUES (r.id, 'approval_timed_out',
            jsonb_build_object('reason', 'stale_blocked_purge',
                               'cutoff', v_cutoff));

    v_purged := v_purged + 1;
  END LOOP;

  RETURN v_purged;
END;
$function$;

REVOKE ALL ON FUNCTION agents.fn_purge_stale_blocked_team_runs(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.fn_purge_stale_blocked_team_runs(interval) FROM authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_purge_stale_blocked_team_runs(interval) TO service_role;

COMMENT ON FUNCTION agents.fn_purge_stale_blocked_team_runs(interval) IS
  'D6: daily age-out for blocked team_runs whose approval never arrived. '
  'Transitions to status=cancelled, approval_status=timed_out, emits '
  'approval_timed_out event. Bounded sweep of 500 per call.';

-- Register pg_cron job. The DO block is idempotent — unschedule existing
-- first to support re-applying the migration.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-stale-blocked-team-runs')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'purge-stale-blocked-team-runs'
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.schedule(
      'purge-stale-blocked-team-runs',
      '17 3 * * *',
      $cmd$ SELECT agents.fn_purge_stale_blocked_team_runs() $cmd$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'D6: could not register cron job (pg_cron unavailable?): %', SQLERRM;
END $$;
