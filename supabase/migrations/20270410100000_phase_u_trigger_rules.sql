-- Phase U2: Trigger rules + dispatcher
--
-- Reads from automation.events (see 20270410000000_phase_u_event_bus.sql) and
-- routes matched events into one of three actions per the rule's configuration:
--
--   * dispatch_workflow → INSERT a row into lenses.workflow_runs (mirrors the
--     shape used by lenses.fn_dispatch_scheduled_workflows in
--     20260423010000_ai_workspace_panel.sql).
--   * webhook → INSERT a row into audit.webhook_outbox; the existing
--     audit.fn_dispatch_webhook_outbox cron drains it (HMAC-signed delivery,

--     exponential backoff, dead-lettering — defined in
--     20270320000000_phase_p_webhook_outbox.sql).
--   * notify → call public.fn_insert_notification (defined in
--     20270101000000_notification_system_expansion.sql).
--
-- Idempotency: every (event_id, rule_id) pair is enforced by the PRIMARY KEY
-- on automation.event_dispatches. fn_match_rules_for_event uses
-- ON CONFLICT DO NOTHING so concurrent dispatcher invocations cannot
-- double-fire the same action.
--
-- Filter grammar (frozen DSL, v1):
--   match_filter is a JSON object whose keys are RFC-6901 JSON Pointers into
--   the event payload (e.g. "/winner_contender_id", "/status"). Each value is
--   an object { "<op>": <comparand> } where <op> is one of:
--     eq        — strict equality after JSON normalization
--     neq       — negation of eq
--     gt, lt    — numeric comparison; non-numeric operands return false
--     contains  — substring (LIKE) for strings; element-of (?) for arrays
--   The clauses are AND-ed; an empty filter ('{}'::jsonb) or NULL matches all.
--   Path escaping: '~0' → '~', '~1' → '/' (RFC 6901). No array slice / wildcard
--   support; producers should keep payloads shallow.

CREATE SCHEMA IF NOT EXISTS automation;

-- ─── 1. automation.trigger_rules ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation.trigger_rules (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lenser_id         uuid        NOT NULL,
  name              text        NOT NULL,
  match_event_type  text        NOT NULL,
  match_filter      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  action_kind       text        NOT NULL
                                CHECK (action_kind IN ('dispatch_workflow','webhook','notify')),
  action_config     jsonb       NOT NULL,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE automation.trigger_rules OWNER TO postgres;

COMMENT ON TABLE automation.trigger_rules IS
  'Phase U2: lenser-owned trigger rules. Match an automation.events row by '
  'event_type + filter DSL, then dispatch action_kind in (dispatch_workflow, '
  'webhook, notify). Action shape is in action_config; see fn_dispatch_action.';

COMMENT ON COLUMN automation.trigger_rules.match_filter IS
  'Frozen v1 DSL: { "<json-pointer>": { "<op>": <value> } } AND-ed. Ops: eq, '
  'neq, gt, lt, contains. Empty object or NULL matches all events of the '
  'given type.';

COMMENT ON COLUMN automation.trigger_rules.action_config IS
  'Per-kind shape. dispatch_workflow: { workflow_id, context_inputs?, global_model_id? }. '
  'webhook: { url, extra_headers? }. notify: { type?, title, body?, action_url?, metadata? }.';

CREATE INDEX IF NOT EXISTS idx_trigger_rules_lenser_active
  ON automation.trigger_rules (lenser_id, is_active);

CREATE INDEX IF NOT EXISTS idx_trigger_rules_event_type_active
  ON automation.trigger_rules (match_event_type)
  WHERE is_active;

ALTER TABLE automation.trigger_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trigger_rules_owner_select ON automation.trigger_rules;
CREATE POLICY trigger_rules_owner_select
  ON automation.trigger_rules
  FOR SELECT
  TO authenticated
  USING (lenser_id = auth.uid());

DROP POLICY IF EXISTS trigger_rules_owner_insert ON automation.trigger_rules;
CREATE POLICY trigger_rules_owner_insert
  ON automation.trigger_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (lenser_id = auth.uid());

DROP POLICY IF EXISTS trigger_rules_owner_update ON automation.trigger_rules;
CREATE POLICY trigger_rules_owner_update
  ON automation.trigger_rules
  FOR UPDATE
  TO authenticated
  USING (lenser_id = auth.uid())
  WITH CHECK (lenser_id = auth.uid());

DROP POLICY IF EXISTS trigger_rules_owner_delete ON automation.trigger_rules;
CREATE POLICY trigger_rules_owner_delete
  ON automation.trigger_rules
  FOR DELETE
  TO authenticated
  USING (lenser_id = auth.uid());

-- updated_at maintenance
CREATE OR REPLACE FUNCTION automation.trg_trigger_rules_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION automation.trg_trigger_rules_touch_updated_at() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_trigger_rules_touch_updated_at ON automation.trigger_rules;
CREATE TRIGGER trg_trigger_rules_touch_updated_at
  BEFORE UPDATE ON automation.trigger_rules
  FOR EACH ROW
  EXECUTE FUNCTION automation.trg_trigger_rules_touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON automation.trigger_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON automation.trigger_rules TO service_role;

-- ─── 2. automation.event_dispatches ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation.event_dispatches (
  event_id      uuid        NOT NULL REFERENCES automation.events(id)        ON DELETE CASCADE,
  rule_id       uuid        NOT NULL REFERENCES automation.trigger_rules(id) ON DELETE CASCADE,
  status        text        NOT NULL CHECK (status IN ('queued','dispatched','failed','skipped')),
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  error         text        NULL,
  outbox_id     uuid        NULL,
  PRIMARY KEY (event_id, rule_id)
);

ALTER TABLE automation.event_dispatches OWNER TO postgres;

COMMENT ON TABLE automation.event_dispatches IS
  'Phase U2: idempotency ledger. PK (event_id, rule_id) prevents an event '
  'firing the same rule twice. outbox_id is a soft pointer to '
  'audit.webhook_outbox.id when action_kind=webhook; not a real FK so the '
  'audit schema stays decoupled.';

CREATE INDEX IF NOT EXISTS idx_event_dispatches_status
  ON automation.event_dispatches (status, attempted_at);

ALTER TABLE automation.event_dispatches ENABLE ROW LEVEL SECURITY;

-- Authenticated owners may read dispatch rows for rules they own.
DROP POLICY IF EXISTS event_dispatches_owner_select ON automation.event_dispatches;
CREATE POLICY event_dispatches_owner_select
  ON automation.event_dispatches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM automation.trigger_rules tr
      WHERE  tr.id = event_dispatches.rule_id
        AND  tr.lenser_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policy → only service_role + SECURITY DEFINER.

GRANT SELECT ON automation.event_dispatches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON automation.event_dispatches TO service_role;

-- ─── 3. JSON-Pointer + filter evaluator ──────────────────────────────────────
-- Pure SQL evaluator — no PL extension, no untrusted code execution. Empty or
-- NULL filter short-circuits to true.

CREATE OR REPLACE FUNCTION automation.fn_jsonpointer_to_jsonpath(p_pointer text)
RETURNS jsonpath
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_seg     text;
  v_parts   text[];
  v_buf     text := '$';
BEGIN
  -- "" → root.
  IF p_pointer IS NULL OR p_pointer = '' OR p_pointer = '/' THEN
    RETURN '$'::jsonpath;
  END IF;

  -- Strip a leading slash; split the remaining string on '/'.
  v_parts := string_to_array(regexp_replace(p_pointer, '^/', ''), '/');

  FOREACH v_seg IN ARRAY v_parts LOOP
    -- RFC 6901 unescape: '~1' → '/'  then  '~0' → '~'.
    v_seg := replace(replace(v_seg, '~1', '/'), '~0', '~');

    IF v_seg ~ '^[0-9]+$' THEN
      v_buf := v_buf || '[' || v_seg || ']';
    ELSE
      -- Quote keys that aren't bare identifiers; jsonpath grammar allows
      -- $."weird key" form.
      v_buf := v_buf || '."' || replace(v_seg, '"', '\"') || '"';
    END IF;
  END LOOP;

  RETURN v_buf::jsonpath;
END;
$$;

ALTER FUNCTION automation.fn_jsonpointer_to_jsonpath(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_jsonpointer_to_jsonpath(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION automation.fn_jsonpointer_to_jsonpath(text) TO service_role, authenticated;

COMMENT ON FUNCTION automation.fn_jsonpointer_to_jsonpath(text) IS
  'Phase U2: translate an RFC-6901 JSON Pointer (e.g. "/a/b/0") into a jsonpath '
  'value usable by jsonb_path_query_first. Limitations: no slice / wildcard / '
  'predicate support — pointers only. Reserved chars handled per RFC 6901: '
  '~0 → ~, ~1 → /.';

CREATE OR REPLACE FUNCTION automation.fn_eval_filter(
  p_filter  jsonb,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = automation, pg_catalog
AS $$
DECLARE
  v_pointer  text;
  v_clause   jsonb;
  v_op       text;
  v_operand  jsonb;
  v_actual   jsonb;
  v_path     jsonpath;
BEGIN
  IF p_filter IS NULL OR p_filter = '{}'::jsonb THEN
    RETURN true;
  END IF;

  IF p_payload IS NULL THEN
    p_payload := '{}'::jsonb;
  END IF;

  FOR v_pointer, v_clause IN SELECT key, value FROM jsonb_each(p_filter) LOOP
    BEGIN
      v_path := automation.fn_jsonpointer_to_jsonpath(v_pointer);
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;

    v_actual := jsonb_path_query_first(p_payload, v_path);

    -- Each clause must itself be an object with exactly one operator key.
    IF jsonb_typeof(v_clause) <> 'object' THEN
      RETURN false;
    END IF;

    SELECT key, value INTO v_op, v_operand
    FROM   jsonb_each(v_clause)
    LIMIT  1;

    IF v_op = 'eq' THEN
      IF v_actual IS DISTINCT FROM v_operand THEN
        RETURN false;
      END IF;

    ELSIF v_op = 'neq' THEN
      IF v_actual IS NOT DISTINCT FROM v_operand THEN
        RETURN false;
      END IF;

    ELSIF v_op = 'gt' THEN
      IF v_actual IS NULL
         OR jsonb_typeof(v_actual)  <> 'number'
         OR jsonb_typeof(v_operand) <> 'number' THEN
        RETURN false;
      END IF;
      IF NOT ((v_actual)::text::numeric > (v_operand)::text::numeric) THEN
        RETURN false;
      END IF;

    ELSIF v_op = 'lt' THEN
      IF v_actual IS NULL
         OR jsonb_typeof(v_actual)  <> 'number'
         OR jsonb_typeof(v_operand) <> 'number' THEN
        RETURN false;
      END IF;
      IF NOT ((v_actual)::text::numeric < (v_operand)::text::numeric) THEN
        RETURN false;
      END IF;

    ELSIF v_op = 'contains' THEN
      IF v_actual IS NULL THEN
        RETURN false;
      END IF;

      IF jsonb_typeof(v_actual) = 'string' AND jsonb_typeof(v_operand) = 'string' THEN
        IF position(
             (v_operand #>> '{}') IN (v_actual #>> '{}')
           ) = 0 THEN
          RETURN false;
        END IF;

      ELSIF jsonb_typeof(v_actual) = 'array' THEN
        IF NOT (v_actual @> jsonb_build_array(v_operand)) THEN
          RETURN false;
        END IF;

      ELSE
        RETURN false;
      END IF;

    ELSE
      -- Unknown operator → conservative reject.
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

ALTER FUNCTION automation.fn_eval_filter(jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_eval_filter(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION automation.fn_eval_filter(jsonb, jsonb) TO service_role, authenticated;

COMMENT ON FUNCTION automation.fn_eval_filter(jsonb, jsonb) IS
  'Phase U2: evaluator for the trigger-rule filter DSL v1. AND-of-clauses; '
  'unknown ops fail closed. See 20270410100000_phase_u_trigger_rules.sql header '
  'for the grammar.';

-- ─── 4. fn_match_rules_for_event ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION automation.fn_match_rules_for_event(p_event_id uuid)
RETURNS TABLE (rule_id uuid, action_kind text, action_config jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_event automation.events%ROWTYPE;
BEGIN
  SELECT * INTO v_event FROM automation.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Insert dispatch ledger rows for matching rules (idempotent).
  -- A rule matches when:
  --   match_event_type = event.event_type
  --   AND is_active
  --   AND ( source_lenser_id IS NULL  -- system-level event, owner-scoping skipped
  --         OR rule.lenser_id = source_lenser_id )
  --   AND fn_eval_filter(match_filter, payload)
  INSERT INTO automation.event_dispatches (event_id, rule_id, status)
  SELECT v_event.id, tr.id, 'queued'
  FROM   automation.trigger_rules tr
  WHERE  tr.is_active
    AND  tr.match_event_type = v_event.event_type
    AND  (v_event.source_lenser_id IS NULL OR tr.lenser_id = v_event.source_lenser_id)
    AND  automation.fn_eval_filter(tr.match_filter, v_event.payload)
  ON CONFLICT (event_id, rule_id) DO NOTHING;

  RETURN QUERY
  SELECT tr.id, tr.action_kind, tr.action_config
  FROM   automation.trigger_rules tr
  JOIN   automation.event_dispatches ed
         ON ed.rule_id  = tr.id
        AND ed.event_id = v_event.id
  WHERE  ed.status = 'queued';
END;
$$;

ALTER FUNCTION automation.fn_match_rules_for_event(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_match_rules_for_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION automation.fn_match_rules_for_event(uuid) TO service_role;

COMMENT ON FUNCTION automation.fn_match_rules_for_event(uuid) IS
  'Phase U2: match active rules for the given event, insert (event_id, rule_id, '
  'status=queued) rows ON CONFLICT DO NOTHING for idempotency, and return the '
  'newly-queued matches. Rules with NULL source_lenser_id on the event are '
  'matched without ownership filtering (system events).';

-- ─── 5. fn_create_automation_notification (thin RPC for notify action) ───────

CREATE OR REPLACE FUNCTION public.fn_create_automation_notification(
  p_lenser_id uuid,
  p_title     text,
  p_body      text,
  p_payload   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN public.fn_insert_notification(
    p_lenser_id,
    'automation_action',
    p_title,
    p_body,
    NULL,
    COALESCE(p_payload, '{}'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.fn_create_automation_notification(uuid, text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_create_automation_notification(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_automation_notification(uuid, text, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.fn_create_automation_notification(uuid, text, text, jsonb) IS
  'Phase U2: thin wrapper around public.fn_insert_notification used by '
  'automation.fn_dispatch_action when action_kind=notify. Type is fixed to '
  '"automation_action" so users can filter automation-driven entries from '
  'human-driven ones in their feed.';

-- ─── 6. fn_dispatch_action ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION automation.fn_dispatch_action(
  p_event_id uuid,
  p_rule_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, lenses, audit, public, pg_catalog
AS $$
DECLARE
  v_event   automation.events%ROWTYPE;
  v_rule    automation.trigger_rules%ROWTYPE;
  v_run_id  uuid;
  v_outbox_id uuid;
  v_url     text;
  v_payload jsonb;
  v_title   text;
  v_body    text;
BEGIN
  SELECT * INTO v_event FROM automation.events        WHERE id = p_event_id;
  IF NOT FOUND THEN
    UPDATE automation.event_dispatches
    SET    status = 'skipped', error = 'event_not_found', attempted_at = now()
    WHERE  event_id = p_event_id AND rule_id = p_rule_id;
    RETURN;
  END IF;

  SELECT * INTO v_rule  FROM automation.trigger_rules WHERE id = p_rule_id;
  IF NOT FOUND OR NOT v_rule.is_active THEN
    UPDATE automation.event_dispatches
    SET    status = 'skipped', error = 'rule_inactive_or_missing', attempted_at = now()
    WHERE  event_id = p_event_id AND rule_id = p_rule_id;
    RETURN;
  END IF;

  BEGIN
    IF v_rule.action_kind = 'dispatch_workflow' THEN
      INSERT INTO lenses.workflow_runs (
        workflow_id,
        triggered_by,
        status,
        context_inputs,
        global_model_id,
        trigger_mode,
        metadata
      ) VALUES (
        (v_rule.action_config->>'workflow_id')::uuid,
        v_rule.lenser_id,
        'pending',
        COALESCE(v_rule.action_config->'context_inputs', '{}'::jsonb),
        NULLIF(v_rule.action_config->>'global_model_id', ''),
        'manual',
        jsonb_build_object(
          'origin',          'automation',
          'trigger_rule_id', v_rule.id,
          'event_id',        v_event.id,
          'event_type',      v_event.event_type
        )
      )
      RETURNING id INTO v_run_id;

      INSERT INTO lenses.workflow_node_results (run_id, node_id, status)
      SELECT v_run_id, n.id, 'pending'
      FROM   lenses.workflow_nodes n
      WHERE  n.workflow_id = (v_rule.action_config->>'workflow_id')::uuid;

      UPDATE automation.event_dispatches
      SET    status = 'dispatched', error = NULL, attempted_at = now()
      WHERE  event_id = p_event_id AND rule_id = p_rule_id;

    ELSIF v_rule.action_kind = 'webhook' THEN
      v_url := v_rule.action_config->>'url';
      IF v_url IS NULL OR v_url = '' THEN
        UPDATE automation.event_dispatches
        SET    status = 'failed', error = 'webhook_url_missing', attempted_at = now()
        WHERE  event_id = p_event_id AND rule_id = p_rule_id;
        RETURN;
      END IF;

      v_payload := jsonb_build_object(
        'webhook_version', 1,
        'event_type',      v_event.event_type,
        'event_id',        v_event.id,
        'rule_id',         v_rule.id,
        'occurred_at',     v_event.occurred_at,
        'payload',         v_event.payload
      );

      INSERT INTO audit.webhook_outbox (event_type, payload, target_url)
      VALUES ('automation.' || v_event.event_type, v_payload, v_url)
      RETURNING id INTO v_outbox_id;

      UPDATE automation.event_dispatches
      SET    status     = 'dispatched',
             error      = NULL,
             outbox_id  = v_outbox_id,
             attempted_at = now()
      WHERE  event_id = p_event_id AND rule_id = p_rule_id;

    ELSIF v_rule.action_kind = 'notify' THEN
      v_title := COALESCE(v_rule.action_config->>'title',
                          'Automation: ' || v_event.event_type);
      v_body  := v_rule.action_config->>'body';

      PERFORM public.fn_create_automation_notification(
        v_rule.lenser_id,
        v_title,
        v_body,
        jsonb_build_object(
          'event_type',      v_event.event_type,
          'event_id',        v_event.id,
          'trigger_rule_id', v_rule.id,
          'source_id',       v_event.source_id,
          'template',        v_rule.action_config->>'template'
        )
      );

      UPDATE automation.event_dispatches
      SET    status = 'dispatched', error = NULL, attempted_at = now()
      WHERE  event_id = p_event_id AND rule_id = p_rule_id;

    ELSE
      UPDATE automation.event_dispatches
      SET    status = 'failed',
             error  = 'unknown_action_kind:' || v_rule.action_kind,
             attempted_at = now()
      WHERE  event_id = p_event_id AND rule_id = p_rule_id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    UPDATE automation.event_dispatches
    SET    status = 'failed',
           error  = left(SQLERRM, 1000),
           attempted_at = now()
    WHERE  event_id = p_event_id AND rule_id = p_rule_id;
  END;
END;
$$;

ALTER FUNCTION automation.fn_dispatch_action(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_dispatch_action(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION automation.fn_dispatch_action(uuid, uuid) TO service_role;

COMMENT ON FUNCTION automation.fn_dispatch_action(uuid, uuid) IS
  'Phase U2: execute the action for one (event, rule) pair. Wraps the entire '
  'side-effect in BEGIN...EXCEPTION so a failed action marks the dispatch row '
  'failed instead of bubbling up and aborting fn_run_dispatcher''s batch loop.';

-- ─── 7. fn_run_dispatcher ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION automation.fn_run_dispatcher(p_limit int DEFAULT 100)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = automation, public, pg_catalog
AS $$
DECLARE
  v_event_id uuid;
  v_match    record;
  v_actions  int := 0;
BEGIN
  -- Phase 1: events that haven't been routed yet (no dispatch rows at all).
  FOR v_event_id IN
    SELECT e.id
    FROM   automation.events e
    WHERE  NOT EXISTS (
             SELECT 1 FROM automation.event_dispatches ed WHERE ed.event_id = e.id
           )
      AND  EXISTS (
             SELECT 1 FROM automation.trigger_rules tr
             WHERE  tr.is_active
               AND  tr.match_event_type = e.event_type
           )
    ORDER BY e.recorded_at ASC
    LIMIT  p_limit
    FOR UPDATE OF e SKIP LOCKED
  LOOP
    FOR v_match IN
      SELECT rule_id FROM automation.fn_match_rules_for_event(v_event_id)
    LOOP
      PERFORM automation.fn_dispatch_action(v_event_id, v_match.rule_id);
      v_actions := v_actions + 1;
    END LOOP;
  END LOOP;

  -- Phase 2: re-drive dispatch rows that are still in 'queued' state (e.g. the
  -- previous tick crashed between INSERT-queued and dispatch_action).
  FOR v_match IN
    SELECT event_id, rule_id
    FROM   automation.event_dispatches
    WHERE  status = 'queued'
    ORDER  BY attempted_at ASC
    LIMIT  p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM automation.fn_dispatch_action(v_match.event_id, v_match.rule_id);
    v_actions := v_actions + 1;
  END LOOP;

  RETURN v_actions;
END;
$$;

ALTER FUNCTION automation.fn_run_dispatcher(int) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_run_dispatcher(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION automation.fn_run_dispatcher(int) TO service_role;

COMMENT ON FUNCTION automation.fn_run_dispatcher(int) IS
  'Phase U2: dispatcher entrypoint. Two phases: (1) match new events with '
  'active rules, (2) re-drive any dispatch rows still in queued state. '
  'Returns number of dispatch_action invocations. Cron job '
  'automation-dispatcher runs this once per minute.';

-- ─── 8. pg_cron registration ─────────────────────────────────────────────────
-- pg_cron expressions don't support sub-minute scheduling. p99 dispatch
-- latency is therefore ≤ 60s. Sub-second latency would require a NOTIFY-driven
-- push-mode dispatcher; out of scope for U2.

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; skipping automation-dispatcher registration';
    RETURN;
  END IF;

  PERFORM cron.unschedule('automation-dispatcher')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-dispatcher');

  PERFORM cron.schedule(
    'automation-dispatcher',
    '* * * * *',
    $$SELECT automation.fn_run_dispatcher(100)$$
  );
END;
$do$;
