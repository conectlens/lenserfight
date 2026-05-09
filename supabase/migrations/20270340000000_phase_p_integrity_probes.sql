-- Phase P automation — integrity probe RPCs
--
-- Three SECURITY DEFINER RPCs the staging integrity script invokes to
-- generate evidence for the Phase O staging gate. Each is service-role-only
-- and namespaced with __integrity_probe_ row prefixes so it cannot leak into
-- production-shaped audit data.
--
-- These RPCs are SAFE TO RUN against staging only. They are GRANTed to
-- service_role exclusively; authenticated callers cannot reach them.

-- ─── J2 probe — moderation override audit row ────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_integrity_probe_moderation_override(
  p_target_entity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_decision_id uuid;
  v_audit_row_present boolean;
BEGIN
  -- Insert a synthetic flagged decision (AI-moderated, no human moderator).
  INSERT INTO audit.moderation_decisions
    (target_entity_schema, target_entity_table, target_entity_id,
     decision_type, reason, is_ai_moderated, ai_confidence)
  VALUES
    ('battles', 'battles', p_target_entity_id,
     'flagged', '__integrity_probe_synthetic_flag', true, 0.95)
  RETURNING id INTO v_decision_id;

  -- Verify the row landed.
  SELECT EXISTS (
    SELECT 1 FROM audit.moderation_decisions
    WHERE id = v_decision_id AND decision_type = 'flagged'
  ) INTO v_audit_row_present;

  -- Cleanup so probe rows don't accumulate.
  DELETE FROM audit.moderation_decisions WHERE id = v_decision_id;

  RETURN jsonb_build_object(
    'decision_id', v_decision_id,
    'audit_row_present', v_audit_row_present,
    'cleaned_up', true
  );
END;
$$;

ALTER FUNCTION public.fn_integrity_probe_moderation_override(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_integrity_probe_moderation_override(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_integrity_probe_moderation_override(uuid) TO service_role;
COMMENT ON FUNCTION public.fn_integrity_probe_moderation_override(uuid) IS
  'Phase P automation. Inserts a synthetic flagged moderation_decisions row, '
  'verifies it landed, then cleans up. service_role only.';

-- ─── O1 probe — moderation webhook end-to-end ────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_integrity_probe_moderation_webhook(
  p_target_url text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_probe_id text := '__integrity_probe_' || gen_random_uuid()::text;
  v_decision_id uuid;
  v_outbox_id uuid;
  v_prior_url text := current_setting('app.moderation_webhook_url', true);
BEGIN
  -- Temporarily point the webhook URL at the listener.
  PERFORM set_config('app.moderation_webhook_url', p_target_url, true);

  -- Insert a flagged decision; the AFTER INSERT trigger enqueues into outbox.
  INSERT INTO audit.moderation_decisions
    (target_entity_schema, target_entity_table, target_entity_id,
     decision_type, reason, is_ai_moderated, ai_confidence)
  VALUES
    ('battles', 'battles', gen_random_uuid(),
     'flagged', v_probe_id, true, 0.99)
  RETURNING id INTO v_decision_id;

  -- Restore prior URL setting for the rest of the session.
  PERFORM set_config('app.moderation_webhook_url', COALESCE(v_prior_url, ''), true);

  -- Force-run the dispatcher so the listener gets the POST without waiting
  -- for the cron tick. dispatch_webhook_outbox is idempotent.
  PERFORM audit.fn_dispatch_webhook_outbox(50);

  -- Cleanup the synthetic decision.
  DELETE FROM audit.moderation_decisions WHERE id = v_decision_id;

  RETURN jsonb_build_object(
    'probe_id', v_probe_id,
    'decision_id', v_decision_id,
    'enqueued', true
  );
END;
$$;

ALTER FUNCTION public.fn_integrity_probe_moderation_webhook(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_integrity_probe_moderation_webhook(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_integrity_probe_moderation_webhook(text) TO service_role;
COMMENT ON FUNCTION public.fn_integrity_probe_moderation_webhook(text) IS
  'Phase P automation. Inserts a synthetic flagged decision with the listener URL '
  'set transiently, force-dispatches the outbox, cleans up. service_role only.';

-- ─── O3 probe — ELO log shape ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_integrity_probe_elo_log()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, reputation, pg_catalog
AS $$
DECLARE
  v_table_exists boolean;
  v_has_pk_on_battle_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'reputation' AND c.relname = 'elo_battle_log'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (con.conkey)
    WHERE n.nspname = 'reputation'
      AND c.relname = 'elo_battle_log'
      AND con.contype = 'p'
      AND a.attname = 'battle_id'
  ) INTO v_has_pk_on_battle_id;

  RETURN jsonb_build_object(
    'table_exists', v_table_exists,
    'has_pk_on_battle_id', v_has_pk_on_battle_id
  );
END;
$$;

ALTER FUNCTION public.fn_integrity_probe_elo_log() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_integrity_probe_elo_log() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_integrity_probe_elo_log() TO service_role;
COMMENT ON FUNCTION public.fn_integrity_probe_elo_log() IS
  'Phase P automation. Reflects the existence + PK shape of '
  'reputation.elo_battle_log so the staging integrity script can verify '
  'idempotency infrastructure. service_role only.';
