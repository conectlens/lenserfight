-- =============================================================================
-- 20260417180000_workflow_run_events_sse.sql
-- -----------------------------------------------------------------------------
-- Adds append-only workflow run events to support rich SSE streaming with:
--   * per-run monotonic event_id
--   * replay since last seen event id
--   * owner/public visibility checks aligned with workflow run access rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS lenses.workflow_run_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  event_id     bigint NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_run_events_type_non_empty CHECK (length(trim(type)) > 0),
  CONSTRAINT workflow_run_events_run_event_unique UNIQUE (run_id, event_id)
);

COMMENT ON TABLE lenses.workflow_run_events IS
  'Append-only workflow timeline events used by SSE streaming and replay. event_id is monotonic per run_id.';

CREATE INDEX IF NOT EXISTS idx_workflow_run_events_run_event
  ON lenses.workflow_run_events (run_id, event_id);

CREATE INDEX IF NOT EXISTS idx_workflow_run_events_created
  ON lenses.workflow_run_events (created_at DESC);

ALTER TABLE lenses.workflow_run_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_run_events_service_all ON lenses.workflow_run_events;
CREATE POLICY workflow_run_events_service_all
  ON lenses.workflow_run_events
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS workflow_run_events_select ON lenses.workflow_run_events;
CREATE POLICY workflow_run_events_select
  ON lenses.workflow_run_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM lenses.workflow_runs r
      JOIN lenses.workflows w ON w.id = r.workflow_id
      WHERE r.id = workflow_run_events.run_id
        AND (
          r.triggered_by = lensers.get_auth_lenser_id()
          OR w.visibility::text = 'public'
        )
    )
  );

GRANT SELECT ON lenses.workflow_run_events TO authenticated, anon;
GRANT ALL ON lenses.workflow_run_events TO service_role;

CREATE OR REPLACE FUNCTION public.fn_append_workflow_run_event(
  p_run_id uuid,
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(event_id bigint, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
DECLARE
  v_caller_id uuid := lensers.get_auth_lenser_id();
  v_next_id bigint;
  v_created_at timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lenses.workflow_runs r
    WHERE r.id = p_run_id
      AND r.triggered_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'workflow_run % not found or not owned by caller', p_run_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Serialize per-run event id allocation.
  PERFORM pg_advisory_xact_lock(hashtext(p_run_id::text));

  SELECT COALESCE(MAX(e.event_id), 0) + 1
    INTO v_next_id
  FROM lenses.workflow_run_events e
  WHERE e.run_id = p_run_id;

  INSERT INTO lenses.workflow_run_events (run_id, event_id, type, payload)
  VALUES (p_run_id, v_next_id, p_type, COALESCE(p_payload, '{}'::jsonb))
  RETURNING workflow_run_events.created_at INTO v_created_at;

  RETURN QUERY SELECT v_next_id, v_created_at;
END;
$$;

ALTER FUNCTION public.fn_append_workflow_run_event(uuid, text, jsonb) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_append_workflow_run_event(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_append_workflow_run_event(uuid, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.fn_append_workflow_run_event(uuid, text, jsonb) IS
  'Appends a workflow run event with monotonic per-run event_id. Owner-gated.';

CREATE OR REPLACE FUNCTION public.fn_list_workflow_run_events(
  p_run_id uuid,
  p_after_event_id bigint DEFAULT 0,
  p_limit integer DEFAULT 200
) RETURNS TABLE(
  event_id bigint,
  type text,
  run_id uuid,
  occurred_at timestamptz,
  payload jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'lenses', 'lensers'
AS $$
  SELECT
    e.event_id,
    e.type,
    e.run_id,
    e.created_at AS occurred_at,
    e.payload
  FROM lenses.workflow_run_events e
  JOIN lenses.workflow_runs r ON r.id = e.run_id
  JOIN lenses.workflows w ON w.id = r.workflow_id
  WHERE e.run_id = p_run_id
    AND e.event_id > COALESCE(p_after_event_id, 0)
    AND (
      r.triggered_by = lensers.get_auth_lenser_id()
      OR w.visibility::text = 'public'
    )
  ORDER BY e.event_id ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
$$;

ALTER FUNCTION public.fn_list_workflow_run_events(uuid, bigint, integer) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_run_events(uuid, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_workflow_run_events(uuid, bigint, integer) TO service_role;

COMMENT ON FUNCTION public.fn_list_workflow_run_events(uuid, bigint, integer) IS
  'Lists workflow run events after p_after_event_id for SSE replay/catch-up.';
