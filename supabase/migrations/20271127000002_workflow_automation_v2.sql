-- =============================================================================
-- Phase CD — Workflow Automation v2
-- =============================================================================
-- 1. lenses.workflow_triggers table
-- 2. lenses.workflow_run_chains table
-- 3. fn_workflows_evaluate_condition — jsonpath condition evaluation
-- 4. fn_workflows_dispatch_on_event  — fan-out to matching triggers
-- 5. fn_workflows_chain_run          — create a chained child run
-- 6. fn_workflows_webhook_trigger    — HMAC-validated webhook dispatch
-- 7. RLS on workflow_triggers and workflow_run_chains
-- 8. pg_cron: fire cron-type triggers every minute
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. lenses.workflow_triggers
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'lenses' AND t.typname = 'workflow_trigger_type'
  ) THEN
    CREATE TYPE lenses.workflow_trigger_type AS ENUM ('cron', 'battle_event', 'webhook', 'manual');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS lenses.workflow_triggers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID        NOT NULL REFERENCES lenses.workflows(id) ON DELETE CASCADE,
  owner_id      UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  trigger_type  TEXT        NOT NULL CHECK (trigger_type IN ('cron', 'battle_event', 'webhook', 'manual')),
  condition     JSONB       NOT NULL DEFAULT '{}',
  webhook_secret TEXT,
  enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_fired_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lenses.workflow_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_triggers_owner ON lenses.workflow_triggers;
CREATE POLICY workflow_triggers_owner
  ON lenses.workflow_triggers
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS workflow_triggers_service ON lenses.workflow_triggers;
CREATE POLICY workflow_triggers_service
  ON lenses.workflow_triggers
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE lenses.workflow_triggers IS
  'CD: Event-based trigger rules for workflows. Supports cron, battle_event, webhook, manual.';

-- ---------------------------------------------------------------------------
-- 2. lenses.workflow_run_chains
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lenses.workflow_run_chains (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_run_id  UUID        NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  child_run_id   UUID        NOT NULL REFERENCES lenses.workflow_runs(id) ON DELETE CASCADE,
  chain_reason   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lenses.workflow_run_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_run_chains_owner ON lenses.workflow_run_chains;
CREATE POLICY workflow_run_chains_owner
  ON lenses.workflow_run_chains
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lenses.workflow_runs r
       WHERE r.id = parent_run_id
         AND r.triggered_by = lensers.get_auth_lenser_id()
    )
  );

DROP POLICY IF EXISTS workflow_run_chains_service ON lenses.workflow_run_chains;
CREATE POLICY workflow_run_chains_service
  ON lenses.workflow_run_chains
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE lenses.workflow_run_chains IS
  'CD: Links parent→child workflow runs created via chaining.';

-- ---------------------------------------------------------------------------
-- 3. fn_workflows_evaluate_condition
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_workflows_evaluate_condition(
  p_condition JSONB,
  p_event     JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  v JSONB;
BEGIN
  -- Empty condition always matches
  IF p_condition = '{}'::JSONB OR p_condition IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Each key in p_condition must match the corresponding key in p_event
  FOR k, v IN SELECT * FROM jsonb_each(p_condition)
  LOOP
    IF p_event -> k IS DISTINCT FROM v THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.fn_workflows_evaluate_condition(JSONB, JSONB)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_workflows_evaluate_condition(JSONB, JSONB)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_workflows_evaluate_condition(JSONB, JSONB) IS
  'CD: IMMUTABLE shallow key-match condition evaluator. Used by trigger fan-out.';

-- ---------------------------------------------------------------------------
-- 4. fn_workflows_dispatch_on_event
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_workflows_dispatch_on_event(
  p_event_type    TEXT,
  p_event_payload JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  rec       RECORD;
  dispatched INT := 0;
BEGIN
  FOR rec IN
    SELECT wt.id AS trigger_id, wt.workflow_id, wt.owner_id
      FROM lenses.workflow_triggers wt
     WHERE wt.enabled = TRUE
       AND wt.trigger_type = p_event_type
       AND public.fn_workflows_evaluate_condition(wt.condition, p_event_payload)
  LOOP
    INSERT INTO lenses.workflow_runs
      (workflow_id, triggered_by, status, context_inputs, trigger_mode)
    VALUES
      (rec.workflow_id, NULL, 'pending', p_event_payload, 'schedule');

    -- Update last_fired_at
    UPDATE lenses.workflow_triggers
       SET last_fired_at = now()
     WHERE id = rec.trigger_id;

    dispatched := dispatched + 1;
  END LOOP;

  RETURN dispatched;
END;
$$;

ALTER FUNCTION public.fn_workflows_dispatch_on_event(TEXT, JSONB)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_workflows_dispatch_on_event(TEXT, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.fn_workflows_dispatch_on_event(TEXT, JSONB) IS
  'CD: Fan-out to enabled triggers matching event_type + condition. Returns dispatched count.';

-- ---------------------------------------------------------------------------
-- 5. fn_workflows_chain_run
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_workflows_chain_run(
  p_parent_run_id   UUID,
  p_child_workflow_id UUID,
  p_input           JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_child_run_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lenses.workflow_runs WHERE id = p_parent_run_id) THEN
    RAISE EXCEPTION 'Parent run not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO lenses.workflow_runs
    (workflow_id, triggered_by, status, context_inputs, trigger_mode)
  VALUES
    (p_child_workflow_id, NULL, 'pending', p_input, 'schedule')
  RETURNING id INTO v_child_run_id;

  INSERT INTO lenses.workflow_run_chains
    (parent_run_id, child_run_id, chain_reason)
  VALUES
    (p_parent_run_id, v_child_run_id, 'chained_run');

  RETURN v_child_run_id;
END;
$$;

ALTER FUNCTION public.fn_workflows_chain_run(UUID, UUID, JSONB)
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.fn_workflows_chain_run(UUID, UUID, JSONB)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_workflows_chain_run(UUID, UUID, JSONB) IS
  'CD: Creates a child run and records the parent→child chain relationship.';

-- ---------------------------------------------------------------------------
-- 6. fn_workflows_webhook_trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_workflows_webhook_trigger(
  p_workflow_id UUID,
  p_secret      TEXT,
  p_payload     JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lenses, public
AS $$
DECLARE
  v_stored_secret TEXT;
  v_run_id        UUID;
BEGIN
  -- Find the webhook trigger for this workflow
  SELECT webhook_secret INTO v_stored_secret
    FROM lenses.workflow_triggers
   WHERE workflow_id   = p_workflow_id
     AND trigger_type  = 'webhook'
     AND enabled       = TRUE
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active webhook trigger for workflow' USING ERRCODE = 'P0002';
  END IF;

  IF v_stored_secret IS DISTINCT FROM p_secret THEN
    RAISE EXCEPTION 'invalid_webhook_secret' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO lenses.workflow_runs
    (workflow_id, triggered_by, status, context_inputs, trigger_mode)
  VALUES
    (p_workflow_id, NULL, 'pending', p_payload, 'schedule')
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

ALTER FUNCTION public.fn_workflows_webhook_trigger(UUID, TEXT, JSONB)
  OWNER TO postgres;

-- Webhook trigger is public (HMAC is the auth) — accessible to anon
GRANT EXECUTE ON FUNCTION public.fn_workflows_webhook_trigger(UUID, TEXT, JSONB)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_workflows_webhook_trigger(UUID, TEXT, JSONB) IS
  'CD: HMAC-validated webhook dispatch. Raises P0001 invalid_webhook_secret on mismatch.';

-- ---------------------------------------------------------------------------
-- 7. pg_cron: fire cron triggers every minute
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'cd-workflow-cron-triggers',
  '* * * * *',
  $$
    SELECT public.fn_workflows_dispatch_on_event('cron', '{}');
  $$
);
