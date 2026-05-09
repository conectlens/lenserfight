-- Phase U security hardening
--
-- Closes two findings from the Phase U security audit:
--
-- 1. fn_emit_event was granted EXECUTE to `authenticated`. Producer triggers
--    are SECURITY DEFINER and don't need this grant — but exposing the function
--    via PostgREST lets an authenticated user forge events attributed to other
--    lensers (which would fire their trigger rules). Revoking the grant closes
--    the hole without breaking trigger callers.
--
-- 2. trigger_rules.match_filter previously accepted any JSONB shape. Adds a
--    CHECK constraint that all top-level keys are RFC 6901 JSON Pointers — the
--    SQL evaluator already fails closed on bad input, but DB-level validation
--    blocks malformed rules at INSERT time so the dispatcher never sees them.

-- ─── 1. Revoke direct authenticated access to fn_emit_event ─────────────
REVOKE EXECUTE ON FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid)
  FROM authenticated;

COMMENT ON FUNCTION automation.fn_emit_event(text, text, text, uuid, jsonb, uuid) IS
  'Phase U event emitter. SECURITY DEFINER. Callable from producer triggers '
  'only — direct invocation by authenticated users is revoked to prevent '
  'event spoofing (Phase U security hardening, 20270410200000).';

-- ─── 2. JSON-Pointer key shape validation on match_filter ───────────────
-- Each top-level key must be either '' (empty pointer = entire payload) or
-- start with '/' followed by RFC 6901 segments (no unescaped ~ except in ~0/~1).
CREATE OR REPLACE FUNCTION automation.fn_check_filter_keys(p_filter jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_filter IS NULL OR jsonb_typeof(p_filter) <> 'object' THEN
    RETURN p_filter IS NULL OR p_filter = '{}'::jsonb;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_filter)
  LOOP
    -- '' (root) or '/...' with valid RFC 6901 escapes.
    IF v_key = '' THEN
      CONTINUE;
    END IF;
    IF v_key !~ '^(/([^/~]|~[01])*)+$' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

ALTER FUNCTION automation.fn_check_filter_keys(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION automation.fn_check_filter_keys(jsonb) FROM PUBLIC;

ALTER TABLE automation.trigger_rules
  ADD CONSTRAINT trigger_rules_match_filter_keys_valid
  CHECK (automation.fn_check_filter_keys(match_filter));
