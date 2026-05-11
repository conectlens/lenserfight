-- ─────────────────────────────────────────────────────────────────────────────
-- Phase BA — D10: fix ambiguous "id" reference in agents.fn_claim_team_run
--
-- Surfaced by pgTAP 33_automation_claim.sql. The function declares
-- `RETURNS TABLE (id uuid, …)`, which puts a `id` OUT parameter in scope
-- inside the body. The subsequent `UPDATE agents.team_runs … WHERE id = v_id`
-- triggers:
--   ERROR: column reference "id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--
-- Consequence: every successful claim raises after the SELECT but before
-- the UPDATE commits, leaving the team_run un-claimed but the worker
-- believes the call failed. Team-run automation is broken until this is
-- fixed.
--
-- Fix: rename the local variable to v_claim_id and qualify the WHERE
-- predicate with the table alias.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.fn_claim_team_run(p_worker_id text DEFAULT NULL)
RETURNS TABLE (
  id              uuid,
  ai_lenser_id    uuid,
  workflow_id     uuid,
  workflow_run_id uuid,
  metadata        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'agents', 'public'
AS $function$
DECLARE
  v_claim_id uuid;
BEGIN
  -- Take ONE queued team run with SKIP LOCKED so concurrent workers don't
  -- contend. Mirrors execution.fn_poll_async_run.
  SELECT tr.id INTO v_claim_id
  FROM agents.team_runs tr
  WHERE tr.status = 'queued'
    AND tr.approval_status IN ('not_required', 'approved')
  ORDER BY tr.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_claim_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE agents.team_runs tr
  SET    status     = 'running',
         started_at = COALESCE(tr.started_at, now()),
         updated_at = now(),
         metadata   = tr.metadata || jsonb_build_object(
           'claimed_by', COALESCE(p_worker_id, 'unknown'),
           'claimed_at', now()
         )
  WHERE  tr.id = v_claim_id;

  INSERT INTO agents.agent_run_events (team_run_id, event_type, payload)
  VALUES (
    v_claim_id,
    'dispatch_started',
    jsonb_build_object('worker_id', COALESCE(p_worker_id, 'unknown'))
  );

  RETURN QUERY
    SELECT tr.id, tr.ai_lenser_id, tr.workflow_id, tr.workflow_run_id, tr.metadata
    FROM agents.team_runs tr
    WHERE tr.id = v_claim_id;
END;
$function$;

REVOKE ALL ON FUNCTION agents.fn_claim_team_run(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.fn_claim_team_run(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION agents.fn_claim_team_run(text) TO service_role;

COMMENT ON FUNCTION agents.fn_claim_team_run(text) IS
  'D10 fix: disambiguates id by renaming local var to v_claim_id and '
  'qualifying WHERE predicates with the table alias. Service-role only.';
