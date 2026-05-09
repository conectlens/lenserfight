-- Phase K1: Approval auto-timeout enforcement
--
-- Pending approvals older than `app.approval_timeout_hours` (default 24) are
-- transitioned to `approval_status='timed_out'`, the underlying workflow_run
-- is failed with `status='timed_out'`, and an `approval_timed_out` event is
-- written to `agents.agent_run_events`.
--
-- The expiry job runs every 5 minutes via pg_cron. The UPDATE uses
-- `FOR UPDATE SKIP LOCKED` so concurrent firings cannot double-process the
-- same row.
--
-- Configuration: operators set the hours threshold via Postgres GUC.
--   ALTER DATABASE postgres SET app.approval_timeout_hours = 12;
-- A NULL/unset GUC defaults to 24.
--
-- Changes:
--   1. Extend `agents.team_runs.approval_status` CHECK to allow 'timed_out'
--   2. Create `public.fn_expire_stale_approvals()` — atomically expires aged rows
--   3. Register pg_cron job `expire-stale-approvals` (*/5 * * * *)

-- ─── 1. Extend approval_status check constraint ──────────────────────────────

ALTER TABLE agents.team_runs
  DROP CONSTRAINT IF EXISTS team_runs_approval_status_check;

ALTER TABLE agents.team_runs
  ADD CONSTRAINT team_runs_approval_status_check CHECK (approval_status = ANY (ARRAY[
    'pending'::text,
    'approved'::text,
    'rejected'::text,
    'not_required'::text,
    'timed_out'::text
  ]));

-- ─── 2. fn_expire_stale_approvals ────────────────────────────────────────────
-- Returns the count of rows expired in the call. Idempotent: rows already in a
-- non-pending state are skipped. Uses CTE + FOR UPDATE SKIP LOCKED so two
-- concurrent cron firings cannot double-write the same team_run.

CREATE OR REPLACE FUNCTION public.fn_expire_stale_approvals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'agents', 'lenses', 'public'
AS $$
DECLARE
  v_threshold_hours integer := COALESCE(
    NULLIF(current_setting('app.approval_timeout_hours', true), '')::integer,
    24
  );
  v_cutoff   timestamptz := now() - (v_threshold_hours * interval '1 hour');
  v_expired  integer     := 0;
  r          RECORD;
BEGIN
  FOR r IN
    SELECT id, workflow_run_id
    FROM   agents.team_runs
    WHERE  approval_status = 'pending'
      AND  created_at < v_cutoff
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE agents.team_runs
      SET    approval_status = 'timed_out',
             status          = 'cancelled',
             completed_at    = COALESCE(completed_at, now()),
             metadata        = COALESCE(metadata, '{}'::jsonb)
                                 || jsonb_build_object(
                                      'timed_out_at', now(),
                                      'timeout_hours', v_threshold_hours
                                    ),
             updated_at      = now()
      WHERE  id = r.id;

      IF r.workflow_run_id IS NOT NULL THEN
        UPDATE lenses.workflow_runs
        SET    status        = 'timed_out',
               completed_at  = COALESCE(completed_at, now())
        WHERE  id = r.workflow_run_id
          AND  status NOT IN ('completed', 'cancelled', 'failed', 'timed_out');
      END IF;

      INSERT INTO agents.agent_run_events (team_run_id, event_type, payload, occurred_at)
      VALUES (
        r.id,
        'approval_timed_out',
        jsonb_build_object(
          'timeout_hours',     v_threshold_hours,
          'workflow_run_id',   r.workflow_run_id,
          'expired_at',        now()
        ),
        now()
      );

      v_expired := v_expired + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_expire_stale_approvals: team_run % failed: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_expired;
END;
$$;

ALTER FUNCTION public.fn_expire_stale_approvals() OWNER TO postgres;

COMMENT ON FUNCTION public.fn_expire_stale_approvals() IS
  'Phase K1: pg_cron target. Expires pending team_runs older than '
  'app.approval_timeout_hours (default 24h). Writes approval_status=timed_out, '
  'cancels the underlying workflow_run with status=timed_out, and emits an '
  'approval_timed_out event. Idempotent and concurrency-safe.';

GRANT EXECUTE ON FUNCTION public.fn_expire_stale_approvals() TO service_role;

-- ─── 3. pg_cron registration ─────────────────────────────────────────────────

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; skipping expire-stale-approvals registration';
    RETURN;
  END IF;

  PERFORM cron.unschedule('expire-stale-approvals')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-approvals');

  PERFORM cron.schedule(
    'expire-stale-approvals',
    '*/5 * * * *',
    $$SELECT public.fn_expire_stale_approvals()$$
  );
END;
$do$;
