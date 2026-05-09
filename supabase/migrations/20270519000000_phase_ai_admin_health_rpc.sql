-- Phase AI: fn_admin_health
-- Service-role-only RPC exposing pg_cron job registry and most-recent run timestamps.
-- Used by tools/health-cron.mjs for pre-launch gate checking.
CREATE OR REPLACE FUNCTION public.fn_admin_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cron, public
AS $$
DECLARE
  v_crons jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'name',      j.jobname,
    'schedule',  j.schedule,
    'active',    j.active,
    'last_run',  (
      SELECT start_time
      FROM   cron.job_run_details d
      WHERE  d.jobid = j.jobid
      ORDER  BY start_time DESC
      LIMIT  1
    )
  ))
  INTO v_crons
  FROM cron.job j;

  RETURN jsonb_build_object('crons', COALESCE(v_crons, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_health() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_admin_health() TO service_role;

COMMENT ON FUNCTION public.fn_admin_health() IS
  'Phase AI: returns pg_cron job list with last-run timestamps. '
  'Restricted to service_role. Used by health:cron gate script.';
