-- Phase Q1: Schedule backfill RPC
--
-- Lets a workflow owner replay missed schedule ticks within a bounded window.
-- The function enumerates expected cron ticks between p_since and now(),
-- skips ticks that already produced a run (deduped by metadata.backfill_id),
-- and inserts pending workflow_runs the existing recovery sweeper will pick
-- up. Direct team_runs creation is NOT performed here — that is owned by
-- lenses.fn_dispatch_scheduled_workflows / the worker pipeline. Backfilled
-- runs flow through the same dispatcher path the next minute.
--
-- Cron parsing
--   Supported expressions (reflects current runtime parser):
--     * * * * *        -> every minute
--     */N * * * *      -> every N minutes
--     0 H * * *        -> daily at hour H (UTC)
--     0 H * * DOW      -> weekly at hour H on day-of-week DOW (0..6, Sun=0)
--   Anything else raises a clear exception so callers can fall back to
--   manual dispatch.
--
-- Authorization
--   * Caller must own the workflow that the schedule belongs to
--     (lenses.workflows.lenser_id = lensers.get_auth_lenser_id()).
--   * SECURITY DEFINER so the inserts pass RLS even though
--     lenses.workflow_runs is owner-restricted.
--
-- Output (jsonb)
--   dry_run = true:  { "would_dispatch": <int>, "ticks": [<iso>...] }
--   dry_run = false: { "dispatched": <int>, "skipped_existing": <int> }

-- ─── 1. metadata column on workflow_runs (used for backfill_id) ─────────────

ALTER TABLE lenses.workflow_runs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_backfill_id
  ON lenses.workflow_runs ((metadata->>'backfill_id'))
  WHERE metadata ? 'backfill_id';

COMMENT ON COLUMN lenses.workflow_runs.metadata IS
  'Free-form per-run metadata. Reserved keys: backfill_id (for Phase Q1 '
  'replay dedup) and origin (e.g. ''backfill'', ''manual'').';

-- ─── 2. fn_backfill_schedule ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_backfill_schedule(
  p_schedule_id uuid,
  p_since       timestamptz,
  p_dry_run     boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lenses, agents
AS $$
DECLARE
  v_caller          uuid := lensers.get_auth_lenser_id();
  v_schedule        record;
  v_parts           text[];
  v_minute          text;
  v_hour            text;
  v_dom             text;
  v_mon             text;
  v_dow             text;
  v_step_minutes    int;
  v_target_hour     int;
  v_target_dow      int;
  v_tick            timestamptz;
  v_dispatched      int := 0;
  v_skipped         int := 0;
  v_ticks           jsonb := '[]'::jsonb;
  v_backfill_key    text;
  v_run_id          uuid;
  v_now             timestamptz := date_trunc('minute', now());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_since IS NULL OR p_since >= now() THEN
    RAISE EXCEPTION 'p_since must be in the past' USING ERRCODE = '22023';
  END IF;

  -- Cap window at 30 days to bound cost.
  IF p_since < now() - interval '30 days' THEN
    RAISE EXCEPTION 'p_since exceeds 30-day backfill window' USING ERRCODE = '22023';
  END IF;

  SELECT s.id,
         s.workflow_id,
         s.cron_expr,
         s.inputs_template,
         s.global_model_id,
         w.lenser_id   AS owner_id
  INTO   v_schedule
  FROM   lenses.workflow_schedules s
  JOIN   lenses.workflows w ON w.id = s.workflow_id
  WHERE  s.id = p_schedule_id;

  IF v_schedule.id IS NULL THEN
    RAISE EXCEPTION 'schedule_not_found: %', p_schedule_id USING ERRCODE = 'P0002';
  END IF;

  IF v_schedule.owner_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'not_workflow_owner' USING ERRCODE = '42501';
  END IF;

  -- ── Parse the cron expression ──────────────────────────────────────────
  v_parts := regexp_split_to_array(trim(v_schedule.cron_expr), '\s+');
  IF array_length(v_parts, 1) <> 5 THEN
    RAISE EXCEPTION
      'unsupported_cron_expression: % (expected 5 fields)',
      v_schedule.cron_expr
      USING ERRCODE = '22023';
  END IF;

  v_minute := v_parts[1];
  v_hour   := v_parts[2];
  v_dom    := v_parts[3];
  v_mon    := v_parts[4];
  v_dow    := v_parts[5];

  -- Build the tick stream. Truncate p_since to minute precision.
  IF v_minute = '*' AND v_hour = '*' AND v_dom = '*' AND v_mon = '*' AND v_dow = '*' THEN
    -- every minute
    FOR v_tick IN
      SELECT g
      FROM generate_series(date_trunc('minute', p_since), v_now, interval '1 minute') g
    LOOP
      v_ticks := v_ticks || to_jsonb(v_tick);
    END LOOP;

  ELSIF v_minute LIKE '*/%' AND v_hour = '*' AND v_dom = '*' AND v_mon = '*' AND v_dow = '*' THEN
    -- every N minutes
    BEGIN
      v_step_minutes := substr(v_minute, 3)::int;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'unsupported_cron_expression: %', v_schedule.cron_expr USING ERRCODE = '22023';
    END;

    IF v_step_minutes <= 0 OR v_step_minutes > 59 THEN
      RAISE EXCEPTION 'unsupported_cron_expression: %', v_schedule.cron_expr USING ERRCODE = '22023';
    END IF;

    FOR v_tick IN
      SELECT g
      FROM generate_series(date_trunc('hour', p_since), v_now, (v_step_minutes::text || ' minutes')::interval) g
      WHERE g >= p_since
    LOOP
      v_ticks := v_ticks || to_jsonb(v_tick);
    END LOOP;

  ELSIF v_minute = '0' AND v_dom = '*' AND v_mon = '*' AND v_dow = '*'
        AND v_hour ~ '^[0-9]+$' THEN
    -- 0 H * * *  (daily at hour H, UTC)
    v_target_hour := v_hour::int;
    IF v_target_hour < 0 OR v_target_hour > 23 THEN
      RAISE EXCEPTION 'unsupported_cron_expression: %', v_schedule.cron_expr USING ERRCODE = '22023';
    END IF;

    FOR v_tick IN
      SELECT g
      FROM generate_series(
        date_trunc('day', p_since AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          + (v_target_hour::text || ' hours')::interval,
        v_now,
        interval '1 day'
      ) g
      WHERE g >= p_since AND g <= v_now
    LOOP
      v_ticks := v_ticks || to_jsonb(v_tick);
    END LOOP;

  ELSIF v_minute = '0' AND v_dom = '*' AND v_mon = '*'
        AND v_hour ~ '^[0-9]+$' AND v_dow ~ '^[0-6]$' THEN
    -- 0 H * * DOW  (weekly, hour H, day-of-week DOW; 0=Sun)
    v_target_hour := v_hour::int;
    v_target_dow  := v_dow::int;
    IF v_target_hour < 0 OR v_target_hour > 23 THEN
      RAISE EXCEPTION 'unsupported_cron_expression: %', v_schedule.cron_expr USING ERRCODE = '22023';
    END IF;

    FOR v_tick IN
      SELECT g
      FROM generate_series(
        date_trunc('day', p_since AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          + (v_target_hour::text || ' hours')::interval,
        v_now,
        interval '1 day'
      ) g
      WHERE g >= p_since AND g <= v_now
        AND extract(dow from g)::int = v_target_dow
    LOOP
      v_ticks := v_ticks || to_jsonb(v_tick);
    END LOOP;

  ELSE
    RAISE EXCEPTION
      'unsupported_cron_expression: % (supported: ''*/N * * * *'', ''0 H * * *'', ''0 H * * DOW'')',
      v_schedule.cron_expr
      USING ERRCODE = '22023';
  END IF;

  -- ── Dry-run path ───────────────────────────────────────────────────────
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'would_dispatch', jsonb_array_length(v_ticks),
      'ticks',          v_ticks
    );
  END IF;

  -- ── Execute path ───────────────────────────────────────────────────────
  FOR v_tick IN
    SELECT (value::text)::timestamptz FROM jsonb_array_elements_text(v_ticks)
  LOOP
    v_backfill_key := p_schedule_id::text || ':' ||
                      to_char(v_tick AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

    -- Skip if a run for this exact slot already exists (either via
    -- backfill_id metadata key or via the existing schedule_id+scheduled_for
    -- unique slot index).
    IF EXISTS (
      SELECT 1 FROM lenses.workflow_runs
      WHERE metadata->>'backfill_id' = v_backfill_key
    ) OR EXISTS (
      SELECT 1 FROM lenses.workflow_runs
      WHERE schedule_id = p_schedule_id
        AND scheduled_for = v_tick
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO lenses.workflow_runs (
      workflow_id,
      triggered_by,
      status,
      context_inputs,
      global_model_id,
      schedule_id,
      scheduled_for,
      trigger_mode,
      metadata
    ) VALUES (
      v_schedule.workflow_id,
      v_caller,
      'pending',
      COALESCE(v_schedule.inputs_template, '{}'::jsonb),
      v_schedule.global_model_id,
      p_schedule_id,
      v_tick,
      'schedule',
      jsonb_build_object('backfill_id', v_backfill_key, 'origin', 'backfill')
    )
    RETURNING id INTO v_run_id;

    -- Materialise node placeholders so the worker can pick this run up.
    INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
    SELECT v_run_id, n.id, 'pending'
    FROM   lenses.workflow_nodes n
    WHERE  n.workflow_id = v_schedule.workflow_id;

    v_dispatched := v_dispatched + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'dispatched',       v_dispatched,
    'skipped_existing', v_skipped
  );
END;
$$;

ALTER FUNCTION public.fn_backfill_schedule(uuid, timestamptz, boolean) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_backfill_schedule(uuid, timestamptz, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.fn_backfill_schedule(uuid, timestamptz, boolean) IS
  'Phase Q1: enumerates missed cron ticks between p_since and now() for a '
  'workflow schedule the caller owns and inserts pending workflow_runs the '
  'recovery sweeper will pick up. Supports * * * * *, */N * * * *, 0 H * * *, '
  '0 H * * DOW. Dedupes via metadata.backfill_id and (schedule_id, '
  'scheduled_for). Returns jsonb with dispatched/skipped or would_dispatch/ticks.';
